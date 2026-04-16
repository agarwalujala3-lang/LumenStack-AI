const OpenAI = require("openai");
const { normalizeQuestionText } = require("./questionNormalizer");

function classifyOpenAIError(error) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  if (status === 429 || code === "insufficient_quota" || message.includes("insufficient_quota")) {
    return {
      aiReason: "quota",
      aiMessage: "OpenAI quota reached. Answering from local assistant context."
    };
  }

  if (status === 401 || code === "invalid_api_key" || message.includes("invalid api key")) {
    return {
      aiReason: "auth",
      aiMessage: "OpenAI key invalid or unauthorized. Answering from local assistant context."
    };
  }

  return {
    aiReason: "unavailable",
    aiMessage: "OpenAI unavailable right now. Answering from local assistant context."
  };
}

const SYSTEM_FACTS = [
  "LumenStack scans repository structure and code files.",
  "It summarizes architecture, modules, dependencies, and risk hotspots.",
  "It can compare a current repo against a baseline repo or baseline ZIP.",
  "It generates architecture, sequence, class, and dependency Mermaid diagrams.",
  "It supports chat-based Q&A on top of the scanned repository context."
];

const TOPIC_CONFIGS = [
  {
    id: "security",
    keywords: [
      "secure",
      "security",
      "secret",
      "api key",
      "token",
      "password",
      "credential",
      "private key",
      "env",
      "environment variable",
      "leak"
    ]
  },
  {
    id: "overview",
    keywords: [
      "how app works",
      "how this app works",
      "how the app works",
      "what this app does",
      "what the app does",
      "app overview",
      "project overview",
      "overall"
    ]
  },
  {
    id: "ingest",
    keywords: [
      "clone",
      "copy repo",
      "copies the repo",
      "pull repo",
      "fetch repo",
      "download repo",
      "ingest",
      "source intake"
    ]
  },
  {
    id: "improvement",
    keywords: [
      "improve",
      "improvement",
      "better",
      "optimize",
      "refactor",
      "priority"
    ]
  },
  {
    id: "quality",
    keywords: [
      "bug",
      "bugs",
      "issue",
      "issues",
      "defect",
      "error",
      "errors",
      "risk",
      "risky"
    ]
  },
  {
    id: "compare",
    keywords: [
      "compare",
      "comparison",
      "baseline",
      "difference",
      "diff",
      "changed",
      "change",
      "review mode"
    ]
  },
  {
    id: "chat",
    keywords: [
      "chat",
      "assistant",
      "ask",
      "question",
      "explain",
      "summary",
      "simple language",
      "human language"
    ]
  },
  {
    id: "diagram",
    keywords: [
      "diagram",
      "mermaid",
      "architecture",
      "dependency",
      "sequence",
      "class",
      "visualize",
      "graph"
    ]
  },
  {
    id: "analysis",
    keywords: [
      "analyze",
      "analysis",
      "scan",
      "index",
      "module",
      "hotspot",
      "risk",
      "quality",
      "finding"
    ]
  },
  {
    id: "input",
    keywords: [
      "upload",
      "zip",
      "repo url",
      "repository url",
      "github",
      "gitlab",
      "bitbucket",
      "azure",
      "gitea"
    ]
  },
  {
    id: "output",
    keywords: [
      "export",
      "markdown",
      "json",
      "report",
      "output",
      "download"
    ]
  },
  {
    id: "start",
    keywords: [
      "start",
      "how to use",
      "workflow",
      "steps",
      "run",
      "first",
      "begin"
    ]
  },
  {
    id: "deploy",
    keywords: [
      "deploy",
      "deployment",
      "render",
      "hosting",
      "live",
      "build",
      "restart",
      "wake"
    ]
  }
];

function sanitize(value) {
  return String(value || "").trim();
}

function formatSourceSubject(rawSourceName) {
  const sourceName = sanitize(rawSourceName);

  if (!sourceName) {
    return "This app";
  }

  const normalized = sourceName.toLowerCase();
  const genericNames = new Set(["current", "baseline", "upload", "repository", "workspace"]);

  if (genericNames.has(normalized)) {
    return "This repository";
  }

  if (/^[a-z0-9_-]{1,18}$/i.test(sourceName)) {
    return sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
  }

  return sourceName;
}

function toPoints(lines, max = 5) {
  const cleaned = (lines || [])
    .map((line) => sanitize(line).replace(/[.?!]+$/, ""))
    .filter(Boolean)
    .slice(0, max);

  if (!cleaned.length) {
    return "1. I can explain how this system works and what each feature does.";
  }

  return cleaned.map((line, index) => `${index + 1}. ${line}.`).join("\n");
}

