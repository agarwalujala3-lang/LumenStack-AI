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

function formatList(items, fallback = "none detected") {
  return items && items.length ? items.join(", ") : fallback;
}

function summarizeMatches(matches, limit = 3) {
  return matches.slice(0, limit).map((match) => match.path);
}

function topModuleNames(analysis, limit = 4) {
  return (analysis.modules || []).slice(0, limit).map((module) => module.name);
}

function topDependencyNames(analysis, limit = 6) {
  return (analysis.dependencies || []).slice(0, limit).map((dependency) => dependency.name);
}

function topRelationshipSummary(analysis, limit = 3) {
  return (analysis.relationships || [])
    .slice(0, limit)
    .map((relationship) => `${relationship.from} -> ${relationship.to}`);
}

function topFindingSummary(analysis, limit = 3) {
  return (analysis.quality?.findings || [])
    .slice(0, limit)
    .map((finding) => `${finding.title}: ${finding.detail}`);
}

function topHotspotPaths(analysis, limit = 3) {
  return (analysis.quality?.hotspots || []).slice(0, limit).map((hotspot) => hotspot.path);
}

function buildCitations(matches) {
  return matches.map((match) => ({
    path: match.path,
    module: match.module
  }));
}

function buildHighLevelAnswer(analysis, question, matches) {
  const summary = analysis.summary || {};
  const moduleNames = topModuleNames(analysis);
  const entrypoints = (summary.entrypoints || []).filter((entrypoint) => !entrypoint.startsWith("public/"));
  const evidence = summarizeMatches(matches);

  return {
    answer: [
      `I do not have a perfect direct match for "${question}", but I can still explain the codebase from the indexed analysis.`,
      `${summary.sourceName || "This project"} is primarily ${summary.primaryLanguage || "unknown"}${summary.frameworks?.length ? ` and appears to use ${formatList(summary.frameworks)}` : ""}.`,
      moduleNames.length ? `The main implementation areas are ${formatList(moduleNames)}.` : "",
      entrypoints.length ? `The clearest entrypoints are ${formatList(entrypoints)}.` : "",
      evidence.length ? `The closest local evidence came from ${formatList(evidence)}.` : ""
    ]
      .filter(Boolean)
      .join(" "),
    citations: buildCitations(matches)
  };
}

