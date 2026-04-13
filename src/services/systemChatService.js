const OpenAI = require("openai");

const SYSTEM_FACTS = [
  "LumenStack scans repository structure and code files.",
  "It summarizes architecture, modules, dependencies, and risk hotspots.",
  "It can compare a current repo against a baseline repo or baseline ZIP.",
  "It generates architecture, sequence, class, and dependency Mermaid diagrams.",
  "It supports chat-based Q&A on top of the scanned repository context."
];

function sanitize(value) {
  return String(value || "").trim();
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

function hasKeyword(question, keywords) {
  const prompt = sanitize(question).toLowerCase();
  return keywords.some((keyword) => prompt.includes(keyword));
}

function buildFallbackSystemAnswer(question, analysisSummary) {
  const prompt = sanitize(question).toLowerCase();
  const sourceName = sanitize(analysisSummary?.sourceName) || "the current repository";
  const sourceType = sanitize(analysisSummary?.sourceType) || "repository";
  const codeFiles = Number(analysisSummary?.codeFiles || 0);

  if (!prompt) {
    return toPoints([
      "Ask me what this app does, how compare mode works, or what to run first",
      "I answer directly here in simple language",
      "No redirects needed for top-level product questions"
    ]);
  }

  if (hasKeyword(prompt, ["compare", "baseline", "difference", "changed"])) {
    return toPoints([
      "Compare mode runs analysis on two snapshots: current and baseline",
      "It reports changed files, added and removed code, and risk deltas",
      "You get one side-by-side review summary instead of manually checking commits",
      "Use baseline URL/ref or upload a baseline ZIP to activate it"
    ]);
  }

  if (hasKeyword(prompt, ["diagram", "mermaid", "architecture", "dependency", "sequence", "class"])) {
    return toPoints([
      "The app builds diagrams from scanned modules and relationships",
      "You can switch between architecture, sequence, class, and dependency views",
      "These diagrams are generated from repository signals, not static templates",
      "Use them to explain code flow quickly to technical and non-technical viewers"
    ]);
  }

  if (hasKeyword(prompt, ["chat", "ask", "question", "assistant"])) {
    return toPoints([
      "Repo chat answers questions using the scanned repository context",
      "It now focuses on simple point-wise explanations in human language",
      "Ask things like routing flow, risky files, dependency impact, or module ownership",
      "If you need sources, explicitly ask for file references and it will include them"
    ]);
  }

  if (hasKeyword(prompt, ["start", "how to use", "workflow", "steps", "run"])) {
    return toPoints([
      "Step 1: Provide a repository URL or upload a ZIP",
      "Step 2: Click Run Analysis to scan modules, dependencies, and quality signals",
      "Step 3: Review summary cards, diagrams, and hotspot findings",
      "Step 4: Ask repo chat for explanations or compare against a baseline"
    ]);
  }

  return toPoints([
    `This app is an AI architecture workspace for ${sourceName}`,
    `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} scans map code structure, dependencies, and risk hotspots`,
    codeFiles > 0 ? `The latest scan indexed about ${codeFiles} code files` : "It works for both repo links and ZIP uploads",
    "You can analyze, compare, visualize, and ask follow-up questions in one flow"
  ]);
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
  const fallbackAnswer = buildFallbackSystemAnswer(question, analysisSummary);

  if (!process.env.OPENAI_API_KEY) {
    return {
      answer: fallbackAnswer,
      aiStatus: "fallback"
    };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const promptPayload = {
    question: sanitize(question),
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
      aiStatus: "live"
    };
  } catch {
    return {
      answer: fallbackAnswer,
      aiStatus: "fallback"
    };
  }
}

module.exports = {
  answerSystemQuestion
};
