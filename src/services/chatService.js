const OpenAI = require("openai");

const QUESTION_STOPWORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "app",
  "application",
  "are",
  "behind",
  "can",
  "code",
  "does",
  "easy",
  "explain",
  "for",
  "from",
  "give",
  "how",
  "i",
  "in",
  "is",
  "it",
  "lang",
  "language",
  "logic",
  "me",
  "of",
  "or",
  "please",
  "show",
  "simple",
  "simpler",
  "tell",
  "the",
  "this",
  "to",
  "what",
  "where",
  "which",
  "who",
  "why"
]);

const CONCEPT_HINTS = {
  lambda:
    "In this repo, Lambda most likely means AWS Lambda serverless functions, which run backend logic on demand instead of keeping a long-running server alive.",
  auth:
    "In this repo, auth usually means the code that verifies identity, sessions, tokens, or sign-in flow before protected logic runs.",
  authentication:
    "In this repo, authentication usually means the code that verifies identity, sessions, tokens, or sign-in flow before protected logic runs.",
  authorization:
    "In this repo, authorization usually means the rules that decide what an authenticated user is allowed to do.",
  dashboard:
    "In this repo, the dashboard is likely the user-facing UI layer that displays analysis, controls, or workflow state.",
  api:
    "In this repo, the API layer is the request-handling surface that receives client calls and forwards them into backend logic.",
  backend:
    "In this repo, the backend is the server-side or function-side logic that processes requests, data, and integrations.",
  frontend:
    "In this repo, the frontend is the UI layer that renders screens and sends requests to the backend or analysis APIs.",
  database:
    "In this repo, database-related code is the part that stores or retrieves persistent application data.",
  dynamodb:
    "In this repo, DynamoDB-related code would be the persistence layer that stores structured application records in AWS.",
  s3:
    "In this repo, S3-related code would handle file storage, uploads, or object retrieval in AWS.",
  textract:
    "In this repo, Textract-related code would be the OCR or document extraction layer used to read structured data from files.",
  chat:
    "In this repo, chat is the question-answering layer that uses indexed repository context to explain the codebase."
};

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9_/@.-]+/)
    .map((token) => token.replace(/^[-./@]+|[-./@]+$/g, ""))
    .filter((token) => token.length > 1 && !QUESTION_STOPWORDS.has(token));
}

function extractQuestionFocus(question) {
  const normalized = String(question || "").toLowerCase().trim();
  const explicitMatch = normalized.match(
    /(?:tell me about|what is|what does|explain|describe|where is|where are|how does|how is)\s+([a-z0-9_/@.-]+(?:\s+[a-z0-9_/@.-]+){0,3})/
  );

  if (explicitMatch) {
    return explicitMatch[1].trim();
  }

  return tokenize(normalized)[0] || "";
}

function toTokenSet(value) {
  return new Set(tokenize(value));
}