function buildFallbackAnswer(analysis, question, matches) {
  const prompt = String(question || "").toLowerCase();
  const summary = analysis.summary || {};
  const quality = analysis.quality || {};
  const preferredEntrypoints = (summary.entrypoints || []).filter((entrypoint) => !entrypoint.startsWith("public/"));
  const moduleNames = topModuleNames(analysis);
  const relationshipSummary = topRelationshipSummary(analysis);
  const dependencyNames = topDependencyNames(analysis);
  const hotspotPaths = topHotspotPaths(analysis);
  const findingSummary = topFindingSummary(analysis);
  const matchPaths = summarizeMatches(matches);
  const matchModules = [...new Set(matches.map((match) => match.module).filter(Boolean))];
  const citations = buildCitations(matches);

  if (!matches.length) {
    return buildHighLevelAnswer(analysis, question, matches);
  }

  if (
    prompt.includes("route") ||
    prompt.includes("routing") ||
    prompt.includes("request") ||
    prompt.includes("entrypoint") ||
    prompt.includes("start") ||
    prompt.includes("api")
  ) {
    return {
      answer: [
        `The request flow most likely starts around ${formatList(preferredEntrypoints.length ? preferredEntrypoints : (summary.entrypoints || matchPaths), "the main application entrypoints")}.`,
        matchModules.length ? `The strongest routing or request-handling signals are in the ${formatList(matchModules)} area.` : "",
        matchPaths.length ? `The clearest supporting files are ${formatList(matchPaths)}.` : ""
      ]
        .filter(Boolean)
        .join(" "),
      citations
    };
  }

  if (
    prompt.includes("risk") ||
    prompt.includes("risky") ||
    prompt.includes("hotspot") ||
    prompt.includes("warning") ||
    prompt.includes("issue") ||
    prompt.includes("problem")
  ) {
    return {
      answer: [
        `${summary.sourceName || "This codebase"} currently looks ${quality.summary ? quality.summary.toLowerCase() : "like it has a few maintainability risks"}.`,
        findingSummary.length ? `The strongest risk signals are ${formatList(findingSummary)}.` : "",
        hotspotPaths.length ? `The highest-review files are ${formatList(hotspotPaths)}.` : ""
      ]
        .filter(Boolean)
        .join(" "),
      citations
    };
  }

  if (
    prompt.includes("dependency") ||
    prompt.includes("package") ||
    prompt.includes("library") ||
    prompt.includes("framework")
  ) {
    return {
      answer: [
        `The main framework and dependency picture is ${formatList(summary.frameworks || [], summary.primaryLanguage || "not obvious from the current analysis")}.`,
        dependencyNames.length ? `The most visible dependencies are ${formatList(dependencyNames)}.` : "",
        relationshipSummary.length ? `The strongest module links are ${formatList(relationshipSummary)}.` : ""
      ]
        .filter(Boolean)
        .join(" "),
      citations
    };
  }

  if (
    prompt.includes("module") ||
    prompt.includes("structure") ||
    prompt.includes("architecture") ||
    prompt.includes("organized") ||
    prompt.includes("organisation") ||
    prompt.includes("organization")
  ) {
    return {
      answer: [
        `The codebase is mainly organized around ${formatList(moduleNames)}.`,
        relationshipSummary.length ? `The clearest cross-module links are ${formatList(relationshipSummary)}.` : "",
        matchPaths.length ? `For your question, the most relevant implementation files are ${formatList(matchPaths)}.` : ""
      ]
        .filter(Boolean)
        .join(" "),
      citations
    };
  }

  if (
    prompt.includes("auth") ||
    prompt.includes("login") ||
    prompt.includes("session") ||
    prompt.includes("token") ||
    prompt.includes("security")
  ) {
    return {
      answer: [
        matchModules.length
          ? `The best local signal for authentication or session handling is in the ${formatList(matchModules)} area.`
          : "I do not see a dedicated authentication module in the strongest local matches.",
        matchPaths.length ? `The closest implementation evidence is ${formatList(matchPaths)}.` : "",
        preferredEntrypoints.length
          ? `The main request entrypoints are ${formatList(preferredEntrypoints)}.`
          : summary.entrypoints?.length
            ? `The main request entrypoints are ${formatList(summary.entrypoints)}.`
            : ""
      ]
        .filter(Boolean)
        .join(" "),
      citations
    };
  }

  return {
    answer: [
      matchModules.length
        ? `This question maps most strongly to the ${formatList(matchModules)} area.`
        : `I could not isolate a single dedicated module for "${question}", but I can still explain the likely implementation area.`,
      matchPaths.length ? `The best local evidence comes from ${formatList(matchPaths)}.` : "",
      preferredEntrypoints.length
        ? `The main entrypoints are ${formatList(preferredEntrypoints)}.`
        : summary.entrypoints?.length
          ? `The main entrypoints are ${formatList(summary.entrypoints)}.`
          : "",
      quality.summary ? `Overall architecture signal: ${quality.summary}` : ""
    ]
      .filter(Boolean)
      .join(" "),
    citations
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
    dependencies: analysis.dependencies.slice(0, 10),
    relationships: analysis.relationships.slice(0, 10),
    quality: {
      score: analysis.quality.score,
      summary: analysis.quality.summary,
      findings: analysis.quality.findings.slice(0, 5),
      hotspots: analysis.quality.hotspots.slice(0, 5)
    },
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
                "Answer directly in plain language first. Use file paths only as supporting evidence, not as a substitute for the explanation. " +
                "If the answer is uncertain, say that briefly and then give the best grounded explanation from the provided analysis."
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
      answer: response.output_text || buildFallbackAnswer(analysis, question, matches).answer,
      citations: buildCitations(matches),
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