function scoreTopic(prompt, topic) {
  return topic.keywords.reduce((score, keyword) => {
    if (!prompt.includes(keyword)) {
      return score;
    }

    return score + (keyword.includes(" ") ? 2 : 1);
  }, 0);
}

function rankTopics(question) {
  const prompt = sanitize(question).toLowerCase();

  return TOPIC_CONFIGS
    .map((topic) => ({
      id: topic.id,
      score: scoreTopic(prompt, topic)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

function buildTopicLines(topicId, context) {
  const {
    sourceName,
    sourceType,
    codeFiles,
    primaryLanguage,
    frameworks,
    question
  } = context;

  if (topicId === "security") {
    return [
      "I can explain security behavior, but I will not reveal secrets like API keys, tokens, or private credentials",
      "Sensitive values should stay in server environment variables, not in client code or browser output",
      "If you want, ask for a security checklist and I will give concrete hardening steps for this app",
      "I can also explain which parts are safe to expose in UI and which should stay backend-only"
    ];
  }

  if (topicId === "overview") {
    return [
      `${sourceName} provides an architecture review workspace for code repositories`,
      "It analyzes modules, dependencies, quality findings, and platform signals",
      "It generates diagrams plus structured summaries for quick understanding",
      "It also supports compare mode and point-wise Q&A after analysis"
    ];
  }

  if (topicId === "ingest") {
    return [
      "The app accepts either a repository URL or ZIP upload as input",
      "For repository URLs, it clones with shallow depth and supports branch or ref targeting",
      "If a direct branch clone fails, it retries by fetching and checking out that ref",
      "ZIP mode unpacks the archive and analyzes the extracted project root"
    ];
  }

  if (topicId === "quality") {
    return [
      "Bug-prone areas are usually where hotspot files and quality findings overlap",
      "Start review from the highest-risk files shown after analysis",
      "Then check dependency-heavy and high-change modules first",
      "If you want, ask this in repo chat and I will return concrete file-level priorities"
    ];
  }

  if (topicId === "improvement") {
    return [
      "Best first improvement is to fix top quality findings in hotspot files",
      "Second, tighten module boundaries where dependencies are too broad",
      "Third, strengthen tests around high-change paths",
      "I can give a repo-specific improvement order once analysis is complete"
    ];
  }

  if (topicId === "compare") {
    return [
      "Compare mode analyzes two snapshots: current source and baseline source",
      "It surfaces changed files, added and removed code, and quality deltas in one review view",
      "You can use baseline URL/ref or upload a baseline ZIP",
      "This avoids manually comparing commits across platforms"
    ];
  }

  if (topicId === "chat") {
    return [
      "Repo chat should answer your question directly in simple points",
      "It uses scanned repository context, not random generic text",
      "Ask specific things like routing flow, risky files, dependencies, or module ownership",
      "If you need proof paths, ask for sources and it will include file references"
    ];
  }

  if (topicId === "diagram") {
    return [
      "Diagram views are generated from scanned module and dependency relationships",
      "You can switch architecture, sequence, class, and dependency maps",
      "This helps explain flow quickly for reviews and demos",
      "Diagrams update based on the repository you analyzed"
    ];
  }

  if (topicId === "analysis") {
    return [
      `${sourceName} is scanned as a ${sourceType} and mapped into modules, dependencies, and risk signals`,
      codeFiles > 0
        ? `Current scan indexed about ${codeFiles} code files`
        : "Current scan focuses on code structure and maintainability signals",
      primaryLanguage ? `Primary language detected is ${primaryLanguage}` : "",
      frameworks.length ? `Main framework signals include ${frameworks.join(", ")}` : ""
    ].filter(Boolean);
  }

  if (topicId === "input") {
    return [
      "You can run analysis from repository URL or ZIP upload",
      "Supported source platforms include GitHub, GitLab, Bitbucket, Azure DevOps, and generic Git remotes",
      "ZIP mode works well for private snapshots and offline demos",
      "Use compare mode when you also want baseline-vs-current review"
    ];
  }

  if (topicId === "output") {
    return [
      "After analysis, you can export a markdown architecture brief and a JSON report",
      "The report includes summary, quality findings, modules, dependencies, and diagram data",
      "This output is useful for sharing review context with team members quickly"
    ];
  }

  if (topicId === "start") {
    return [
      "Step 1: Add a repository URL or upload a ZIP",
      "Step 2: Click Run Analysis",
      "Step 3: Review summary, quality findings, and diagrams",
      "Step 4: Use chat for direct Q&A or compare mode for baseline review"
    ];
  }

  if (topicId === "deploy") {
    return [
      "The app is designed to run as a Node web service and bind to the runtime port",
      "On free Render, cold starts can happen after inactivity and look like wake-up delays",
      "If you see repeated restarts, check build/start logs and ensure the service keeps healthy",
      "I can help you debug a specific deployment error message if you paste it"
    ];
  }

  return [
    `${sourceName} is processed as an AI architecture workspace for review and explanation`,
    `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} scans map code structure, dependencies, and risk hotspots`,
    codeFiles > 0
      ? `The latest scan indexed about ${codeFiles} code files`
      : "It works for both repo links and ZIP uploads",
    "You can analyze, compare, visualize, and ask follow-up questions in one flow"
  ].filter(Boolean);
}

function buildFallbackSystemAnswer(question, analysisSummary) {
  const prompt = sanitize(question).toLowerCase();
  const sourceName = formatSourceSubject(analysisSummary?.sourceName || "This app");
  const sourceType = sanitize(analysisSummary?.sourceType) || "repository";
  const codeFiles = Number(analysisSummary?.codeFiles || 0);
  const primaryLanguage = sanitize(analysisSummary?.primaryLanguage);
  const frameworks = Array.isArray(analysisSummary?.frameworks) ? analysisSummary.frameworks.slice(0, 3) : [];

  if (!prompt) {
    return toPoints([
      "Ask me what this app does, how compare mode works, or what to run first",
      "I answer directly here in simple language",
      "No redirects needed for top-level product questions"
    ]);
  }

  const rankedTopics = rankTopics(prompt);

  if (!rankedTopics.length) {
    return toPoints(
      buildTopicLines("unknown", {
        sourceName,
        sourceType,
        codeFiles,
        primaryLanguage,
        frameworks,
        question: sanitize(question)
      })
    );
  }

  const primaryTopic = rankedTopics[0].id;
  const lines = buildTopicLines(primaryTopic, {
    sourceName,
    sourceType,
    codeFiles,
    primaryLanguage,
    frameworks,
    question: sanitize(question)
  });

  const secondary = rankedTopics[1];
  if (secondary && secondary.score >= 2 && primaryTopic !== "security") {
    const secondaryLineMap = {
      compare: "If needed, I can also break this down with baseline-vs-current comparison details",
      diagram: "If you want visuals, I can also explain which diagram view fits your question best",
      chat: "If you ask in plain language, I will keep answers short and point-wise",
      analysis: "I can also include scan-level details like modules and risk hotspots for this topic"
    };
    const line = secondaryLineMap[secondary.id];
    if (line) {
      lines.push(line);
    }
  }

  return toPoints(lines);
}

function normalizePointAnswer(text) {
  const raw = sanitize(text);

  if (!raw) {
    return "";
  }

  if (/^\s*\d+\.\s+/m.test(raw)) {
    return raw;
  }

  const parts = raw
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return toPoints(parts);
  }

  const sentences = raw
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]?/g);

  if (!sentences?.length) {
    return toPoints([raw]);
  }

  return toPoints(sentences.map((sentence) => sentence.trim()), 5);
}

async function answerSystemQuestion({ question, analysisSummary }) {
  const normalizedQuestion = normalizeQuestionText(question);
  const fallbackAnswer = buildFallbackSystemAnswer(normalizedQuestion, analysisSummary);

  if (!process.env.OPENAI_API_KEY) {
    return {
      answer: fallbackAnswer,
      aiStatus: "fallback",
      aiReason: "missing_key",
      aiMessage: "OPENAI_API_KEY is missing. Answering from local assistant context."
    };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const promptPayload = {
    question: sanitize(normalizedQuestion),
    analysisSummary: analysisSummary || null,
    systemFacts: SYSTEM_FACTS
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
                "You are the in-app LumenStack assistant. " +
                "Answer directly in simple human language. " +
                "Always respond in 3 to 5 short numbered points. " +
                "Do not redirect users to files, links, or docs unless asked."
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

    const normalized = normalizePointAnswer(response.output_text || "");

    if (!normalized) {
      throw new Error("Empty system chat output");
    }

    return {
      answer: normalized,
      aiStatus: "live",
      aiReason: "ok",
      aiMessage: "OpenAI live response."
    };
  } catch (error) {
    const aiDetails = classifyOpenAIError(error);
    return {
      answer: fallbackAnswer,
      aiStatus: "fallback",
      aiReason: aiDetails.aiReason,
      aiMessage: aiDetails.aiMessage
    };
  }
}

module.exports = {
  answerSystemQuestion
};