function normalizeRole(role) {
  if (!role) {
    return "";
  }

  const trimmed = role.replace(/\.$/, "");
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function describeEvidence(matches, limit = 2) {
  return matches.slice(0, limit).map((match) => `${match.path} where it ${normalizeRole(match.role)}`);
}

function pickEvidenceMatches(matches, limit = 3) {
  const directMatches = matches.filter((match) => match.pathHit || match.moduleHit || match.roleHit);
  return (directMatches.length ? directMatches : matches).slice(0, limit);
}

function retrieveRelevantDocuments(analysis, question, limit = 4) {
  const focus = extractQuestionFocus(question);
  const questionTokens = [...new Set([...tokenize(question), ...tokenize(focus)])];

  return (analysis.searchIndex || [])
    .map((document) => {
      const pathLower = String(document.path || "").toLowerCase();
      const moduleLower = String(document.module || "").toLowerCase();
      const roleLower = String(document.role || "").toLowerCase();
      const pathTokens = toTokenSet(document.path);
      const moduleTokens = toTokenSet(document.module);
      const roleTokens = toTokenSet(document.role);
      const contentTokens = toTokenSet(document.content);
      let score = 0;
      let pathHit = false;
      let moduleHit = false;
      let roleHit = false;
      let contentHit = false;

      for (const token of questionTokens) {
        if (pathTokens.has(token)) {
          score += 18;
          pathHit = true;
        }

        if (moduleTokens.has(token)) {
          score += 14;
          moduleHit = true;
        }

        if (roleTokens.has(token)) {
          score += 10;
          roleHit = true;
        }

        if (contentTokens.has(token)) {
          score += pathHit || moduleHit || roleHit ? 2 : 4;
          contentHit = true;
        }

        if (
          pathLower.includes(`/${token}/`) ||
          pathLower.startsWith(`${token}/`) ||
          pathLower.endsWith(`/${token}`) ||
          pathLower.includes(`${token}.`)
        ) {
          score += 10;
          pathHit = true;
        }

        if (moduleLower === token) {
          score += 8;
          moduleHit = true;
        }

        if (roleLower.includes(token)) {
          score += 5;
          roleHit = true;
        }
      }

      if (focus) {
        const normalizedFocus = focus.replace(/\s+/g, "-");
        if (
          pathLower.includes(`/${focus}/`) ||
          pathLower.startsWith(`${focus}/`) ||
          pathLower.includes(normalizedFocus) ||
          moduleLower === focus
        ) {
          score += 16;
          pathHit = true;
        }
      }

      return {
        ...document,
        score,
        pathHit,
        moduleHit,
        roleHit,
        contentHit
      };
    })
    .filter((document) => document.score > 0)
    .sort(
      (a, b) =>
        Number(b.pathHit) - Number(a.pathHit) ||
        Number(b.moduleHit) - Number(a.moduleHit) ||
        Number(b.roleHit) - Number(a.roleHit) ||
        b.score - a.score ||
        a.path.localeCompare(b.path)
    )
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

function topPlatformSignals(analysis, limit = 4) {
  return (analysis.platformSignals || [])
    .slice(0, limit)
    .map((signal) => `${signal.name} (${signal.category})`);
}

function topRoleDescriptions(analysis, limit = 4) {
  const vagueRoles = new Set([
    "Contributes to the application structure."
  ]);

  return [...new Set(
    (analysis.fileHighlights || [])
      .map((file) => String(file.role || "").trim())
      .filter((role) => role && !vagueRoles.has(role))
  )].slice(0, limit);
}

function simplifyRoleTopic(role) {
  const normalized = String(role || "").toLowerCase();

  if (normalized.includes("request handling")) {
    return "request handling";
  }

  if (normalized.includes("reusable business logic")) {
    return "reusable business logic";
  }

  if (normalized.includes("application behavior")) {
    return "testing";
  }

  if (normalized.includes("functional application logic")) {
    return "general app logic";
  }

  if (normalized.includes("user interface")) {
    return "UI rendering";
  }

  if (normalized.includes("configuration")) {
    return "configuration";
  }

  return normalizeSentence(role);
}

function normalizeSentence(value) {
  const text = String(value || "").trim().replace(/\.$/, "");

  if (!text) {
    return "";
  }

  return text.charAt(0).toLowerCase() + text.slice(1);
}

function withIndefiniteArticle(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return /^[aeiou]/i.test(text) ? `an ${text}` : `a ${text}`;
}

function formatNaturalList(items, fallback = "") {
  const values = (items || []).filter(Boolean);

  if (!values.length) {
    return fallback;
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function isSimpleLanguageRequest(prompt) {
  return /simple|simpler|easy|plain english|plain language|layman|non-technical|basic words|simple lang/.test(
    prompt
  );
}

function isBroadOverviewQuestion(prompt) {
  return (
    prompt.includes("how it works") ||
    prompt.includes("how this works") ||
    prompt.includes("how the app works") ||
    prompt.includes("how this app works") ||
    prompt.includes("logic behind") ||
    prompt.includes("overall logic") ||
    prompt.includes("what this app does") ||
    prompt.includes("what the app does") ||
    prompt.includes("explain the app") ||
    prompt.includes("explain this app") ||
    prompt.includes("explain the project") ||
    prompt.includes("tell me about the app") ||
    prompt.includes("tell me about this app") ||
    prompt.includes("tell me about the project") ||
    prompt.includes("how the project works") ||
    prompt.includes("how this project works") ||
    prompt.includes("give me an overview")
  );
}

function buildSimpleOverviewAnswer(analysis, matches, options = {}) {
  const { simple = false } = options;
  const summary = analysis.summary || {};
  const moduleNames = topModuleNames(analysis);
  const dependencyNames = topDependencyNames(analysis, 4);
  const roleDescriptions = [...new Set(topRoleDescriptions(analysis, 4).map(simplifyRoleTopic))];
  const platformSignals = topPlatformSignals(analysis, 3);
  const preferredEntrypoints = (summary.entrypoints || []).filter((entrypoint) => !entrypoint.startsWith("public/"));
  const entrypoints = preferredEntrypoints.length ? preferredEntrypoints.slice(0, 2) : (summary.entrypoints || []).slice(0, 2);
  const citations = buildCitations(matches);
  const frameworkLine = summary.frameworks?.length
    ? formatNaturalList(summary.frameworks)
    : summary.primaryLanguage || "software";

  return {
    answer: [
      simple
        ? `In simple terms, ${summary.sourceName || "this project"} looks like ${withIndefiniteArticle(frameworkLine)} app or service.`
        : `${summary.sourceName || "This project"} looks like ${withIndefiniteArticle(frameworkLine)} app or service.`,
      entrypoints.length
        ? `It most likely starts around ${formatNaturalList(entrypoints)} and then hands work to the main modules.`
        : "",
      moduleNames.length
        ? `The code is mainly split into parts like ${formatNaturalList(moduleNames)}, which helps keep different responsibilities separate.`
        : "",
      roleDescriptions.length
        ? `Those parts mainly handle things like ${formatNaturalList(roleDescriptions)}.`
        : "",
      dependencyNames.length
        ? `The main tools it relies on are ${formatNaturalList(dependencyNames)}.`
        : "",
      platformSignals.length
        ? `It also includes workflow or deployment setup such as ${formatNaturalList(platformSignals)}.`
        : ""
    ]
      .filter(Boolean)
      .join(" "),
    citations
  };
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
  const evidence = summarizeMatches(pickEvidenceMatches(matches));

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
  const focus = extractQuestionFocus(question);
  const simpleLanguage = isSimpleLanguageRequest(prompt);
  const broadOverview = isBroadOverviewQuestion(prompt);
  const summary = analysis.summary || {};
  const quality = analysis.quality || {};
  const preferredEntrypoints = (summary.entrypoints || []).filter((entrypoint) => !entrypoint.startsWith("public/"));
  const moduleNames = topModuleNames(analysis);
  const relationshipSummary = topRelationshipSummary(analysis);
  const dependencyNames = topDependencyNames(analysis);
  const hotspotPaths = topHotspotPaths(analysis);
  const findingSummary = topFindingSummary(analysis);
  const platformSignals = topPlatformSignals(analysis);
  const evidenceMatches = pickEvidenceMatches(matches);
  const matchPaths = summarizeMatches(evidenceMatches);
  const matchModules = [...new Set(evidenceMatches.map((match) => match.module).filter(Boolean))];
  const evidenceDescriptions = describeEvidence(evidenceMatches);
  const citations = buildCitations(matches);

  if (broadOverview || (simpleLanguage && !focus)) {
    return buildSimpleOverviewAnswer(analysis, matches, {
      simple: simpleLanguage
    });
  }

  if (!matches.length) {
    if (simpleLanguage) {
      return buildSimpleOverviewAnswer(analysis, matches, {
        simple: true
      });
    }

    return buildHighLevelAnswer(analysis, question, matches);
  }

  if (
    prompt.includes("tell me about") ||
    prompt.startsWith("what is") ||
    prompt.startsWith("what does") ||
    prompt.startsWith("explain") ||
    prompt.startsWith("describe")
  ) {
    if (
      !focus ||
      ["app", "application", "project", "codebase", "logic", "flow", "overview"].includes(focus)
    ) {
      return buildSimpleOverviewAnswer(analysis, matches, {
        simple: simpleLanguage
      });
    }

    const directLambdaMatches = evidenceMatches.filter(
      (match) => match.path.includes("lambda/") || match.module === "lambda" || match.path.toLowerCase().includes("lambda")
    );
    const uiMentions = matches.filter((match) =>
      /dashboard|public|frontend|client|ui/i.test(`${match.path} ${match.module}`)
    );

    return {
      answer: [
        CONCEPT_HINTS[focus] ||
          `In this codebase, ${focus || "that area"} appears to be implemented through a specific set of files and modules rather than a single central definition.`,
        evidenceDescriptions.length
          ? `The clearest code evidence is ${formatList(evidenceDescriptions)}.`
          : "",
        focus === "lambda" && directLambdaMatches.length
          ? `The actual Lambda-side implementation is strongest in ${formatList(directLambdaMatches.map((match) => match.path))}.`
          : "",
        focus === "lambda" && uiMentions.length
          ? "Some dashboard or UI files also mention Lambda because they trigger or describe that backend flow, but they are not the main implementation."
          : "",
        preferredEntrypoints.length && !["lambda", "auth", "authentication", "authorization"].includes(focus)
          ? `The main entrypoints are ${formatList(preferredEntrypoints)}.`
          : ""
      ]
        .filter(Boolean)
        .join(" "),
      citations
    };
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
        evidenceDescriptions.length ? `The clearest code evidence is ${formatList(evidenceDescriptions)}.` : ""
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
    prompt.includes("pipeline") ||
    prompt.includes("workflow") ||
    prompt.includes("ci") ||
    prompt.includes("cd") ||
    prompt.includes("deploy") ||
    prompt.includes("github action") ||
    prompt.includes("gitlab") ||
    prompt.includes("bitbucket") ||
    prompt.includes("azure") ||
    prompt.includes("codeowner") ||
    prompt.includes("dependabot") ||
    prompt.includes("renovate")
  ) {
    return {
      answer: [
        platformSignals.length
          ? `The repository shows these workflow or platform signals: ${formatList(platformSignals)}.`
          : "I do not see strong workflow or platform tooling signals in the current repository snapshot.",
        (analysis.platformSignals || []).length
          ? `The clearest evidence is ${formatList(
              analysis.platformSignals
                .slice(0, 4)
                .map((signal) => `${signal.name.toLowerCase()} via ${formatList(signal.evidence, "its detected files")}`)
            )}.`
          : "",
        evidenceDescriptions.length ? `Related implementation files also include ${formatList(evidenceDescriptions)}.` : ""
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
        relationshipSummary.length ? `The strongest module links are ${formatList(relationshipSummary)}.` : "",
        evidenceDescriptions.length ? `The clearest supporting files are ${formatList(evidenceDescriptions)}.` : ""
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
        evidenceDescriptions.length ? `For your question, the most relevant implementation files are ${formatList(evidenceDescriptions)}.` : ""
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
    const frontendAuthMatches = evidenceMatches.filter((match) =>
      /dashboard|public|client|frontend|components|pages/i.test(match.path)
    );
    const backendAuthMatches = evidenceMatches.filter((match) =>
      /lambda|server|api|middleware|session|token|cognito/i.test(match.path)
    );

    return {
      answer: [
        frontendAuthMatches.length && backendAuthMatches.length
          ? "Authentication appears to be split between the UI sign-in flow and backend validation logic."
          : matchModules.length
            ? `The best local signal for authentication or session handling is in the ${formatList(matchModules)} area.`
            : "I do not see a dedicated authentication module in the strongest local matches.",
        frontendAuthMatches.length
          ? `On the frontend side, the clearest files are ${formatList(
              frontendAuthMatches.map((match) => `${match.path} where it ${normalizeRole(match.role)}`)
            )}.`
          : "",
        backendAuthMatches.length
          ? `On the backend side, the clearest files are ${formatList(
              backendAuthMatches.map((match) => `${match.path} where it ${normalizeRole(match.role)}`)
            )}.`
          : evidenceDescriptions.length
            ? `The closest implementation evidence is ${formatList(evidenceDescriptions)}.`
            : ""
      ]
        .filter(Boolean)
        .join(" "),
      citations
    };
  }

  return {
    answer: [
      focus
        ? `In this codebase, ${focus} appears to live mostly in the ${formatList(matchModules, "relevant")} area.`
        : matchModules.length
          ? `This question is best answered from the ${formatList(matchModules)} area of the codebase.`
          : `I could not isolate a single dedicated module for "${question}", but I can still explain the likely implementation area.`,
      evidenceDescriptions.length ? `The clearest code evidence is ${formatList(evidenceDescriptions)}.` : "",
      preferredEntrypoints.length
        ? `The main entrypoints are ${formatList(preferredEntrypoints)}.`
        : summary.entrypoints?.length
          ? `The main entrypoints are ${formatList(summary.entrypoints)}.`
          : "",
      CONCEPT_HINTS[focus] && !prompt.includes("risk") ? CONCEPT_HINTS[focus] : ""
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
    platformSignals: analysis.platformSignals.slice(0, 8),
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
                "Answer directly in plain language first. If the user asks for simple language, explain in very simple English with a short high-level overview before details. " +
                "Use file paths only as supporting evidence, not as a substitute for the explanation. " +
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
