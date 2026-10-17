const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { prepareSource, getSupportedSourcePlatforms } = require("./services/sourceService");
const { analyzeCodebase } = require("./services/analyzerService");
const { buildFallbackDocumentation, generateInsights, generateStreamingInsights } = require("./services/aiService");
const { compareAnalyses } = require("./services/comparisonService");
const { buildLearningGuide } = require("./services/learningGuideService");
const { answerQuestion } = require("./services/chatService");
const { answerSystemQuestion } = require("./services/systemChatService");
const { normalizeUserQuestion } = require("./services/questionNormalizer");
const {
  createAnalysisSession,
  getAnalysisSession,
  getWebhookReport,
  saveWorkspaceReport,
  getWorkspaceReport,
  getSavedProjects,
  saveProject
} = require("./services/sessionStore");

const uploadRoot = path.join(process.cwd(), ".runtime", "incoming");
const requestBuckets = new Map();
const publicBaseUrl = "https://lumenstack-ai.onrender.com";
const serverStartedAt = new Date();

function buildSecurityTxt() {
  return [
    "Contact: mailto:agarwalujala3@gmail.com",
    `Canonical: ${publicBaseUrl}/.well-known/security.txt`,
    "Preferred-Languages: en",
    "Policy: https://github.com/agarwalujala3-lang/LumenStack-AI/security/policy",
    "Hiring-Note: LumenStack AI is maintained as a recruiter-ready full-stack security-conscious demo."
  ].join("\n");
}

function applySecurityHeaders(_req, res, next) {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "manifest-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' mailto:",
      "upgrade-insecure-requests"
    ].join("; ")
  );
  next();
}

