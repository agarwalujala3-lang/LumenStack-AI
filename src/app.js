const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { prepareSource, getSupportedSourcePlatforms } = require("./services/sourceService");
const { analyzeCodebase } = require("./services/analyzerService");
const { generateInsights } = require("./services/aiService");
const { compareAnalyses } = require("./services/comparisonService");
const { answerQuestion } = require("./services/chatService");
const { answerSystemQuestion } = require("./services/systemChatService");
const {
  createAnalysisSession,
  getAnalysisSession,
  getWebhookReport,
  saveWorkspaceReport,
  getWorkspaceReport
} = require("./services/sessionStore");

const uploadRoot = path.join(process.cwd(), ".runtime", "incoming");

function createUploadMiddleware() {
  return multer({
    dest: uploadRoot,
    limits: {
      fileSize: 50 * 1024 * 1024
    }
  });
}

function getUploadedFile(files, fieldName) {
  return files?.[fieldName]?.[0] || null;
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
    repoUrl: preparedSource.sourceRepoUrl || "",
    ref: preparedSource.sourceRef || ""
  };
}

function buildExportMarkdown(session) {
  if (session.comparison) {
    return `${session.analysis.reportMarkdown}\n\n${session.comparison.reviewMarkdown}`;
  }

  return session.analysis.reportMarkdown;
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

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(process.cwd(), "public")));
  app.use(
    "/vendor/mermaid",
    express.static(path.join(process.cwd(), "node_modules", "mermaid", "dist"))
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/platforms", (_req, res) => {
    res.json({
      providers: getSupportedSourcePlatforms()
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
          baselineAnalysis,
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

    if (!analysisId || !question) {
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
      const answer = await answerQuestion(session.analysis, question);
      res.json(answer);
    } catch (error) {
      res.status(500).json({
        error: error.message || "Unable to answer the question."
      });
    }
  });

  app.post("/api/system-chat", async (req, res) => {
    const question = String(req.body.question || "").trim();
    const analysisId = String(req.body.analysisId || "").trim();

    if (!question) {
      return res.status(400).json({
        error: "question is required."
      });
    }

    const session = analysisId ? getAnalysisSession(analysisId) : null;

    try {
      const answer = await answerSystemQuestion({
        question,
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
        analysis: session.analysis,
        comparison: session.comparison || null
      });
    }

    res.type("text/markdown");
    return res.send(buildExportMarkdown(session));
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
  });

  return app;
}

module.exports = {
  createApp
};
