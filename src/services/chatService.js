const OpenAI = require("openai");

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9_/.-]+/)
    .filter((token) => token.length > 2);
}

function retrieveRelevantDocuments(analysis, question, limit = 4) {
  const questionTokens = tokenize(question);

  return (analysis.searchIndex || [])
    .map((document) => {
      const haystack = tokenize(
        `${document.path} ${document.module} ${document.language} ${document.role} ${document.content}`
      );
      const haystackSet = new Set(haystack);
      const score = questionTokens.reduce((total, token) => {
        if (haystackSet.has(token)) {
          return total + 3;
        }

        if (document.path.toLowerCase().includes(token)) {
          return total + 4;
        }

        return total;
      }, 0);

      return {
        ...document,
        score
      };
    })
    .filter((document) => document.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit);
}

function buildFallbackAnswer(analysis, question, matches) {
  if (!matches.length) {
    return {
      answer:
        `I could not find a strong local match for "${question}". Try asking about a module, file path, dependency, or entrypoint.`,
      citations: []
    };
  }

  const moduleNames = [...new Set(matches.map((match) => match.module))].join(", ");
  const fileList = matches.map((match) => match.path).join(", ");

  return {
    answer:
      `Based on the indexed code snippets, the question "${question}" most closely matches ` +
      `the ${moduleNames} area. Review these files first: ${fileList}.`,
    citations: matches.map((match) => ({
      path: match.path,
      module: match.module
    }))
  };
}

async function answerQuestion(analysis, question) {
  const matches = retrieveRelevantDocuments(analysis, question);

  if (!process.env.OPENAI_API_KEY) {
    return {
      ...buildFallbackAnswer(analysis, question, matches),
      aiStatus: "fallback"
    };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const promptPayload = {
    question,
    summary: analysis.summary,
    modules: analysis.modules.slice(0, 10),
    matches: matches.map((match) => ({
      path: match.path,
      module: match.module,
      role: match.role,
      snippet: match.content.slice(0, 1200)
    }))
  };

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Answer codebase questions using only the provided analysis context. " +
                "Be concise and mention file paths when possible."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(promptPayload, null, 2)
            }
          ]
        }
      ]
    });

    return {
      answer: response.output_text || "No answer returned.",
      citations: matches.map((match) => ({
        path: match.path,
        module: match.module
      })),
      aiStatus: "live"
    };
  } catch {
    return {
      ...buildFallbackAnswer(analysis, question, matches),
      aiStatus: "fallback"
    };
  }
}

module.exports = {
  answerQuestion
};