function createRateLimit({ windowMs = 60_000, limit = 80 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip || req.socket.remoteAddress || "unknown"}:${req.path}`;
    const now = Date.now();
    const bucket = requestBuckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    requestBuckets.set(key, bucket);

    if (bucket.count > limit) {
      return res.status(429).json({
        error: "Too many requests. Please wait a moment and try again."
      });
    }

    return next();
  };
}

function isZipUpload(file) {
  const name = String(file?.originalname || "").toLowerCase();
  const mime = String(file?.mimetype || "").toLowerCase();
  return name.endsWith(".zip") || mime === "application/zip" || mime === "application/x-zip-compressed";
}

function createUploadMiddleware() {
  return multer({
    dest: uploadRoot,
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 2,
      fields: 8
    },
    fileFilter(_req, file, callback) {
      if (!isZipUpload(file)) {
        return callback(new Error("Only ZIP archives are supported for uploads."));
      }

      return callback(null, true);
    }
  });
}

function normalizeShortText(value, fallback = "") {
  return String(value || fallback)
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 160);
}

function getUploadedFile(files, fieldName) {
  return files?.[fieldName]?.[0] || null;
}

function sanitizeRepositoryUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}

function serializeAnalysis(analysis, insights) {
  return {
    summary: analysis.summary,
    modules: analysis.modules,
    dependencies: analysis.dependencies,
    relationships: analysis.relationships,
    fileHighlights: analysis.fileHighlights,
    quality: analysis.quality,
    platformSignals: analysis.platformSignals,
    diagrams: analysis.diagrams,
    mermaidDiagram: analysis.mermaidDiagram,
    reportMarkdown: analysis.reportMarkdown,
    learningGuide: buildLearningGuide(analysis),
    explanation: insights.explanation,
    documentation: insights.documentation,
    aiStatus: insights.aiStatus
  };
}

function buildSourceMetadata(preparedSource) {
  return {
    name: preparedSource.sourceName,
    type: preparedSource.sourceType,
    platform: preparedSource.sourcePlatform || "Repository Workspace",
    platformId: preparedSource.sourcePlatformId || "generic",
    workspaceLabel: preparedSource.sourceWorkspaceLabel || preparedSource.sourceName,
    workspaceKey: preparedSource.sourceWorkspaceKey || "",
    repoUrl: sanitizeRepositoryUrl(preparedSource.sourceRepoUrl),
    ref: preparedSource.sourceRef || ""
  };
}

function buildExportMarkdown(session) {
  const guide = buildLearningGuide(session.analysis);
  const evidenceLines = (items = []) => items.map((item) => `- Evidence: ${item.path}:${item.line}`);
  const guideMarkdown = [
    "## First-day learning guide",
    "",
    ...guide.steps.flatMap((step) => [
      `### ${step.title}`,
      `Learning stage: ${step.phase || "Learn"}`,
      step.body,
      `Basis: ${step.basis}`,
      ...(step.evidence || []).map((item) => `- Evidence: ${item.path}:${item.line}`),
      ...(step.knowledgeCheck ? [
        `Quick check: ${step.knowledgeCheck.question}`,
        ...step.knowledgeCheck.options.map((option, index) => `${index + 1}. ${option}`),
        `Answer: ${step.knowledgeCheck.options[step.knowledgeCheck.correctIndex]}`,
        step.knowledgeCheck.explanation,
        ...evidenceLines(step.knowledgeCheck.evidence)
      ] : []),
      ""
    ]),
    "### Recruiter walkthrough",
    guide.presentationScript,
    "",
    `> ${guide.scopeNote}`,
    "",
    "## Evidence coverage",
    guide.evidenceCoverage.note,
    ...guide.evidenceCoverage.rows.flatMap((row) => [
      `### ${row.label} (${row.status.replaceAll("-", " ")})`,
      row.detail,
      ...evidenceLines(row.evidence),
      ""
    ]),
    "## Code flow",
    guide.workflow.note,
    ...guide.workflow.stages.flatMap((stage) => [
      `### ${stage.title} (${stage.state})`,
      stage.detail,
      ...evidenceLines(stage.evidence),
      ""
    ]),
    ...(guide.workflow.example ? [
      `### ${guide.workflow.example.title}`,
      guide.workflow.example.body,
      `\`${guide.workflow.example.snippet}\``,
      ...evidenceLines([guide.workflow.example.evidence]),
      ""
    ] : []),
    "## Change impact exploration",
    guide.changeImpact.note,
    ...guide.changeImpact.modules.flatMap((module) => [
      `### If ${module.name} changes`,
      ...(module.affected.length
        ? module.affected.flatMap((item) => [
            `- ${item.path.join(" -> ")} (${item.distance === 1 ? "direct importer" : `${item.distance} steps away`})`,
            ...evidenceLines(item.evidence)
          ])
        : ["- No reverse import path was confirmed in indexed source."]),
      ""
    ]),
    "## Infrastructure map",
    ...guide.infrastructure.flatMap((card) => [
      `### ${card.title} (${card.category})`,
      card.description,
      ...card.details.map((detail) => `- ${detail.label}: ${detail.value}${detail.evidence ? ` (${detail.evidence.path}:${detail.evidence.line})` : ""}`),
      ...evidenceLines(card.evidence),
      ""
    ]),
    "## Technology choices",
    ...guide.technologyChoices.flatMap((choice) => [
      `### ${choice.name}`,
      `Observed: ${choice.observed}`,
      `Role: ${choice.role}`,
      `Typical fit: ${choice.typicalFit}`,
      choice.projectRationale,
      ...evidenceLines(choice.evidence),
      ""
    ]),
    "## Recruiter interview practice",
    ...guide.interviewQuestions.flatMap((item) => [
      `### ${item.question}`,
      item.answer,
      ...evidenceLines(item.evidence),
      ...(item.followUp ? [`Follow-up: ${item.followUp}`] : []),
      ""
    ]),
    `> ${guide.interviewNote}`
  ].join("\n");

  if (session.comparison) {
    return `${session.analysis.reportMarkdown}\n\n${guideMarkdown}\n\n${session.comparison.reviewMarkdown}`;
  }

  return `${session.analysis.reportMarkdown}\n\n${guideMarkdown}`;
}

