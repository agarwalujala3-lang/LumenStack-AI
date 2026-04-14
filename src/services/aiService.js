const OpenAI = require("openai");

function classifyOpenAIError(error) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  if (status === 429 || code === "insufficient_quota" || message.includes("insufficient_quota")) {
    return {
      aiReason: "quota",
      aiMessage: "OpenAI quota limit reached. Using fallback repository summary."
    };
  }

  if (status === 401 || code === "invalid_api_key" || message.includes("invalid api key")) {
    return {
      aiReason: "auth",
      aiMessage: "OpenAI key is invalid or missing permission. Using fallback repository summary."
    };
  }

  return {
    aiReason: "unavailable",
    aiMessage: "OpenAI is temporarily unavailable. Using fallback repository summary."
  };
}

function buildFallbackDocumentation(analysis, options = {}) {
  const frameworkLine = analysis.summary.frameworks.length
    ? analysis.summary.frameworks.join(", ")
    : analysis.summary.primaryLanguage;
  const modules = analysis.modules
    .slice(0, 6)
    .map((module) => `${module.name} (${module.fileCount} files)`)
    .join(", ");
  const dependencies = analysis.dependencies
    .slice(0, 8)
    .map((dependency) => dependency.name)
    .join(", ") || "No manifest dependencies detected";
  const entrypoints = analysis.summary.entrypoints.join(", ") || "No obvious entrypoint detected";
  const platformSignals = analysis.platformSignals
    .slice(0, 5)
    .map((signal) => `${signal.name} (${signal.category})`)
    .join(", ") || "No workflow or platform signals detected";

  return {
    explanation:
      `${analysis.summary.sourceName} looks like a ${frameworkLine} codebase with ` +
      `${analysis.summary.codeFiles} code files organized into ${analysis.modules.length} logical modules. ` +
      `The heaviest areas are ${modules || "the root module"}, and the most likely entrypoints are ${entrypoints}.`,
    documentation: [
      "## Overview",
      `${analysis.summary.sourceName} is a ${frameworkLine} project analyzed from a ${analysis.summary.sourceType} source.`,
      "",
      "## Architecture",
      modules || "The repository is small enough that most logic lives near the root.",
      "",
      "## Key Dependencies",
      dependencies,
      "",
      "## Platform Signals",
      platformSignals,
      "",
      "## Suggested Explanation Flow",
      "1. Start from the entrypoint files.",
      "2. Follow module relationships in the Mermaid diagram.",
      "3. Review the highlighted files for implementation details."
    ].join("\n"),
    aiStatus: "fallback",
    aiReason: options.aiReason || "unavailable",
    aiMessage: options.aiMessage || "Using fallback repository summary."
  };
}

function extractJsonObject(value) {
  try {
    return JSON.parse(value);
  } catch {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(value.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

async function generateInsights(analysis) {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackDocumentation(analysis, {
      aiReason: "missing_key",
      aiMessage: "OPENAI_API_KEY is missing. Using fallback repository summary."
    });
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const promptPayload = {
    summary: analysis.summary,
    modules: analysis.modules.slice(0, 10),
    dependencies: analysis.dependencies.slice(0, 20),
    relationships: analysis.relationships.slice(0, 12),
    fileHighlights: analysis.fileHighlights.slice(0, 8),
    platformSignals: analysis.platformSignals.slice(0, 8)
  };

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are an expert software architect. Return valid JSON with keys " +
                '"explanation" and "documentation". Keep both concise, specific, and developer-facing.'
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

    const outputText = response.output_text || "";
    const parsed = extractJsonObject(outputText);

    if (!parsed?.explanation || !parsed?.documentation) {
      throw new Error("Model response was not valid JSON.");
    }

    return {
      explanation: String(parsed.explanation).trim(),
      documentation: String(parsed.documentation).trim(),
      aiStatus: "live",
      aiReason: "ok",
      aiMessage: "OpenAI live response."
    };
  } catch (error) {
    const aiDetails = classifyOpenAIError(error);
    return buildFallbackDocumentation(analysis, aiDetails);
  }
}

module.exports = {
  generateInsights
};