function verifyGitHubSignature(rawBody, signatureHeader, secret) {
  if (!secret) {
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signatureHeader);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

async function runAnalysisForSource(preparedSource) {
  const analysis = await analyzeCodebase(preparedSource.rootPath, {
    sourceName: preparedSource.sourceName,
    sourceType: preparedSource.sourceType,
    sourcePlatform: preparedSource.sourcePlatform
  });
  const insights = await generateInsights(analysis);

  return {
    analysis,
    insights
  };
}

function createApp() {
  const app = express();
  const upload = createUploadMiddleware();

  fs.mkdirSync(uploadRoot, { recursive: true });
  app.disable("x-powered-by");
  app.use(applySecurityHeaders);

  app.get(["/.well-known/security.txt", "/security.txt"], (_req, res) => {
    res.type("text/plain").send(`${buildSecurityTxt()}\n`);
  });

  app.post("/api/github/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET || "";
    const signature = req.headers["x-hub-signature-256"];

    if (!verifyGitHubSignature(req.body, signature, secret)) {
      return res.status(401).json({
        error: "Webhook signature validation failed."
      });
    }

    let payload;
    try {
      payload = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).json({
        error: "Webhook payload was not valid JSON."
      });
    }

    const eventName = req.headers["x-github-event"];
    const repository = payload.repository;

    if (!repository?.clone_url || !repository?.full_name) {
      return res.status(400).json({
        error: "Webhook payload is missing repository information."
      });
    }

    if (!["push", "pull_request"].includes(eventName)) {
      return res.status(202).json({
        status: "ignored"
      });
    }

    const ref = eventName === "push"
      ? (payload.ref || "").replace("refs/heads/", "")
      : payload.pull_request?.head?.ref || "";

    let preparedSource;

    try {
      preparedSource = await prepareSource({
        repoUrl: repository.clone_url,
        ref
      });

      const { analysis, insights } = await runAnalysisForSource(preparedSource);
      saveWorkspaceReport("github", repository.full_name, {
        repository: repository.full_name,
        ref,
        provider: "github",
        source: buildSourceMetadata(preparedSource),
        analysis: serializeAnalysis(analysis, insights)
      });
    } finally {
      if (preparedSource?.cleanup) {
        await preparedSource.cleanup();
      }
    }

    return res.status(202).json({
      status: "accepted",
      repository: repository.full_name,
      ref
    });
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use("/api", createRateLimit({ windowMs: 60_000, limit: 90 }));
  app.use(express.static(path.join(process.cwd(), "public")));
  app.use(
    "/vendor/mermaid",
    express.static(path.join(process.cwd(), "node_modules", "mermaid", "dist"))
  );
  app.use(
    "/vendor/tsparticles",
    express.static(path.join(process.cwd(), "node_modules", "tsparticles-slim"))
  );

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "lumenstack-ai",
      version: "1.0.0",
      uptimeSeconds: Math.round(process.uptime()),
      startedAt: serverStartedAt.toISOString(),
      checkedAt: new Date().toISOString()
    });
  });

  app.get("/api/product-signals", (_req, res) => {
    res.json({
      product: "LumenStack AI",
      liveUrl: publicBaseUrl,
      capabilities: [
        "repository intake",
        "ZIP analysis",
        "AI-free guided sample analysis",
        "beginner learning guide",
        "source-line citations",
        "evidence coverage labels",
        "change impact review",
        "architecture diagrams",
        "compare reviews",
        "codebase chat",
        "markdown and JSON exports"
      ],
      assurance: [
        "security headers",
        "rate limiting",
        "ZIP-only upload validation",
        "smoke audit",
        "site audit",
        "security audit"
      ]
    });
  });

  app.get("/api/platforms", (_req, res) => {
    res.json({
      providers: getSupportedSourcePlatforms()
    });
  });

  app.post("/api/auth/demo", (req, res) => {
    const name = normalizeShortText(req.body?.name, "Recruiter");
    res.json({
      user: {
        id: "demo-recruiter",
        name,
        role: "Recruiter demo viewer",
        owner: "Ujala Agarwal",
        email: "agarwalujala3@gmail.com"
      },
      token: "demo-recruiter-token"
    });
  });

  app.get("/api/projects", (req, res) => {
    const userId = String(req.query.userId || "demo-recruiter");
    res.json({
      projects: getSavedProjects(userId)
    });
  });

  app.post("/api/projects", (req, res) => {
    const userId = String(req.body?.userId || "demo-recruiter");
    const project = saveProject(userId, {
      ...req.body,
      name: normalizeShortText(req.body?.name, "Untitled architecture review"),
      repository: normalizeShortText(req.body?.repository, "unknown/repository")
    });
    res.status(201).json({
      project,
      projects: getSavedProjects(userId)
    });
  });

  app.get("/api/github/reports/:owner/:repo", (req, res) => {
    const report = getWebhookReport(`${req.params.owner}/${req.params.repo}`);

    if (!report) {
      return res.status(404).json({
        error: "No stored webhook report found for that repository."
      });
    }

    return res.json(report);
  });

  app.get("/api/workspaces/:provider/:owner/:repo", (req, res) => {
    const provider = String(req.params.provider || "").trim().toLowerCase();
    const repository = `${req.params.owner}/${req.params.repo}`;
    const report = getWorkspaceReport(provider, repository);

    if (!report) {
      return res.status(404).json({
        error: "No stored workspace report found for that repository."
      });
    }

    return res.json(report);
  });

  app.get("/api/analysis/:analysisId", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const session = getAnalysisSession(req.params.analysisId);

    if (!session) {
      return res.status(404).json({ error: "Analysis session not found. Run the repository analysis again." });
    }

    const files = session.analysis.sourceIndex || session.analysis.searchIndex || [];
    const directory = session.analysis.directoryIndex || files.map((file) => file.path);
    const previewByPath = new Map(files.map((file) => [file.path, file]));
    return res.json({
      source: session.source,
      analysisId: req.params.analysisId,
      summary: session.analysis.summary,
      explanation: session.insights?.explanation || "",
      learningGuide: buildLearningGuide(session.analysis),
      aiStatus: session.insights?.aiStatus || "fallback",
      analysis: serializeAnalysis(session.analysis, session.insights || {}),
      comparison: session.comparison || null,
      comparisonContext: session.baselineSource
        ? {
            baselineSource: session.baselineSource,
            baselineSummary: session.baselineAnalysis?.summary || null
          }
        : null,
      exportUrls: {
        markdown: `/api/export/${encodeURIComponent(req.params.analysisId)}?format=markdown`,
        json: `/api/export/${encodeURIComponent(req.params.analysisId)}?format=json`
      },
      modules: session.analysis.modules || [],
      files: directory.slice(0, 8000).map((filePath) => {
        const preview = previewByPath.get(filePath);
        return {
          path: filePath,
          module: preview?.module || "",
          language: preview?.language || "",
          role: preview?.role || "",
          previewable: Boolean(preview)
        };
      }),
      totalFiles: directory.length,
      indexedTextFiles: files.length,
      filesLimited: directory.length > 8000
    });
  });

  app.get("/api/analysis/:analysisId/file", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const session = getAnalysisSession(req.params.analysisId);

    if (!session) {
      return res.status(404).json({ error: "Analysis session not found. Run the repository analysis again." });
    }

    const requestedPath = String(req.query.path || "").replace(/\\/g, "/");
    const pathSegments = requestedPath.split("/");

    if (
      !requestedPath ||
      requestedPath.length > 1024 ||
      requestedPath.startsWith("/") ||
      requestedPath.includes("\0") ||
      pathSegments.includes("..")
    ) {
      return res.status(400).json({ error: "Choose a file from the analyzed repository." });
    }

    const file = (session.analysis.sourceIndex || session.analysis.searchIndex || []).find((entry) => entry.path === requestedPath);

    if (!file) {
      return res.status(404).json({ error: "That file is not part of this analyzed repository." });
    }

    return res.json({
      file: {
        path: file.path,
        module: file.module,
        language: file.language,
        role: file.role,
        content: file.content,
        truncated: file.content.length >= 12000
      }
    });
  });

  app.post("/api/demo-analysis", async (_req, res) => {
    try {
      const demoRoot = path.join(__dirname, "..", ".lumenstack-demo-repo");
      const analysis = await analyzeCodebase(demoRoot, {
        sourceName: "Atlas Catalog API",
        sourceType: "demo",
        sourcePlatform: "Guided sample"
      });
      const insights = buildFallbackDocumentation(analysis, {
        aiReason: "demo_sample",
        aiMessage: "Bundled sample repository; no external AI request was made."
      });
      const source = {
        name: analysis.summary.sourceName,
        type: "demo",
        platform: "Guided sample",
        platformId: "demo",
        workspaceLabel: "Atlas Catalog API · sample repository",
        workspaceKey: "demo:atlas-catalog-api",
        repoUrl: "",
        ref: "sample"
      };
      const analysisId = createAnalysisSession({ analysis, insights, source });

      res.setHeader("Cache-Control", "no-store");
      return res.json({
        analysisId,
        source,
        comparisonContext: null,
        analysis: serializeAnalysis(analysis, insights),
        comparison: null,
        exportUrls: {
          markdown: `/api/export/${analysisId}?format=markdown`,
          json: `/api/export/${analysisId}?format=json`
        }
      });
    } catch (error) {
      return res.status(500).json({ error: error.message || "The guided sample could not be loaded." });
    }
  });

  app.post(
    "/api/analyze",
    upload.fields([
      { name: "codebase", maxCount: 1 },
      { name: "baselineCodebase", maxCount: 1 }
    ]),
    async (req, res) => {
      let preparedSource;
      let baselineSource;

      try {
        const repoUrl = String(req.body.repoUrl || "").trim();
        const repoRef = String(req.body.repoRef || "").trim();
        const baselineRepoUrl = String(req.body.baselineRepoUrl || "").trim();
        const baselineRepoRef = String(req.body.baselineRepoRef || "").trim();
        const compareRequested = String(req.body.compareMode || "").trim() === "1";
        const uploadedFile = getUploadedFile(req.files, "codebase");
        const baselineFile = getUploadedFile(req.files, "baselineCodebase");

        if (!repoUrl && !uploadedFile) {
          return res.status(400).json({
            error: "Provide either a public repository URL or a ZIP file."
          });
        }

        preparedSource = await prepareSource({
          repoUrl,
          uploadedFile,
          ref: repoRef
        });

        const { analysis, insights } = await runAnalysisForSource(preparedSource);
        let comparison = null;
        let baselineAnalysis = null;
        let baselineMetadata = null;

        if (compareRequested || baselineRepoUrl || baselineRepoRef || baselineFile) {
          const effectiveBaselineRepoUrl = baselineRepoUrl || (baselineRepoRef && repoUrl ? repoUrl : "");

          if (!effectiveBaselineRepoUrl && !baselineFile) {
            return res.status(400).json({
              error: "Compare mode needs a baseline repository, baseline ZIP, or a baseline ref for the same repository."
            });
          }

          baselineSource = await prepareSource({
            repoUrl: effectiveBaselineRepoUrl,
            uploadedFile: baselineFile,
            ref: baselineRepoRef
          });

          const baselineResult = await runAnalysisForSource(baselineSource);
          baselineAnalysis = baselineResult.analysis;
          comparison = compareAnalyses(baselineAnalysis, analysis);
          baselineMetadata = buildSourceMetadata(baselineSource);
        }

        const analysisId = createAnalysisSession({
          analysis,
          insights,
          baselineAnalysis,
          baselineSource: baselineMetadata,
          comparison,
          source: buildSourceMetadata(preparedSource)
        });

        res.json({
          analysisId,
          source: buildSourceMetadata(preparedSource),
          comparisonContext: comparison
            ? {
                baselineSource: baselineMetadata,
                baselineSummary: baselineAnalysis.summary
              }
            : null,
          analysis: serializeAnalysis(analysis, insights),
          comparison,
          exportUrls: {
            markdown: `/api/export/${analysisId}?format=markdown`,
            json: `/api/export/${analysisId}?format=json`
          }
        });
      } catch (error) {
        res.status(500).json({
          error: error.message || "Analysis failed."
        });
      } finally {
        if (preparedSource?.cleanup) {
          await preparedSource.cleanup();
        }

        if (baselineSource?.cleanup) {
          await baselineSource.cleanup();
        }
      }
    }
  );

  app.post("/api/chat", async (req, res) => {
    const analysisId = String(req.body.analysisId || "").trim();
    const question = String(req.body.question || "").trim();
    const { normalizedQuestion } = normalizeUserQuestion(question);

    if (!analysisId || !normalizedQuestion) {
      return res.status(400).json({
        error: "analysisId and question are required."
      });
    }

    const session = getAnalysisSession(analysisId);

    if (!session) {
      return res.status(404).json({
        error: "Analysis session not found."
      });
    }

    try {
      const answer = await answerQuestion(session.analysis, normalizedQuestion);
      res.json(answer);
    } catch (error) {
      res.status(500).json({
        error: error.message || "Unable to answer the question."
      });
    }
  });

  app.post("/api/chat/stream", async (req, res) => {
    const analysis = req.body?.analysis;

    if (!analysis) {
      return res.status(400).send("analysis is required.");
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    try {
      await generateStreamingInsights(analysis, (token) => {
        res.write(token);
      });
    } catch {
      res.write("\n\n[System: Error processing stream]");
    } finally {
      res.end();
    }
  });

  app.post("/api/system-chat", async (req, res) => {
    const question = String(req.body.question || "").trim();
    const { normalizedQuestion, originalQuestion } = normalizeUserQuestion(question);
    const analysisId = String(req.body.analysisId || "").trim();

    if (!normalizedQuestion) {
      return res.status(400).json({
        error: "question is required."
      });
    }

    const session = analysisId ? getAnalysisSession(analysisId) : null;

    try {
      const answer = await answerSystemQuestion({
        question: normalizedQuestion,
        originalQuestion,
        analysisSummary: session?.analysis?.summary || null
      });
      return res.json(answer);
    } catch (error) {
      return res.status(500).json({
        error: error.message || "Unable to answer the system question."
      });
    }
  });

  app.get("/api/export/:analysisId", (req, res) => {
    const session = getAnalysisSession(req.params.analysisId);

    if (!session) {
      return res.status(404).json({
        error: "Analysis session not found."
      });
    }

    const format = String(req.query.format || "markdown");

    if (format === "json") {
      return res.json({
        source: session.source,
        analysis: serializeAnalysis(session.analysis, session.insights || {}),
        comparison: session.comparison || null
      });
    }

    res.type("text/markdown");
    return res.send(buildExportMarkdown(session));
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError || /zip|upload|file/i.test(error.message || "")) {
      return res.status(400).json({
        error: error.message || "Upload failed."
      });
    }

    return res.status(500).json({
      error: "Unexpected server error."
    });
  });

  return app;
}

module.exports = {
  createApp
};
