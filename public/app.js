const body = document.body;
const overlay = document.getElementById("analysis-overlay");
const overlayStatus = document.getElementById("overlay-status");
const scrollProgressBar = document.getElementById("scroll-progress-bar");
const ambientParticles = document.getElementById("ambient-particles");
const cursorTrail = document.getElementById("cursor-trail");
const promptRotator = document.getElementById("prompt-rotator");
const promptCycler = promptRotator?.closest(".prompt-cycler");
const form = document.getElementById("analyze-form");
const clearButton = document.getElementById("clear-form");
const compareToggle = document.getElementById("compare-toggle");
const compareFields = document.getElementById("compare-fields");
const repoUrlInput = document.getElementById("repo-url");
const baselineRepoUrlInput = document.getElementById("baseline-repo-url");
const repoUrlLabelElement = document.getElementById("repo-url-label");
const baselineRepoUrlLabelElement = document.getElementById("baseline-repo-url-label");
const providerHintElement = document.getElementById("provider-hint");
const workspaceFocusTitleElement = document.getElementById("workspace-focus-title");
const workspaceFocusBadgeElement = document.getElementById("workspace-focus-badge");
const workspaceFocusCopyElement = document.getElementById("workspace-focus-copy");
const workspaceFocusTagsElement = document.getElementById("workspace-focus-tags");
const uploadInput = document.getElementById("upload-input");
const baselineUploadInput = document.getElementById("baseline-upload-input");
const uploadCaption = document.getElementById("upload-caption");
const baselineUploadCaption = document.getElementById("baseline-upload-caption");
const dropzone = document.getElementById("dropzone");
const baselineDropzone = document.getElementById("baseline-dropzone");
const statusPanel = document.getElementById("status");
const statusText = statusPanel.querySelector("p");
const liveMetricsRibbonElement = document.getElementById("live-metrics-ribbon");
const metricsEngineStateElement = document.getElementById("metrics-engine-state");
const metricsSourceStateElement = document.getElementById("metrics-source-state");
const metricsThroughputElement = document.getElementById("metrics-throughput");
const metricsLatencyElement = document.getElementById("metrics-latency");
const metricsModuleCountElement = document.getElementById("metrics-module-count");
const metricsConfidenceElement = document.getElementById("metrics-confidence");
const resultsElement = document.getElementById("results");
let activePracticeTimer = null;
const resultTitleElement = document.getElementById("result-title");
const sourcePillElement = document.getElementById("source-pill");
const analysisTimeElement = document.getElementById("analysis-time");
const primaryLanguageElement = document.getElementById("primary-language");
const codeFilesElement = document.getElementById("code-files");
const dependencyCountElement = document.getElementById("dependency-count");
const moduleCountElement = document.getElementById("module-count");
const relationshipCountElement = document.getElementById("relationship-count");
const qualityScoreElement = document.getElementById("quality-score");
const explanationElement = document.getElementById("explanation");
const documentationElement = document.getElementById("documentation");
const frameworksElement = document.getElementById("frameworks");
const entrypointsElement = document.getElementById("entrypoints");
const languagesElement = document.getElementById("languages");
const findingsElement = document.getElementById("findings");
const hotspotsElement = document.getElementById("hotspots");
const qualitySummaryElement = document.getElementById("quality-summary");
const modulesElement = document.getElementById("modules");
const dependenciesElement = document.getElementById("dependencies");
const relationshipsElement = document.getElementById("relationships");
const filesElement = document.getElementById("files");
const sourceProfileElement = document.getElementById("source-profile");
const platformSignalsElement = document.getElementById("platform-signals");
const diagramElement = document.getElementById("diagram");
const aiBadgeElement = document.getElementById("ai-badge");
const copyMermaidButton = document.getElementById("copy-mermaid");
const copyDocsButton = document.getElementById("copy-docs");
const downloadReportButton = document.getElementById("download-report");
const downloadJsonButton = document.getElementById("download-json");
const zoomOutDiagramButton = document.getElementById("zoom-out-diagram");
const zoomResetDiagramButton = document.getElementById("zoom-reset-diagram");
const zoomInDiagramButton = document.getElementById("zoom-in-diagram");
const diagramTabs = [...document.querySelectorAll("[data-diagram]")];
const comparisonPanel = document.getElementById("comparison-panel");
const comparisonSummaryElement = document.getElementById("comparison-summary");
const comparisonStatsElement = document.getElementById("comparison-stats");
const comparisonFindingsElement = document.getElementById("comparison-findings");
const chatForm = document.getElementById("chat-form");
const chatQuestionInput = document.getElementById("chat-question");
const chatMessagesElement = document.getElementById("chat-messages");
const topChatForm = document.getElementById("device-top-chat-form");
const topChatInput = document.getElementById("device-top-chat-input");
const topChatAnswerElement = document.getElementById("device-top-chat-answer");
const dimensionLiveOutputElement = document.getElementById("dimension-live-output");
const heroDeviceCluster = document.querySelector(".hero-device-cluster");
const heroDeviceCards = heroDeviceCluster
  ? [...heroDeviceCluster.querySelectorAll(".device-shell")]
  : [];
const heroDeviceTimeElement = document.getElementById("device-top-time");
const heroDeviceStepElement = document.getElementById("device-step-indicator");

let analysisId = "";
let analysisGeneration = 0;
let exportUrls = null;
let currentDiagrams = {};
let currentDiagramKey = "architecture";
let currentDiagramZoom = 1;
let lastDocumentation = "";
let overlayTimer = 0;
let overlayMessageTimer = 0;
let motionObserver = null;
let promptTimer = 0;
let heroSliderTimer = 0;
let heroClockTimer = 0;
let metricsTickerTimer = 0;
let dimensionLiveTimer = 0;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
let currentTheme = "light";
const metricsState = {
  engine: "Standby",
  source: "Awaiting repository",
  throughput: 0,
  latency: 0,
  modules: 0,
  confidence: 85
};

function bindMediaQueryChange(query, listener) {
  if (!query || typeof listener !== "function") {
    return () => {};
  }

  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }

  if (typeof query.addListener === "function") {
    query.addListener(listener);
    return () => query.removeListener(listener);
  }

  return () => {};
}

const contentStreams = [explanationElement, documentationElement, diagramElement];
const loadingMessages = [
  "Reading directory structure, imports, and dependency signatures.",
  "Tracing module edges and surfacing architectural pressure points.",
  "Opening diagram windows and preparing interactive codebase memory.",
  "Scoring quality signals and building a stakeholder-ready architecture brief."
];
const rotatingPrompts = [
  "Which files look risky first?",
  "Where does routing or request flow begin?",
  "Which module carries the most architectural pressure?",
  "What changed most between the baseline and the latest version?"
];
const workspacePresets = {
  universal: {
    title: "Universal intake workspace",
    badge: "Cross-platform",
    copy:
      "Bring a GitHub, GitLab, Bitbucket, Azure DevOps, Gitea, generic HTTPS Git repo, or a ZIP archive. Use workspace presets to bias the form toward review, delivery, migration, or offline exploration.",
    tags: ["GitHub", "GitLab", "Bitbucket", "Azure DevOps", "ZIP Upload"],
    repoLabel: "Public repository URL",
    baselineLabel: "Baseline repository URL",
    repoPlaceholder: "https://github.com/owner/repo or https://gitlab.com/group/project",
    baselinePlaceholder: "https://github.com/owner/repo or https://gitlab.com/group/project",
    providerHint:
      "Supports GitHub, GitLab, Bitbucket, Azure DevOps, Gitea, and generic HTTPS Git remotes.",
    compareByDefault: false,
    status: "Waiting for a repository, ZIP upload, or compare baseline."
  },
  "github-review": {
    title: "GitHub review workspace",
    badge: "GitHub PR flow",
    copy:
      "Bias the app toward architecture review, baseline comparison, and webhook-friendly GitHub repository analysis.",
    tags: ["GitHub", "Compare Mode", "Webhook Ready", "PR Review"],
    repoLabel: "Public GitHub repository URL",
    baselineLabel: "Baseline GitHub repository URL",
    repoPlaceholder: "https://github.com/owner/repo",
    baselinePlaceholder: "https://github.com/owner/repo",
    providerHint: "Best for pull-request reviews, compare mode, and GitHub webhook-backed reporting.",
    compareByDefault: true,
    status: "GitHub review workspace loaded. Add a repository URL or ZIP and compare against a baseline if needed."
  },
  "gitlab-delivery": {
    title: "GitLab delivery workspace",
    badge: "GitLab flow",
    copy:
      "Focus on GitLab repositories and delivery visibility, especially CI/CD, release, and pipeline-related signals.",
    tags: ["GitLab", "CI/CD", "Release Readiness", "Delivery"],
    repoLabel: "Public GitLab repository URL",
    baselineLabel: "Baseline GitLab repository URL",
    repoPlaceholder: "https://gitlab.com/group/project",
    baselinePlaceholder: "https://gitlab.com/group/project",
    providerHint: "Useful for GitLab projects where pipeline presence and delivery metadata matter as much as code structure.",
    compareByDefault: false,
    status: "GitLab delivery workspace loaded. Add a GitLab repository URL or ZIP to inspect code and pipeline signals together."
  },
  "bitbucket-audit": {
    title: "Bitbucket audit workspace",
    badge: "Bitbucket audit",
    copy:
      "Turn Bitbucket repositories into delivery and dependency audits with structural risk, pipeline, and ownership clues in one view.",
    tags: ["Bitbucket", "Audit", "Dependencies", "Ownership"],
    repoLabel: "Public Bitbucket repository URL",
    baselineLabel: "Baseline Bitbucket repository URL",
    repoPlaceholder: "https://bitbucket.org/workspace/repo",
    baselinePlaceholder: "https://bitbucket.org/workspace/repo",
    providerHint: "Good for delivery audits, dependency checks, and platform-signal reviews on Bitbucket-hosted code.",
    compareByDefault: false,
    status: "Bitbucket audit workspace loaded. Add a Bitbucket URL or ZIP to start the audit flow."
  },
  "azure-migration": {
    title: "Azure migration workspace",
    badge: "Migration lens",
    copy:
      "Use this workspace when the repo lives in Azure DevOps and you want a migration-minded architecture brief with delivery context.",
    tags: ["Azure DevOps", "Migration", "Pipelines", "Review"],
    repoLabel: "Azure DevOps repository URL",
    baselineLabel: "Baseline Azure DevOps repository URL",
    repoPlaceholder: "https://dev.azure.com/org/project/_git/repo",
    baselinePlaceholder: "https://dev.azure.com/org/project/_git/repo",
    providerHint: "Useful for Azure DevOps projects that need architecture clarity before migration or platform changes.",
    compareByDefault: true,
    status: "Azure migration workspace loaded. Add a repository URL and optional baseline to compare current structure before migration."
  },
  "offline-zip": {
    title: "Offline ZIP workspace",
    badge: "Archive-only",
    copy:
      "Skip the remote clone flow and work directly from uploaded ZIP archives. This is useful for air-gapped demos and private snapshots.",
    tags: ["ZIP Upload", "Offline", "Air-gapped", "Snapshot Review"],
    repoLabel: "Optional repository URL",
    baselineLabel: "Optional baseline repository URL",
    repoPlaceholder: "Leave blank and upload a ZIP below",
    baselinePlaceholder: "Leave blank and upload a baseline ZIP below",
    providerHint: "Best when you want local or private archive analysis without depending on a remote Git host.",
    compareByDefault: false,
    status: "Offline ZIP workspace loaded. Upload a primary archive to begin."
  }
};

function configureMermaid(theme) {
  if (!window.mermaid) {
    return;
  }

  const isDark = theme === "dark";
  window.mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "strict",
    flowchart: {
      htmlLabels: false,
      curve: "linear",
      nodeSpacing: 38,
      rankSpacing: 46,
      useMaxWidth: false
    },
    sequence: {
      mirrorActors: false,
      actorMargin: 34,
      messageMargin: 24
    },
    themeVariables: isDark
      ? {
          primaryColor: "#10313b",
          primaryTextColor: "#e9f4f5",
          primaryBorderColor: "#52d6e5",
          lineColor: "#71c9d4",
          secondaryColor: "#102633",
          tertiaryColor: "#172a34",
          background: "#081720",
          mainBkg: "#10313b",
          fontFamily: "Inter, Segoe UI, sans-serif"
        }
      : {
          primaryColor: "#e3f4f5",
          primaryTextColor: "#172a34",
          primaryBorderColor: "#087f9b",
          lineColor: "#27889a",
          secondaryColor: "#f6fafb",
          tertiaryColor: "#e9eff2",
          background: "#f7fafc",
          mainBkg: "#e3f4f5",
          fontFamily: "Inter, Segoe UI, sans-serif"
        }
  });
}

function sanitize(value) {
  return String(value ?? "");
}

async function parseJsonResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const snippet = text ? text.slice(0, 120).replace(/\s+/g, " ").trim() : "";
    const message = fallbackMessage || "Server returned a non-JSON response.";
    throw new Error(snippet ? `${message} (${snippet})` : message);
  }

  return response.json();
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function isTransientRequestError(error) {
  const status = Number(error?.responseStatus || 0);
  const message = String(error?.message || "").toLowerCase();

  if (!status) {
    return true;
  }

  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  return (
    message.includes("non-json") ||
    message.includes("doctype") ||
    message.includes("unexpected response") ||
    message.includes("failed to fetch") ||
    message.includes("bad gateway")
  );
}

async function requestJsonWithRetry(url, fetchOptions, requestOptions = {}) {
  const {
    retries = 2,
    retryDelayMs = 1300,
    fallbackMessage = "Request failed.",
    onRetry = null
  } = requestOptions;

  let attempt = 0;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, fetchOptions);
      const payload = await parseJsonResponse(response, fallbackMessage);

      if (!response.ok) {
        const requestError = new Error(payload.error || `${fallbackMessage} (HTTP ${response.status}).`);
        requestError.responseStatus = response.status;
        throw requestError;
      }

      return payload;
    } catch (error) {
      if (attempt >= retries || !isTransientRequestError(error)) {
        throw error;
      }

      const waitMs = retryDelayMs * (attempt + 1);
      if (typeof onRetry === "function") {
        onRetry({
          attempt: attempt + 1,
          retries,
          waitMs,
          error
        });
      }

      await sleep(waitMs);
      attempt += 1;
    }
  }

  throw new Error(fallbackMessage);
}

function normalizeRequestError(error, actionLabel = "Request") {
  const message = sanitize(error?.message || `${actionLabel} failed.`);
  const lowered = message.toLowerCase();

  if (
    lowered.includes("doctype") ||
    lowered.includes("non-json response") ||
    lowered.includes("unexpected response") ||
    lowered.includes("bad gateway") ||
    lowered.includes("failed to fetch")
  ) {
    return `${actionLabel} temporarily unavailable while the service wakes up. Please wait a few seconds and retry.`;
  }

  return message;
}

function clearChildren(element) {
  element.replaceChildren();
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = sanitize(text);
  }

  return element;
}

function summarizePath(pathValue, options = {}) {
  const value = sanitize(pathValue || "");
  const maxLength = options.maxLength || 58;
  const segments = value.split("/").filter(Boolean);

  if (value.length <= maxLength || segments.length <= 3) {
    return value;
  }

  const headCount = options.headCount || 2;
  const tailCount = options.tailCount || 2;
  const head = segments.slice(0, headCount);
  const tail = segments.slice(-tailCount);
  const compact = [...head, "...", ...tail].join("/");

  if (compact.length <= maxLength) {
    return compact;
  }

  const fileName = segments.at(-1) || value;
  const parentName = segments.at(-2);
  return parentName ? `.../${parentName}/${fileName}` : `.../${fileName}`;
}

function createPathTitle(pathValue, className = "file-path-title") {
  const element = createElement("strong", className, summarizePath(pathValue));
  element.title = sanitize(pathValue);
  element.setAttribute("aria-label", sanitize(pathValue));
  return element;
}

function buildExplorerUrl(filePath, line = null) {
  const params = new URLSearchParams();
  if (analysisId) params.set("analysisId", analysisId);
  params.set("path", filePath);
  if (Number.isInteger(line) && line > 0) params.set("line", String(line));
  return `/explorer.html?${params.toString()}`;
}

function summarizeSignalDetail(signal) {
  const detail = sanitize(signal?.detail || "");

  if (!signal?.evidence?.length) {
    return detail;
  }

  return detail
    .replace(/\s+in\s+.+\.$/, ".")
    .replace(/\s+via\s+.+\.$/, ".")
    .replace(/\s+from\s+.+\.$/, ".")
    .replace(/\s+at\s+.+\.$/, ".");
}

function createEvidenceList(paths = []) {
  const wrapper = createElement("div", "evidence-chip-row");
  wrapper.appendChild(createElement("span", "file-meta-label", "Evidence"));

  for (const pathValue of paths.slice(0, 4)) {
    const chip = createElement("span", "evidence-chip", summarizePath(pathValue, { maxLength: 34, headCount: 1, tailCount: 2 }));
    chip.title = sanitize(pathValue);
    wrapper.appendChild(chip);
  }

  if (paths.length > 4) {
    wrapper.appendChild(createElement("span", "evidence-chip muted", `+${paths.length - 4} more`));
  }

  return wrapper;
}

function formatImportPreview(imports, limit = 4) {
  if (!imports?.length) {
    return "none detected";
  }

  const preview = imports.slice(0, limit).join(", ");
  const remainingCount = imports.length - limit;
  return remainingCount > 0 ? `${preview}, +${remainingCount} more` : preview;
}

function renderChipRow(element, values) {
  if (!element) {
    return;
  }

  clearChildren(element);

  for (const value of values) {
    element.appendChild(createElement("span", "chip", value));
  }
}

function getWorkspacePreset(key) {
  return workspacePresets[key] || workspacePresets.universal;
}

let activeWorkspaceKey = "universal";

function setStatus(message, state = "idle") {
  statusPanel.dataset.state = state;
  statusText.textContent = sanitize(message);
}

function updateMetricsRibbon(patch = {}) {
  Object.assign(metricsState, patch);

  if (metricsEngineStateElement) {
    metricsEngineStateElement.textContent = sanitize(metricsState.engine);
  }

  if (liveMetricsRibbonElement) {
    const engineState = sanitize(metricsState.engine || "standby")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "standby";

    liveMetricsRibbonElement.dataset.engine = engineState;
  }

  if (metricsSourceStateElement) {
    metricsSourceStateElement.textContent = sanitize(metricsState.source);
    metricsSourceStateElement.title = sanitize(metricsState.source);
  }

  if (metricsThroughputElement) {
    metricsThroughputElement.textContent = `${Math.max(0, Math.round(Number(metricsState.throughput) || 0))} files/min`;
  }

  if (metricsLatencyElement) {
    metricsLatencyElement.textContent = `${Math.max(0, Math.round(Number(metricsState.latency) || 0))} ms`;
  }

  if (metricsModuleCountElement) {
    metricsModuleCountElement.textContent = `${Math.max(0, Math.round(Number(metricsState.modules) || 0))}`;
  }

  if (metricsConfidenceElement) {
    const confidence = Math.max(0, Math.min(99, Math.round(Number(metricsState.confidence) || 0)));
    metricsConfidenceElement.textContent = `${confidence}%`;
  }
}

function stopMetricsTicker() {
  if (metricsTickerTimer) {
    window.clearInterval(metricsTickerTimer);
    metricsTickerTimer = 0;
  }

  if (liveMetricsRibbonElement) {
    liveMetricsRibbonElement.classList.remove("is-live");
  }
}

function startMetricsTicker() {
  if (prefersReducedMotion || !liveMetricsRibbonElement) {
    return;
  }

  stopMetricsTicker();

  if (liveMetricsRibbonElement) {
    liveMetricsRibbonElement.classList.add("is-live");
  }

  metricsTickerTimer = window.setInterval(() => {
    const nextThroughput = Math.min(640, (Number(metricsState.throughput) || 0) + 8 + Math.random() * 22);
    const nextLatency = Math.max(72, (Number(metricsState.latency) || 0) + (Math.random() * 48 - 22));
    const nextConfidence = Math.max(78, Math.min(97, (Number(metricsState.confidence) || 0) + (Math.random() * 4 - 1.5)));

    updateMetricsRibbon({
      throughput: nextThroughput,
      latency: nextLatency,
      confidence: nextConfidence
    });
  }, 980);
}

function getAiFallbackLabel(reason) {
  if (reason === "quota") {
    return "Fallback (Quota)";
  }

  if (reason === "auth") {
    return "Fallback (Auth)";
  }

  if (reason === "missing_key") {
    return "Fallback (No Key)";
  }

  return "Fallback";
}

function getAiFallbackStatus(scopeLabel, payload = {}) {
  const reason = String(payload.aiReason || "");
  const aiMessage = String(payload.aiMessage || "").trim();

  if (aiMessage) {
    return aiMessage;
  }

  if (reason === "quota") {
    return `${scopeLabel} answered from local context because OpenAI quota is currently exhausted.`;
  }

  if (reason === "auth") {
    return `${scopeLabel} answered from local context because OpenAI authentication failed.`;
  }

  if (reason === "missing_key") {
    return `${scopeLabel} answered from local context because OPENAI_API_KEY is not configured.`;
  }

  return `${scopeLabel} answered from local indexed context.`;
}

function setHeroDeviceStep(index) {
  if (!heroDeviceStepElement) {
    return;
  }

  const total = Math.max(heroDeviceCards.length, 1);
  const normalized = Math.max(0, Math.min(index, total - 1));
  heroDeviceStepElement.textContent = `${normalized + 1}/${total}`;
}

function updateHeroDeviceClock() {
  if (!heroDeviceTimeElement) {
    return;
  }

  heroDeviceTimeElement.textContent = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

function getHeroDeviceActiveIndex() {
  if (!heroDeviceCluster || !heroDeviceCards.length) {
    return 0;
  }

  const width = Math.max(heroDeviceCluster.clientWidth, 1);
  const rawIndex = Math.round(heroDeviceCluster.scrollLeft / width);
  return Math.max(0, Math.min(rawIndex, heroDeviceCards.length - 1));
}

function scrollHeroDeviceTo(index, behavior = "smooth") {
  if (!heroDeviceCluster || !heroDeviceCards.length) {
    return;
  }

  const safeIndex = Math.max(0, Math.min(index, heroDeviceCards.length - 1));
  heroDeviceCluster.scrollTo({
    left: safeIndex * heroDeviceCluster.clientWidth,
    behavior
  });
  setHeroDeviceStep(safeIndex);
}

function stopHeroSlider() {
  if (heroSliderTimer) {
    window.clearInterval(heroSliderTimer);
    heroSliderTimer = 0;
  }
}

function startHeroSlider(isSliderMode) {
  stopHeroSlider();

  if (!isSliderMode || prefersReducedMotion || heroDeviceCards.length < 2) {
    return;
  }

  if (document.activeElement && heroDeviceCluster?.contains(document.activeElement)) {
    return;
  }

  heroSliderTimer = window.setInterval(() => {
    const nextIndex = (getHeroDeviceActiveIndex() + 1) % heroDeviceCards.length;
    scrollHeroDeviceTo(nextIndex);
  }, 4800);
}

function setupHeroDeviceSlider() {
  if (!heroDeviceCluster || !heroDeviceCards.length) {
    return;
  }

  const sliderQuery = window.matchMedia("(max-width: 980px)");
  let rafId = 0;

  updateHeroDeviceClock();
  setHeroDeviceStep(0);

  if (heroClockTimer) {
    window.clearInterval(heroClockTimer);
  }
  heroClockTimer = window.setInterval(updateHeroDeviceClock, 30000);

  const syncSliderMode = () => {
    const sliderMode = sliderQuery.matches;
    heroDeviceCluster.classList.toggle("is-slider", sliderMode);

    if (!sliderMode) {
      stopHeroSlider();
      heroDeviceCluster.scrollTo({ left: 0, behavior: "auto" });
      setHeroDeviceStep(0);
      return;
    }

    setHeroDeviceStep(getHeroDeviceActiveIndex());
    startHeroSlider(true);
  };

  heroDeviceCluster.addEventListener("scroll", () => {
    if (!sliderQuery.matches) {
      return;
    }

    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }

    rafId = window.requestAnimationFrame(() => {
      setHeroDeviceStep(getHeroDeviceActiveIndex());
    });
  }, { passive: true });

  heroDeviceCluster.addEventListener("pointerdown", () => {
    stopHeroSlider();
  }, { passive: true });

  heroDeviceCluster.addEventListener("pointerup", () => {
    startHeroSlider(sliderQuery.matches);
  }, { passive: true });

  heroDeviceCluster.addEventListener("focusin", () => {
    stopHeroSlider();
  });

  heroDeviceCluster.addEventListener("focusout", () => {
    window.setTimeout(() => startHeroSlider(sliderQuery.matches), 120);
  });

  bindMediaQueryChange(sliderQuery, () => {
    syncSliderMode();
  });

  window.addEventListener("resize", () => {
    if (sliderQuery.matches) {
      setHeroDeviceStep(getHeroDeviceActiveIndex());
      return;
    }

    syncSliderMode();
  });

  syncSliderMode();
}

function setTopChatAnswer(message, state = "idle") {
  if (!topChatAnswerElement) {
    return;
  }

  topChatAnswerElement.textContent = sanitize(message);
  topChatAnswerElement.dataset.state = state;
}

function applyWorkspacePreset(key) {
  const normalizedKey = workspacePresets[key] ? key : "universal";
  const preset = getWorkspacePreset(normalizedKey);
  activeWorkspaceKey = normalizedKey;

  if (workspaceFocusTitleElement) {
    workspaceFocusTitleElement.textContent = preset.title;
  }

  if (workspaceFocusBadgeElement) {
    workspaceFocusBadgeElement.textContent = preset.badge;
  }

  if (workspaceFocusCopyElement) {
    workspaceFocusCopyElement.textContent = preset.copy;
  }

  renderChipRow(workspaceFocusTagsElement, preset.tags);

  if (repoUrlLabelElement) {
    repoUrlLabelElement.textContent = preset.repoLabel;
  }

  if (baselineRepoUrlLabelElement) {
    baselineRepoUrlLabelElement.textContent = preset.baselineLabel;
  }

  if (repoUrlInput) {
    repoUrlInput.placeholder = preset.repoPlaceholder;
  }

  if (baselineRepoUrlInput) {
    baselineRepoUrlInput.placeholder = preset.baselinePlaceholder;
  }

  if (providerHintElement) {
    providerHintElement.textContent = preset.providerHint;
  }

  compareToggle.checked = Boolean(preset.compareByDefault);
  compareFields.classList.toggle("hidden", !compareToggle.checked);
  setStatus(preset.status, "idle");
}

function applyWorkspacePresetFromLocation() {
  const params = new URLSearchParams(window.location.search);
  applyWorkspacePreset(params.get("workspace") || "universal");
}

function formatTime() {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date());
}

function setFileCaption(input, captionElement, emptyLabel) {
  const fileName = input.files?.[0]?.name;
  captionElement.textContent = fileName ? `Selected: ${fileName}` : emptyLabel;
}


function animateCount(element, value) {
  const targetValue = Number(value || 0);

  if (prefersReducedMotion) {
    element.textContent = String(targetValue);
    return;
  }

  const duration = 760;
  const start = performance.now();

  function step(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(targetValue * eased);
    element.textContent = String(current);

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  }

  window.requestAnimationFrame(step);
}

function cycleOverlayMessages() {
  if (prefersReducedMotion) {
    return;
  }

  window.clearInterval(overlayMessageTimer);
  let index = Math.floor(Math.random() * loadingMessages.length);

  overlayMessageTimer = window.setInterval(() => {
    index = (index + 1) % loadingMessages.length;
    overlayStatus.textContent = sanitize(loadingMessages[index]);
  }, 1600);
}

function showOverlay(message) {
  window.clearTimeout(overlayTimer);
  overlayStatus.textContent = sanitize(message);
  body.classList.add("analysis-active");
  overlay.classList.remove("is-opening");
  overlay.classList.add("is-active");
  cycleOverlayMessages();
}

function hideOverlay(message = "") {
  window.clearInterval(overlayMessageTimer);

  if (message) {
    overlayStatus.textContent = sanitize(message);
  }

  overlay.classList.add("is-opening");
  overlayTimer = window.setTimeout(() => {
    overlay.classList.remove("is-active", "is-opening");
    body.classList.remove("analysis-active");
  }, 820);
}

function animateStream(element) {
  element.classList.remove("is-live");
  void element.offsetWidth;
  element.classList.add("is-live");
}

function setupDropzone(dropzoneElement, inputElement, captionElement, emptyLabel) {
  inputElement.addEventListener("change", () => {
    setFileCaption(inputElement, captionElement, emptyLabel);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzoneElement.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzoneElement.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzoneElement.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzoneElement.classList.remove("dragover");
    });
  });

  dropzoneElement.addEventListener("drop", (event) => {
    if (!event.dataTransfer?.files?.length) {
      return;
    }

    inputElement.files = event.dataTransfer.files;
    setFileCaption(inputElement, captionElement, emptyLabel);
  });
}

function setupMotionObserver() {
  if (prefersReducedMotion) {
    document.querySelectorAll(".motion-target, .reveal-grid > *").forEach((target) => {
      target.classList.add("is-visible");
    });
    return;
  }

  body.classList.add("js-motion");

  motionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        motionObserver.unobserve(entry.target);
      }
    }
  }, {
    threshold: 0.14
  });

  refreshMotionTargets(document);
}

function refreshMotionTargets(root) {
  const targets = root.querySelectorAll(".motion-target, .reveal-grid > *");

  targets.forEach((target, index) => {
    if (!motionObserver) {
      target.classList.add("is-visible");
      return;
    }

    if (target.dataset.motionBound) {
      return;
    }

    target.dataset.motionBound = "true";
    target.style.transitionDelay = `${Math.min(index * 48, 360)}ms`;
    motionObserver.observe(target);
  });
}

function setupScrollProgress() {
  if (!scrollProgressBar) {
    return;
  }

  function update() {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
    scrollProgressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

function setupAmbientParticles() {
  if (!ambientParticles || prefersReducedMotion) {
    return;
  }

  clearChildren(ambientParticles);

  for (let index = 0; index < 18; index += 1) {
    const particle = createElement("span", "ambient-particle");
    particle.style.left = `${6 + Math.random() * 88}%`;
    particle.style.top = `${4 + Math.random() * 88}%`;
    particle.style.setProperty("--particle-size", `${4 + Math.random() * 8}px`);
    particle.style.setProperty("--particle-duration", `${16 + Math.random() * 16}s`);
    particle.style.setProperty("--particle-delay", `${Math.random() * -18}s`);
    ambientParticles.appendChild(particle);
  }
}

function setupPromptRotator() {
  if (!promptRotator || !promptCycler || prefersReducedMotion) {
    return;
  }

  function stabilizePromptRotatorHeight() {
    const probe = promptRotator.cloneNode();
    let maxHeight = 0;

    probe.removeAttribute("id");
    probe.setAttribute("aria-hidden", "true");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.inset = "0 auto auto 0";
    promptCycler.appendChild(probe);

    for (const prompt of rotatingPrompts) {
      probe.textContent = prompt;
      maxHeight = Math.max(maxHeight, probe.getBoundingClientRect().height);
    }

    probe.remove();

    if (maxHeight > 0) {
      promptCycler.style.setProperty("--prompt-rotator-height", `${Math.ceil(maxHeight)}px`);
    }
  }

  stabilizePromptRotatorHeight();
  window.addEventListener("resize", stabilizePromptRotatorHeight);
  const fontReady = document.fonts?.ready;
  if (fontReady?.then) {
    fontReady.then(stabilizePromptRotatorHeight).catch(() => {});
  }

  let index = 0;

  promptTimer = window.setInterval(() => {
    index = (index + 1) % rotatingPrompts.length;
    promptCycler.classList.remove("is-swapping");
    void promptCycler.offsetWidth;
    promptRotator.textContent = rotatingPrompts[index];
    promptCycler.classList.add("is-swapping");
  }, 2600);
}

function triggerDeviceAction(action) {
  const isAnalysisReady = Boolean(resultsElement && !resultsElement.classList.contains("hidden"));
  const analyzePanel = document.getElementById("analyze-panel");
  const narrativePanel = document.querySelector(".narrative-panel");
  const diagramPanel = document.querySelector(".diagram-panel");
  const docsPanel = document.querySelector(".docs-panel");
  const chatPanel = document.querySelector(".chat-panel");
  const comparisonView = document.getElementById("comparison-panel");
  const prefersCompactScroll = window.matchMedia("(max-width: 760px)").matches;

  if (!analyzePanel) {
    window.location.href = "/#analyze-panel";
    return;
  }

  if (action === "start-analysis") {
    const target = isAnalysisReady ? resultsElement : analyzePanel;
    target.scrollIntoView({
      behavior: prefersCompactScroll ? "auto" : "smooth",
      block: "start"
    });

    if (!isAnalysisReady && repoUrlInput) {
      window.setTimeout(() => repoUrlInput.focus(), 220);
    }

    return;
  }

  if (!isAnalysisReady) {
    setStatus("Run analysis first, then this shortcut will open that section.", "idle");
    analyzePanel.scrollIntoView({
      behavior: prefersCompactScroll ? "auto" : "smooth",
      block: "start"
    });
    if (repoUrlInput) {
      window.setTimeout(() => repoUrlInput.focus(), 220);
    }
    return;
  }

  let targetPanel = resultsElement;

  if (action === "open-summary") {
    targetPanel = narrativePanel || resultsElement;
  } else if (action === "open-diagrams") {
    targetPanel = diagramPanel || resultsElement;
  } else if (action === "open-docs") {
    targetPanel = docsPanel || resultsElement;
  } else if (action === "open-comparison") {
    targetPanel = comparisonView && !comparisonView.classList.contains("hidden")
      ? comparisonView
      : resultsElement;
  } else if (action === "open-chat" || action === "focus-chat") {
    targetPanel = chatPanel || resultsElement;
  }

  targetPanel.scrollIntoView({
    behavior: prefersCompactScroll ? "auto" : "smooth",
    block: "start"
  });

  if ((action === "open-chat" || action === "focus-chat") && chatQuestionInput) {
    window.setTimeout(() => chatQuestionInput.focus(), 220);
  }
}

function bindDeviceActions() {
  document.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element ? event.target.closest("[data-device-action]") : null;

    if (!trigger) {
      return;
    }

    const action = trigger.getAttribute("data-device-action") || "";

    if (trigger.tagName !== "A") {
      event.preventDefault();
    }

    if (
      action === "start-analysis" ||
      action === "focus-chat" ||
      action === "open-summary" ||
      action === "open-diagrams" ||
      action === "open-docs" ||
      action === "open-comparison" ||
      action === "open-chat"
    ) {
      const note = trigger.getAttribute("data-dimension-message");
      if (note && dimensionLiveOutputElement) {
        dimensionLiveOutputElement.textContent = sanitize(note);
        dimensionLiveOutputElement.classList.add("is-updating");

        document.querySelectorAll(".dimension-control.is-live").forEach((entry) => {
          entry.classList.remove("is-live");
        });
        trigger.classList.add("is-live");

        window.clearTimeout(dimensionLiveTimer);
        dimensionLiveTimer = window.setTimeout(() => {
          dimensionLiveOutputElement.classList.remove("is-updating");
          trigger.classList.remove("is-live");
        }, 900);
      }

      triggerDeviceAction(action);
    }
  });
}

function setupTouchEffects() {
  if (prefersReducedMotion || !coarsePointerQuery.matches) {
    return;
  }

  body.classList.add("touch-enhanced");

  let activePointerId = null;
  let pressedElement = null;
  let lastPoint = null;
  let lastWakeAt = 0;

  function spawnTouchRipple(x, y) {
    const ripple = createElement("span", "touch-ripple");
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    cursorTrail.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  }

  function spawnTouchWake(x, y, angle, strength) {
    const wake = createElement("span", "touch-wake");
    wake.style.left = `${x}px`;
    wake.style.top = `${y}px`;
    wake.style.width = `${Math.min(180, 56 + strength * 1.1)}px`;
    wake.style.setProperty("--wake-rotation", `${angle}deg`);
    cursorTrail.appendChild(wake);
    wake.addEventListener("animationend", () => wake.remove(), { once: true });
  }

  function updatePressedElement(target, clientX, clientY) {
    if (pressedElement && pressedElement !== target) {
      pressedElement.classList.remove("touch-active");
    }

    pressedElement = target;

    if (!pressedElement) {
      return;
    }

    const rect = pressedElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    pressedElement.style.setProperty("--mx", `${x}%`);
    pressedElement.style.setProperty("--my", `${y}%`);
    pressedElement.classList.add("touch-active");
  }

  function clearPressedElement() {
    if (!pressedElement) {
      return;
    }

    pressedElement.classList.remove("touch-active");
    pressedElement = null;
  }

  window.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") {
      return;
    }

    activePointerId = event.pointerId;
    lastPoint = {
      x: event.clientX,
      y: event.clientY
    };
    lastWakeAt = performance.now();
    spawnTouchRipple(event.clientX, event.clientY);
    updatePressedElement(
      event.target.closest(
        ".spotlight-card, .preview-card, .metric-card, .finding-card, .module-card, .dependency-item, .file-card, .relationship-item, .chat-bubble, .primary-button, .secondary-button, .ghost-button, .diagram-tab, .upload-surface, .signal-card"
      ),
      event.clientX,
      event.clientY
    );
  }, { passive: true });

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "touch" || event.pointerId !== activePointerId || !lastPoint) {
      return;
    }

    const dx = event.clientX - lastPoint.x;
    const dy = event.clientY - lastPoint.y;
    const distance = Math.hypot(dx, dy);
    const now = performance.now();

    if (pressedElement) {
      updatePressedElement(pressedElement, event.clientX, event.clientY);
    }

    if (distance > 14 && now - lastWakeAt > 42) {
      spawnTouchWake(event.clientX, event.clientY, Math.atan2(dy, dx) * (180 / Math.PI), distance);
      lastWakeAt = now;
      lastPoint = {
        x: event.clientX,
        y: event.clientY
      };
    }
  }, { passive: true });

  ["pointerup", "pointercancel"].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
      if (event.pointerType !== "touch" || event.pointerId !== activePointerId) {
        return;
      }

      activePointerId = null;
      lastPoint = null;
      clearPressedElement();
    }, { passive: true });
  });
}

function setupParallax() {
  if (prefersReducedMotion) {
    return;
  }

  const parallaxTargets = [...document.querySelectorAll("[data-parallax]")];

  function update() {
    const viewport = window.innerHeight || 1;

    for (const target of parallaxTargets) {
      const factor = Number(target.dataset.parallax || "0");
      const rect = target.getBoundingClientRect();
      const distanceFromCenter = rect.top + rect.height / 2 - viewport / 2;
      const shift = distanceFromCenter * factor * -0.12;
      target.style.setProperty("--parallax-shift", `${shift}px`);
    }
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

function renderMetrics(payload) {
  const { summary, modules, relationships, quality } = payload.analysis;
  const { source } = payload;
  const baselineSource = payload.comparisonContext?.baselineSource || null;
  const sourceMode = source.type === "git" ? "Remote" : source.type;

  if (baselineSource) {
    resultTitleElement.textContent = `Comparison review: ${source.name} vs ${baselineSource.name}`;
    sourcePillElement.textContent = `Compare / ${source.platform || source.name}`;
  } else {
    resultTitleElement.textContent = `${source.name} workspace brief`;
    sourcePillElement.textContent = `${source.platform || source.name} / ${sourceMode}`;
  }

  analysisTimeElement.textContent = formatTime();
  primaryLanguageElement.textContent = sanitize(summary.primaryLanguage || "-");
  animateCount(codeFilesElement, summary.codeFiles || 0);
  animateCount(dependencyCountElement, summary.dependencyCount || 0);
  animateCount(moduleCountElement, modules.length);
  animateCount(relationshipCountElement, relationships.length);
  animateCount(qualityScoreElement, quality.score);
  aiBadgeElement.textContent = payload.analysis.aiStatus === "live"
    ? "OpenAI"
    : getAiFallbackLabel(payload.analysis.aiReason);
}

function renderSourceProfile(source, comparisonContext = null) {
  if (!sourceProfileElement) {
    return;
  }

  clearChildren(sourceProfileElement);
  const baselineSource = comparisonContext?.baselineSource || null;
  let fields = [];

  if (baselineSource) {
    fields = [
      {
        label: "Current Repo",
        value: source.name || "Unknown"
      },
      {
        label: "Baseline Repo",
        value: baselineSource.name || "Unknown"
      },
      {
        label: "Current Ref",
        value: source.ref || "Default branch or uploaded snapshot"
      },
      {
        label: "Baseline Ref",
        value: baselineSource.ref || "Default branch or uploaded snapshot"
      },
      {
        label: "Current Remote",
        value: source.repoUrl || "ZIP or local archive upload"
      },
      {
        label: "Baseline Remote",
        value: baselineSource.repoUrl || "ZIP or local archive upload"
      }
    ];
  } else {
    fields = [
      {
        label: "Platform",
        value: source.platform || source.type || "Repository Workspace"
      },
      {
        label: "Workspace",
        value: source.workspaceLabel || source.name || "Unknown"
      },
      {
        label: "Mode",
        value: source.type === "git" ? "Remote clone" : source.type || "Analysis"
      },
      {
        label: "Remote",
        value: source.repoUrl || "ZIP or local archive upload"
      }
    ];

    if (source.workspaceKey) {
      fields.push({
        label: "Workspace Key",
        value: source.workspaceKey
      });
    }
  }

  for (const field of fields) {
    const card = createElement("article", "profile-card spotlight-card");
    card.appendChild(createElement("span", "file-meta-label", field.label));
    card.appendChild(createElement("strong", "", field.value));
    sourceProfileElement.appendChild(card);
  }
}

function renderPlatformSignals(signals) {
  if (!platformSignalsElement) {
    return;
  }

  clearChildren(platformSignalsElement);

  if (!signals.length) {
    platformSignalsElement.appendChild(
      createElement("p", "empty-state", "No delivery or collaboration signals were detected.")
    );
    return;
  }

  for (const signal of signals) {
    const card = createElement("article", "signal-insight-card spotlight-card");
    card.appendChild(createElement("span", "file-meta-label", signal.category));
    card.appendChild(createElement("strong", "", signal.name));
    card.appendChild(createElement("p", "", summarizeSignalDetail(signal)));

    if (signal.evidence?.length) {
      card.appendChild(createEvidenceList(signal.evidence));
    }

    platformSignalsElement.appendChild(card);
  }
}

function renderFrameworks(summary) {
  clearChildren(frameworksElement);
  const frameworks = summary.frameworks.length ? summary.frameworks : [summary.primaryLanguage || "Unknown"];

  for (const framework of frameworks) {
    frameworksElement.appendChild(createElement("span", "chip", framework));
  }
}

function renderEntrypoints(summary) {
  clearChildren(entrypointsElement);

  if (!summary.entrypoints.length) {
    entrypointsElement.appendChild(createElement("p", "empty-state", "No obvious entrypoints detected."));
    return;
  }

  for (const entrypoint of summary.entrypoints.slice(0, 6)) {
    const item = createElement("article", "stack-item spotlight-card");
    item.appendChild(createElement("span", "file-meta-label", "Entrypoint"));
    item.appendChild(createPathTitle(entrypoint));
    entrypointsElement.appendChild(item);
  }
}

function renderLanguages(summary) {
  clearChildren(languagesElement);

  if (!summary.languages.length) {
    languagesElement.appendChild(createElement("p", "empty-state", "No language breakdown available."));
    return;
  }

  const maxCount = summary.languages[0].count || 1;

  for (const language of summary.languages.slice(0, 6)) {
    const row = createElement("div", "language-row");
    const meta = createElement("div", "language-meta");
    meta.appendChild(createElement("strong", "", language.name));
    meta.appendChild(createElement("span", "", `${language.count} files`));

    const track = createElement("div", "language-track");
    const fill = createElement("div", "language-fill");
    fill.style.width = `${Math.max(10, (language.count / maxCount) * 100)}%`;
    track.appendChild(fill);

    row.appendChild(meta);
    row.appendChild(track);
    languagesElement.appendChild(row);
  }
}

function renderFindings(quality) {
  qualitySummaryElement.textContent = sanitize(quality.summary);
  clearChildren(findingsElement);

  if (!quality.findings.length) {
    findingsElement.appendChild(createElement("p", "empty-state", "No major findings were generated."));
    return;
  }

  for (const finding of quality.findings) {
    const card = createElement("article", "finding-card spotlight-card");
    card.dataset.severity = finding.severity;
    card.appendChild(createElement("span", "file-meta-label", finding.severity));
    card.appendChild(createElement("strong", "", finding.title));
    card.appendChild(createElement("p", "", finding.detail));
    findingsElement.appendChild(card);
  }
}

function renderHotspots(quality) {
  clearChildren(hotspotsElement);

  if (!quality.hotspots.length) {
    hotspotsElement.appendChild(createElement("p", "empty-state", "No hotspot files were detected."));
    return;
  }

  for (const hotspot of quality.hotspots) {
    const item = createElement("article", "stack-item spotlight-card");
    item.appendChild(createElement("span", "file-meta-label", hotspot.module));
    item.appendChild(createPathTitle(hotspot.path));
    item.appendChild(
      createElement(
        "p",
        "",
        `Imports: ${hotspot.importCount}, functions: ${hotspot.functionCount}, classes: ${hotspot.classCount}`
      )
    );
    hotspotsElement.appendChild(item);
  }
}

function renderModules(modules) {
  clearChildren(modulesElement);

  if (!modules.length) {
    modulesElement.appendChild(createElement("p", "empty-state", "No modules detected."));
    return;
  }

  for (const module of modules.slice(0, 12)) {
    const card = createElement("article", "module-card spotlight-card");
    card.appendChild(createElement("span", "file-meta-label", "Module"));
    card.appendChild(createElement("strong", "", `${module.name} (${module.fileCount})`));
    const examples = createElement("div", "module-example-list");
    examples.appendChild(createElement("span", "file-meta-label", "Example files"));

    if (module.examples.length) {
      for (const example of module.examples.slice(0, 3)) {
        examples.appendChild(createPathTitle(example, "file-path-title compact-path"));
      }
    } else {
      examples.appendChild(createElement("p", "", "No example files recorded."));
    }

    card.appendChild(examples);
    modulesElement.appendChild(card);
  }
}

function renderDependencies(dependencies) {
  clearChildren(dependenciesElement);

  if (!dependencies.length) {
    dependenciesElement.appendChild(createElement("p", "empty-state", "No manifest dependencies detected."));
    return;
  }

  for (const dependency of dependencies.slice(0, 18)) {
    const card = createElement("article", "dependency-item spotlight-card");
    card.appendChild(createElement("span", "file-meta-label", dependency.source));
    card.appendChild(createElement("strong", "", dependency.name));
    card.appendChild(createElement("p", "", dependency.version || dependency.section));
    dependenciesElement.appendChild(card);
  }
}

function renderRelationships(relationships) {
  clearChildren(relationshipsElement);

  if (!relationships.length) {
    relationshipsElement.appendChild(createElement("p", "empty-state", "No cross-module relationships detected."));
    return;
  }

  for (const relationship of relationships.slice(0, 10)) {
    const item = createElement("article", "relationship-item spotlight-card");
    const row = createElement("div", "relationship-row");
    row.appendChild(createElement("strong", "", `${relationship.from} -> ${relationship.to}`));
    row.appendChild(createElement("span", "relationship-weight", relationship.count));
    item.appendChild(row);
    item.appendChild(createElement("p", "", "Detected through import references between inferred modules."));
    relationshipsElement.appendChild(item);
  }
}

function renderFiles(files) {
  clearChildren(filesElement);

  if (!files.length) {
    filesElement.appendChild(createElement("p", "empty-state", "No highlighted files available."));
    return;
  }

  for (const file of files) {
    const card = createElement("article", "file-card spotlight-card");
    card.appendChild(createElement("span", "file-meta-label", file.language));
    card.appendChild(createPathTitle(file.path));
    card.appendChild(createElement("p", "", file.role));

    const meta = createElement("div", "file-meta");
    const imports = formatImportPreview(file.imports);
    meta.textContent = `${file.module} - imports: ${imports} - classes: ${file.classCount} - functions: ${file.functionCount}`;
    meta.title = sanitize(file.path);
    card.appendChild(meta);
    filesElement.appendChild(card);
  }
}

function renderComparison(comparison, comparisonContext = null) {
  const fileList = document.getElementById("comparison-files");
  const changeCount = document.getElementById("comparison-change-count");
  if (!comparison) {
    comparisonPanel.classList.add("hidden");
    fileList?.replaceChildren();
    if (changeCount) changeCount.textContent = "";
    return;
  }

  comparisonPanel.classList.remove("hidden");
  const baselineSource = comparisonContext?.baselineSource || null;
  const baselineLine = baselineSource
    ? ` Baseline: ${baselineSource.name}${baselineSource.ref ? ` (${baselineSource.ref})` : ""}.`
    : "";
  comparisonSummaryElement.textContent = `${sanitize(comparison.summary)}${baselineLine}`;

  clearChildren(comparisonStatsElement);
  const stats = [
    `Changed ${comparison.stats.changedCodeFiles || 0}`,
    `Added ${comparison.fileDiff?.added?.length || 0}`,
    `Removed ${comparison.fileDiff?.removed?.length || 0}`,
    `Quality ${comparison.stats.scoreDelta >= 0 ? "+" : ""}${comparison.stats.scoreDelta}`,
    `Modules ${comparison.stats.moduleDelta >= 0 ? "+" : ""}${comparison.stats.moduleDelta}`,
    `Deps ${comparison.stats.dependencyDelta >= 0 ? "+" : ""}${comparison.stats.dependencyDelta}`
  ];

  for (const stat of stats) {
    comparisonStatsElement.appendChild(createElement("span", "comparison-chip", stat));
  }

  clearChildren(comparisonFindingsElement);

  for (const finding of comparison.riskFindings) {
    const card = createElement("article", "finding-card spotlight-card");
    card.dataset.severity = finding.priority;
    card.appendChild(createElement("span", "file-meta-label", finding.priority));
    card.appendChild(createElement("strong", "", finding.title));
    card.appendChild(createElement("p", "", finding.detail));
    comparisonFindingsElement.appendChild(card);
  }

  if (fileList) {
    const changes = [
      ...(comparison.fileDiff?.changedDetails || comparison.fileDiff?.changed?.map((path) => ({ path })) || [])
        .map((file) => ({ ...file, kind: "Changed", navigable: true })),
      ...(comparison.fileDiff?.addedDetails || comparison.fileDiff?.added?.map((path) => ({ path })) || [])
        .map((file) => ({ ...file, kind: "Added", navigable: true })),
      ...(comparison.fileDiff?.removedDetails || comparison.fileDiff?.removed?.map((path) => ({ path })) || [])
        .map((file) => ({ ...file, kind: "Removed", navigable: false }))
    ];
    fileList.replaceChildren();
    if (changeCount) changeCount.textContent = `${changes.length} detected`;

    if (!changes.length) {
      fileList.appendChild(createElement("p", "empty-state", "No indexed code files changed."));
    }

    for (const change of changes.slice(0, 16)) {
      const row = createElement("div", "comparison-file-item");
      row.appendChild(createElement("span", "comparison-file-kind", change.kind));
      if (change.navigable && analysisId) {
        const link = createElement("a", "comparison-file-link", change.path);
        link.href = buildExplorerUrl(change.path);
        link.title = `Open ${change.path} in the current repository snapshot`;
        row.appendChild(link);
      } else {
        row.appendChild(createElement("span", "comparison-file-path", change.path));
      }
      fileList.appendChild(row);
    }

    if (changes.length > 16) {
      fileList.appendChild(createElement("p", "comparison-scope-note", `Showing 16 of ${changes.length} changed files.`));
    }
  }
}

function appendLearningEvidence(parent, evidenceItems) {
  const uniqueItems = [...new Map((evidenceItems || [])
    .filter((item) => item?.path && Number.isInteger(item.line))
    .map((item) => [`${item.path}:${item.line}`, item])).values()];
  if (!uniqueItems.length) return;

  const links = createElement("div", "learning-evidence");
  for (const item of uniqueItems.slice(0, 8)) {
    const link = createElement("a", "learning-evidence-link", `${item.path}:${item.line}`);
    link.href = buildExplorerUrl(item.path, item.line);
    link.title = item.excerpt || `Open ${item.path} at line ${item.line}`;
    links.appendChild(link);
  }
  parent.appendChild(links);
}

function renderEvidenceCoverage(coverage) {
  const countsRoot = document.getElementById("learning-coverage-counts");
  const rowsRoot = document.getElementById("learning-coverage-rows");
  const labels = [
    ["observed", "Observed"],
    ["inferred", "Inferred"],
    ["not-found", "Not found"],
    ["not-verified", "Not verified"]
  ];
  countsRoot.replaceChildren();
  rowsRoot.replaceChildren();
  for (const [key, label] of labels) {
    countsRoot.appendChild(createElement("span", `learning-coverage-count status-${key}`, `${label} ${coverage?.counts?.[key] || 0}`));
  }
  document.getElementById("learning-coverage-note").textContent = coverage?.note || "Evidence labels describe this static scan, not runtime behavior.";
  for (const item of coverage?.rows || []) {
    const row = createElement("article", "learning-coverage-row");
    const title = createElement("div", "learning-coverage-row-title");
    title.appendChild(createElement("strong", "", item.label));
    title.appendChild(createElement("span", `learning-coverage-status status-${item.status}`, item.status.replaceAll("-", " ")));
    row.append(title, createElement("p", "", item.detail));
    appendLearningEvidence(row, item.evidence);
    rowsRoot.appendChild(row);
  }
  if (!rowsRoot.children.length) rowsRoot.appendChild(createElement("p", "empty-state", "Evidence coverage will appear after repository analysis."));
}

function renderContributionNotes(source) {
  const fields = [
    ["built", document.getElementById("contribution-built")],
    ["studied", document.getElementById("contribution-studied")],
    ["next", document.getElementById("contribution-next")]
  ];
  const sourceKey = [source?.platformId, source?.workspaceKey || source?.repoUrl || source?.name]
    .map((part) => String(part || "").trim().toLowerCase()).join(":");
  const storageKey = `lumenstack-contribution:v1:${sourceKey}`;
  const status = document.getElementById("contribution-notes-status");

  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    for (const [key, field] of fields) field.value = typeof saved[key] === "string" ? saved[key].slice(0, 1200) : "";
  } catch {
    for (const [, field] of fields) field.value = "";
  }

  const persist = () => {
    const saved = Object.fromEntries(fields.map(([key, field]) => [key, field.value.slice(0, 1200)]));
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(saved));
      status.textContent = "Saved in this browser only.";
    } catch {
      status.textContent = "Browser storage is unavailable; these notes will not persist after you leave.";
    }
  };
  for (const [, field] of fields) field.oninput = persist;

  document.getElementById("copy-contribution-notes").onclick = async () => {
    const text = fields.map(([key, field]) => {
      const label = { built: "What I built", studied: "What I studied", next: "What I would improve" }[key];
      return field.value.trim() ? `${label}\n${field.value.trim()}` : "";
    }).filter(Boolean).join("\n\n");
    if (!text) {
      status.textContent = "Add a note before copying your interview brief.";
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "Contribution notes copied.";
    } catch {
      status.textContent = "Clipboard access is unavailable in this browser.";
    }
  };
  document.getElementById("clear-contribution-notes").onclick = () => {
    for (const [, field] of fields) field.value = "";
    try {
      window.localStorage.removeItem(storageKey);
      status.textContent = "Notes cleared from this browser.";
    } catch {
      status.textContent = "Notes cleared from the form; browser storage could not be updated.";
    }
  };
}

const guidedSampleTourSteps = [
  { view: "overview", target: "overview-view", text: "Start with the plain-language summary, stack, and the repository signals the scan actually found." },
  { view: "learn", target: "learning-steps", text: "The learning path begins with purpose and entrypoint, then moves through modules, imports, and verification." },
  { view: "learn", detail: "flow", target: "learning-workflow", text: "Follow the request path and open each cited source line. These are static links, not a recording of runtime execution." },
  { view: "learn", detail: "interview", target: "learning-interview-panel", text: "Practice an explanation, and keep your own contributions separate from what the repository merely contains." },
  { view: "architecture", target: "architecture-view", text: "Finish with the generated maps and file evidence. Use them as navigation aids, then verify important claims in source." }
];

let demoTourIndex = -1;

function renderDemoTour(isDemo) {
  const tour = document.getElementById("learning-demo-tour");
  const text = document.getElementById("learning-demo-tour-text");
  const count = document.getElementById("learning-demo-tour-step");
  const start = document.getElementById("learning-demo-tour-start");
  const previous = document.getElementById("learning-demo-tour-prev");
  const next = document.getElementById("learning-demo-tour-next");
  const close = document.getElementById("learning-demo-tour-exit");
  tour.hidden = !isDemo;
  demoTourIndex = -1;
  if (!isDemo) return;

  function showStep() {
    const complete = demoTourIndex >= guidedSampleTourSteps.length;
    const active = demoTourIndex >= 0 && !complete;
    start.hidden = active;
    start.textContent = complete ? "Replay tour" : "Start tour";
    previous.hidden = !active;
    next.hidden = !active;
    close.hidden = demoTourIndex < 0;
    previous.disabled = demoTourIndex <= 0;
    next.disabled = complete;
    count.textContent = active
      ? `Step ${demoTourIndex + 1} of ${guidedSampleTourSteps.length}`
      : complete ? "Tour complete" : "5 steps · about 1 minute";

    if (complete) {
      text.textContent = "Tour complete. Explore the sample freely, then analyze a repository of your own.";
      return;
    }
    if (!active) {
      text.textContent = "A quick guided path from repository overview to source evidence and a clear presentation.";
      return;
    }
    const step = guidedSampleTourSteps[demoTourIndex];
    document.querySelector(`[data-result-view="${step.view}"]`)?.click();
    if (step.detail) document.querySelector(`[data-learning-tab="${step.detail}"]`)?.click();
    text.textContent = step.text;
    document.getElementById(step.target)?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
  }

  start.onclick = () => { demoTourIndex = 0; showStep(); };
  previous.onclick = () => { demoTourIndex = Math.max(0, demoTourIndex - 1); showStep(); };
  next.onclick = () => { demoTourIndex = Math.min(guidedSampleTourSteps.length, demoTourIndex + 1); showStep(); };
  close.onclick = () => { demoTourIndex = -1; showStep(); };
  showStep();
}

function renderLearningWorkflow(workflow) {
  const workflowRoot = document.getElementById("learning-workflow");
  const exampleRoot = document.getElementById("learning-flow-example");
  workflowRoot.replaceChildren();
  exampleRoot.replaceChildren();
  document.getElementById("learning-workflow-note").textContent = workflow?.note || "Connections are static source evidence, not a guaranteed runtime sequence.";

  if (!workflow?.stages?.length) {
    workflowRoot.appendChild(createElement("p", "empty-state", "No workflow stages could be confirmed from this repository."));
  } else {
    for (const [index, stage] of workflow.stages.entries()) {
      const article = createElement("article", "learning-flow-stage");
      article.appendChild(createElement("span", "learning-flow-index", String(index + 1).padStart(2, "0")));
      article.appendChild(createElement("span", "learning-flow-state", stage.state || "Observed"));
      article.appendChild(createElement("h3", "", stage.title));
      article.appendChild(createElement("p", "", stage.detail));
      appendLearningEvidence(article, stage.evidence);
      workflowRoot.appendChild(article);
    }
  }

  if (workflow?.example) {
    exampleRoot.hidden = false;
    exampleRoot.appendChild(createElement("div", "learning-flow-example-copy"));
    const copy = exampleRoot.querySelector(".learning-flow-example-copy");
    copy.appendChild(createElement("p", "eyebrow", workflow.example.title));
    copy.appendChild(createElement("p", "", workflow.example.body));
    const code = createElement("pre", "learning-source-example");
    code.appendChild(createElement("code", "", workflow.example.snippet || "Source line not available."));
    exampleRoot.appendChild(code);
    appendLearningEvidence(exampleRoot, [workflow.example.evidence]);
  } else {
    exampleRoot.hidden = true;
  }
}

function renderLearningInfrastructure(cards) {
  const root = document.getElementById("learning-infrastructure");
  root.replaceChildren();
  for (const card of cards || []) {
    const article = createElement("article", "learning-info-card learning-infra-card");
    article.appendChild(createElement("span", "learning-info-kicker", card.category || "Infrastructure"));
    article.appendChild(createElement("h3", "", card.title));
    article.appendChild(createElement("p", "", card.description));
    if (card.details?.length) {
      const detailList = createElement("dl", "learning-config-details");
      for (const detail of card.details) {
        const label = createElement("dt", "", detail.label);
        const value = createElement("dd", "", detail.value);
        if (detail.evidence) {
          const link = createElement("a", "learning-inline-source", `${detail.evidence.path}:${detail.evidence.line}`);
          link.href = buildExplorerUrl(detail.evidence.path, detail.evidence.line);
          link.title = detail.evidence.excerpt || "Open the source configuration";
          value.appendChild(link);
        }
        detailList.append(label, value);
      }
      article.appendChild(detailList);
    }
    appendLearningEvidence(article, card.evidence);
    root.appendChild(article);
  }
  if (!root.children.length) root.appendChild(createElement("p", "empty-state", "No infrastructure signals were indexed."));
}

function renderLearningTechnologies(choices) {
  const root = document.getElementById("learning-technologies");
  root.replaceChildren();
  for (const choice of choices || []) {
    const article = createElement("article", "learning-info-card learning-tech-card");
    article.appendChild(createElement("span", "learning-info-kicker", "Detected stack"));
    article.appendChild(createElement("h3", "", choice.name));
    article.appendChild(createElement("p", "learning-observed", choice.observed));
    const role = createElement("div", "learning-rationale-block");
    role.appendChild(createElement("strong", "", "What it does here"));
    role.appendChild(createElement("p", "", choice.role));
    const fit = createElement("div", "learning-rationale-block");
    fit.appendChild(createElement("strong", "", "Why it can fit"));
    fit.appendChild(createElement("p", "", choice.typicalFit));
    article.append(role, fit);
    if (choice.apiEvidence?.excerpt) {
      const example = createElement("div", "learning-tech-example");
      example.appendChild(createElement("strong", "", "One implementation example"));
      const code = createElement("pre", "learning-source-example");
      code.appendChild(createElement("code", "", choice.apiEvidence.excerpt));
      example.appendChild(code);
      const source = createElement("a", "learning-inline-source", `${choice.apiEvidence.path}:${choice.apiEvidence.line}`);
      source.href = buildExplorerUrl(choice.apiEvidence.path, choice.apiEvidence.line);
      example.appendChild(source);
      article.appendChild(example);
    }
    article.appendChild(createElement("p", "learning-rationale-caveat", choice.projectRationale));
    appendLearningEvidence(article, choice.evidence);
    root.appendChild(article);
  }
  if (!root.children.length) {
    root.appendChild(createElement("p", "empty-state", "No framework or primary language signal was available for a technology explanation."));
  }
}

function renderLearningInterview(questions, note) {
  const root = document.getElementById("learning-interview-questions");
  root.replaceChildren();
  for (const item of questions || []) {
    const details = createElement("details", "learning-interview-question");
    details.open = false;
    const summary = createElement("summary", "", item.question);
    const answer = createElement("p", "learning-interview-answer", item.answer);
    details.append(summary, answer);
    if (item.followUp) {
      const followUp = createElement("p", "learning-interview-followup");
      followUp.appendChild(createElement("strong", "", "Practice follow-up: "));
      followUp.appendChild(document.createTextNode(sanitize(item.followUp)));
      details.appendChild(followUp);
    }
    appendLearningEvidence(details, item.evidence);
    root.appendChild(details);
  }
  document.getElementById("learning-interview-note").textContent = note || "Verify each answer against the files before using it in an interview.";
  if (!root.children.length) root.appendChild(createElement("p", "empty-state", "Interview practice will appear after analysis."));
}

function appendLearningKnowledgeCheck(article, step) {
  const check = step.knowledgeCheck;
  if (!check?.options?.length) return;

  const details = createElement("details", "learning-quick-check");
  details.appendChild(createElement("summary", "", "Quick recall · choose the best-supported answer"));
  const body = createElement("div", "learning-check-body");
  const prompt = createElement("p", "", check.question);
  const options = document.createElement("fieldset");
  options.className = "learning-check-options";
  options.setAttribute("aria-label", `${step.title} answer choices`);
  const feedback = createElement("div", "learning-check-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  feedback.hidden = true;

  check.options.forEach((option, index) => {
    const label = createElement("label", "learning-check-option");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `knowledge-check-${step.id}`;
    input.value = String(index);
    label.append(input, createElement("span", "", option));
    options.appendChild(label);
  });

  const submit = createElement("button", "secondary-button compact-button learning-check-submit", "Check answer");
  submit.type = "button";
  submit.onclick = () => {
    const selected = options.querySelector("input:checked");
    feedback.replaceChildren();
    feedback.hidden = false;
    if (!selected) {
      feedback.textContent = "Choose an answer, then check it against the linked repository evidence.";
      feedback.dataset.correct = "false";
      return;
    }

    const correct = Number(selected.value) === check.correctIndex;
    feedback.dataset.correct = String(correct);
    feedback.appendChild(createElement("strong", "", correct ? "Supported by the scan." : "Revisit the evidence."));
    feedback.appendChild(createElement("p", "", check.explanation));
    appendLearningEvidence(feedback, check.evidence);
  };

  body.append(prompt, options, submit, feedback);
  details.appendChild(body);
  article.appendChild(details);
}

function renderInterviewPractice(questions) {
  if (activePracticeTimer) window.clearInterval(activePracticeTimer);
  activePracticeTimer = null;

  const select = document.getElementById("practice-question-select");
  const prompt = document.getElementById("practice-question-prompt");
  const answer = document.getElementById("practice-answer");
  const timerOutput = document.getElementById("practice-timer");
  const timerButton = document.getElementById("practice-timer-toggle");
  const reviewButton = document.getElementById("review-practice-answer");
  const nextButton = document.getElementById("next-practice-question");
  const feedback = document.getElementById("practice-feedback");
  const drafts = new Map();
  let activeIndex = 0;
  let remainingSeconds = 90;

  function showTime() {
    const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
    const seconds = String(remainingSeconds % 60).padStart(2, "0");
    timerOutput.textContent = `${minutes}:${seconds}`;
  }

  function stopTimer(reset = false) {
    if (activePracticeTimer) window.clearInterval(activePracticeTimer);
    activePracticeTimer = null;
    if (reset) remainingSeconds = 90;
    timerButton.setAttribute("aria-pressed", "false");
    timerButton.textContent = remainingSeconds === 90 ? "Start 90 sec" : "Resume timer";
    showTime();
  }

  function setQuestion(index, saveDraft = true) {
    if (!questions?.length) return;
    if (saveDraft) drafts.set(activeIndex, answer.value);
    activeIndex = (index + questions.length) % questions.length;
    select.value = String(activeIndex);
    prompt.textContent = questions[activeIndex].question;
    answer.value = drafts.get(activeIndex) || "";
    feedback.replaceChildren();
    feedback.hidden = true;
    stopTimer(true);
  }

  select.replaceChildren();
  (questions || []).forEach((item, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${String(index + 1).padStart(2, "0")} · ${item.question}`;
    select.appendChild(option);
  });

  select.onchange = () => setQuestion(Number(select.value));
  nextButton.onclick = () => setQuestion(activeIndex + 1);
  timerButton.onclick = () => {
    if (activePracticeTimer) {
      stopTimer();
      return;
    }
    if (remainingSeconds <= 0) remainingSeconds = 90;
    timerButton.textContent = "Pause timer";
    timerButton.setAttribute("aria-pressed", "true");
    showTime();
    activePracticeTimer = window.setInterval(() => {
      remainingSeconds = Math.max(0, remainingSeconds - 1);
      showTime();
      if (remainingSeconds === 0) stopTimer();
    }, 1000);
  };
  reviewButton.onclick = () => {
    drafts.set(activeIndex, answer.value);
    const text = answer.value.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const cues = [
      { label: "Give enough context to explain the problem and your approach.", found: wordCount >= 35 },
      { label: "Anchor at least one point to a real file or configuration path.", found: /(?:^|\s)[\w.@-]+(?:\/[\w.@-]+)*\.[a-z0-9]+(?::\d+)?\b/i.test(text) },
      { label: "Separate your own contribution from what you learned by inspecting the repository.", found: /\b(?:I (?:built|implemented|designed|tested|contributed|maintained|learned)|my contribution)\b/i.test(text) },
      { label: "Mention how you would verify the result or measure its impact.", found: /\b(?:test(?:ed|s)?|verif(?:y|ied|ication)|validat(?:e|ed|ion)|measur(?:e|ed|ement)|metric|result|impact)\b/i.test(text) }
    ];

    feedback.replaceChildren();
    feedback.hidden = false;
    feedback.appendChild(createElement("h4", "", "Answer self-review"));
    feedback.appendChild(createElement("p", "", "These are writing cues, not a correctness score. Check your claims against the cited files and be accurate about your own work."));
    for (const cue of cues) {
      const item = createElement("div", "learning-practice-cue", cue.label);
      item.dataset.found = String(cue.found);
      feedback.appendChild(item);
    }
  };

  select.disabled = !questions?.length;
  reviewButton.disabled = !questions?.length;
  nextButton.disabled = !questions?.length;
  timerButton.disabled = !questions?.length;
  if (questions?.length) setQuestion(0, false);
  else prompt.textContent = "Interview prompts will appear after analysis.";
}

function renderLearningImpact(changeImpact) {
  const select = document.getElementById("learning-impact-module");
  const map = document.getElementById("learning-impact-map");
  const note = document.getElementById("learning-impact-note");
  const modules = changeImpact?.modules || [];
  select.replaceChildren();

  for (const module of modules) {
    const option = document.createElement("option");
    option.value = module.name;
    option.textContent = `${module.name} · ${module.fileCount} files`;
    select.appendChild(option);
  }
  select.disabled = !modules.length;
  note.textContent = changeImpact?.note || "Change impact is estimated from indexed source imports only.";

  function showImpact() {
    map.replaceChildren();
    const selected = modules.find((module) => module.name === select.value);
    if (!selected) {
      map.appendChild(createElement("p", "learning-impact-empty", "No modules were available for impact exploration."));
      return;
    }
    if (!selected.affected.length) {
      map.appendChild(createElement("p", "learning-impact-empty", `No reverse import path to ${selected.name} was confirmed in indexed source. That does not rule out runtime, configuration, or external dependencies.`));
      return;
    }

    for (const affected of selected.affected) {
      const row = createElement("article", "learning-impact-result");
      row.appendChild(createElement("strong", "", affected.name));
      row.appendChild(createElement("p", "", `Import path: ${affected.path.join(" → ")}. Review this area and its tests if ${selected.name} changes.`));
      row.appendChild(createElement("span", "learning-impact-distance", affected.distance === 1 ? "Direct importer" : `${affected.distance} steps away`));
      appendLearningEvidence(row, affected.evidence);
      map.appendChild(row);
    }
  }

  select.onchange = showImpact;
  showImpact();
}

function activateLearningDetailTab(key, focus = false) {
  const tabs = [...document.querySelectorAll("[data-learning-tab]")];
  for (const tab of tabs) {
    const selected = tab.dataset.learningTab === key;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  }
  for (const panel of document.querySelectorAll("[data-learning-panel]")) {
    panel.hidden = panel.dataset.learningPanel !== key;
  }
}

function renderLearning(guide, source) {
  const stepsRoot = document.getElementById("learning-steps");
  const script = document.getElementById("presentation-script");
  const progress = document.getElementById("learning-progress");
  const progressLabel = document.getElementById("learning-progress-label");
  const keyParts = [source?.platformId, source?.workspaceKey || source?.repoUrl || source?.name, source?.ref]
    .map((part) => String(part || "").trim().toLowerCase());
  const storageKey = `lumenstack-study:v1:${keyParts.join(":")}`;
  const steps = guide?.steps || [];
  let completed = new Set();

  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved)) completed = new Set(saved.filter((id) => steps.some((step) => step.id === id)));
  } catch {
    completed = new Set();
  }

  document.getElementById("learning-title").textContent = source?.name
    ? `Understand ${source.name}, step by step`
    : "Understand the project, step by step";
  document.getElementById("learning-certainty").textContent = guide?.certaintyNote || "Open the linked files to verify each explanation.";
  document.getElementById("learning-scope").textContent = guide?.scopeNote || "Static analysis is a guide, not proof of runtime behavior.";
  script.textContent = guide?.presentationScript || "A presentation outline will appear after analysis.";
  renderEvidenceCoverage(guide?.evidenceCoverage);
  renderContributionNotes(source);
  stepsRoot.replaceChildren();

  function updateProgress() {
    const total = steps.length;
    const count = completed.size;
    progress.max = Math.max(1, total);
    progress.value = count;
    progressLabel.textContent = `${count} of ${total} steps understood`;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...completed]));
    } catch {
      progressLabel.textContent = `${count} of ${total} steps understood · browser storage unavailable`;
    }
  }

  for (const [index, step] of steps.entries()) {
    const article = createElement("article", "learning-step");
    const heading = createElement("div", "learning-step-head");
    const title = createElement("h3", "", `${String(index + 1).padStart(2, "0")} · ${step.title}`);
    const titleGroup = createElement("div", "learning-step-title");
    titleGroup.append(title, createElement("span", "learning-step-phase", step.phase || "Learn"));
    const label = createElement("label", "learning-step-check");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = completed.has(step.id);
    checkbox.setAttribute("aria-label", `Mark ${step.title} as understood`);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) completed.add(step.id);
      else completed.delete(step.id);
      updateProgress();
    });
    label.append(checkbox, createElement("span", "", "I understand this"));
    heading.append(titleGroup, label);
    article.append(heading, createElement("p", "", step.body));
    article.appendChild(createElement("span", "learning-basis", step.basis || "Analyzer note"));

    appendLearningEvidence(article, step.evidence);
    appendLearningKnowledgeCheck(article, step);
    stepsRoot.appendChild(article);
  }

  renderLearningWorkflow(guide?.workflow);
  renderLearningInfrastructure(guide?.infrastructure);
  renderLearningTechnologies(guide?.technologyChoices);
  renderLearningInterview(guide?.interviewQuestions, guide?.interviewNote);
  renderInterviewPractice(guide?.interviewQuestions);
  renderLearningImpact(guide?.changeImpact);
  const detailTabs = [...document.querySelectorAll("[data-learning-tab]")];
  for (const [index, tab] of detailTabs.entries()) {
    tab.onclick = () => activateLearningDetailTab(tab.dataset.learningTab);
    tab.onkeydown = (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % detailTabs.length;
      else if (event.key === "ArrowLeft") nextIndex = (index - 1 + detailTabs.length) % detailTabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = detailTabs.length - 1;
      else return;
      event.preventDefault();
      activateLearningDetailTab(detailTabs[nextIndex].dataset.learningTab, true);
    };
  }
  activateLearningDetailTab("flow");

  document.getElementById("copy-interview-prep").onclick = async () => {
    const status = document.getElementById("learning-interview-copy-status");
    const text = (guide?.interviewQuestions || [])
      .map((item) => `${item.question}\n${item.answer}${item.followUp ? `\nFollow-up: ${item.followUp}` : ""}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "Interview Q&A copied.";
    } catch {
      status.textContent = "Clipboard access is unavailable in this browser.";
    }
  };

  updateProgress();
  document.getElementById("learning-reset").onclick = () => {
    completed.clear();
    updateProgress();
  };
  document.getElementById("learning-copy-status").textContent = "";
}

function appendChatBubble(kind, text, citations = []) {
  const bubble = createElement("article", `chat-bubble ${kind} spotlight-card`, text);

  if (citations.length) {
    const citationLinks = createElement("div", "chat-citations");
    citationLinks.setAttribute("aria-label", "Source files supporting this answer");
    for (const citation of citations.slice(0, 4)) {
      const label = citation.line ? `${citation.path}:${citation.line}` : citation.path;
      const link = createElement("a", "chat-citation-link", label);
      link.href = buildExplorerUrl(citation.path, citation.line);
      citationLinks.appendChild(link);
    }
    bubble.appendChild(citationLinks);
  }

  chatMessagesElement.appendChild(bubble);
  window.requestAnimationFrame(() => {
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
  });
}

function resetChat() {
  clearChildren(chatMessagesElement);
  appendChatBubble("system", "Ask about architecture, files, modules, dependencies, or where logic lives.");
}

function applyDiagramZoom() {
  const zoomLabel = `${Math.round(currentDiagramZoom * 100)}%`;
  diagramElement?.style.setProperty("--diagram-zoom", String(currentDiagramZoom));
  if (zoomResetDiagramButton) {
    zoomResetDiagramButton.textContent = zoomLabel;
  }
}

async function renderCurrentDiagram() {
  const diagram = currentDiagrams[currentDiagramKey] || currentDiagrams.architecture || "";
  diagramElement.replaceChildren();

  if (!diagram) {
    diagramElement.appendChild(createElement("p", "empty-state", "No diagram available."));
    animateStream(diagramElement);
    return;
  }

  if (!window.mermaid) {
    diagramElement.appendChild(createElement("pre", "text-block", diagram));
    animateStream(diagramElement);
    return;
  }

  try {
    const graphId = `graph-${currentDiagramKey}-${Date.now()}`;
    const { svg } = await window.mermaid.render(graphId, diagram);
    const viewport = createElement("div", "diagram-viewport");
    viewport.innerHTML = svg;
    diagramElement.appendChild(viewport);
  } catch {
    diagramElement.appendChild(createElement("pre", "text-block", diagram));
  }

  applyDiagramZoom();
  animateStream(diagramElement);
}

async function setActiveDiagram(key) {
  currentDiagramKey = key;
  const captions = {
    architecture: "Arrows show import relationships inferred between the highest-signal modules.",
    sequence: "An illustrative path from an entrypoint through static module links, not runtime tracing.",
    classes: "Class declarations found in analyzed source previews; inheritance is shown where detected.",
    dependencies: "Packages found in manifests are grouped separately from code modules; links do not prove direct imports."
  };
  const caption = document.getElementById("diagram-caption");
  if (caption) caption.textContent = captions[key] || "Generated from the analyzed repository structure.";

  for (const tab of diagramTabs) {
    const selected = tab.dataset.diagram === key;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }

  diagramElement?.setAttribute("aria-label", `${key} diagram`);

  await renderCurrentDiagram();
}

function resetFormState() {
  form.reset();
  setFileCaption(uploadInput, uploadCaption, "No file selected.");
  setFileCaption(baselineUploadInput, baselineUploadCaption, "No baseline selected.");
  applyWorkspacePreset(activeWorkspaceKey);
}

function resetAnalysisState({ preserveStoredAnalysis = false } = {}) {
  stopMetricsTicker();
  resultsElement.classList.add("hidden");
  analysisId = "";
  const repoExplorerLink = document.getElementById("open-repo-explorer");
  repoExplorerLink?.classList.add("hidden");
  if (!preserveStoredAnalysis) {
    try {
      window.localStorage.removeItem("lumenstack-last-analysis-id");
    } catch {
      // Keep the analyzer usable when browser storage is restricted.
    }
  }
  exportUrls = null;
  lastDocumentation = "";
  currentDiagrams = {};
  currentDiagramKey = "architecture";
  comparisonPanel.classList.add("hidden");
  if (sourceProfileElement) {
    clearChildren(sourceProfileElement);
  }

  if (platformSignalsElement) {
    clearChildren(platformSignalsElement);
  }

  updateMetricsRibbon({
    engine: "Standby",
    source: "Awaiting repository",
    throughput: 0,
    latency: 0,
    modules: 0,
    confidence: 85
  });

  resetChat();
}

async function downloadExport(url, filename) {
  if (!url) {
    setStatus("No export is available yet.", "error");
    return;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Export failed.");
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

function markStreamsLive() {
  for (const stream of contentStreams) {
    animateStream(stream);
  }
}

async function renderAnalysisPayload(payload) {
  analysisId = payload.analysisId;
  try {
    window.localStorage.setItem("lumenstack-last-analysis-id", analysisId);
  } catch {
    // The analysis remains available in this page when storage is restricted.
  }

  const repoExplorerLink = document.getElementById("open-repo-explorer");
  if (repoExplorerLink) {
    repoExplorerLink.href = `/explorer.html?analysisId=${encodeURIComponent(analysisId)}`;
    repoExplorerLink.classList.remove("hidden");
  }
  exportUrls = payload.exportUrls;
  currentDiagrams = payload.analysis.diagrams || {};
  currentDiagramKey = "architecture";
  lastDocumentation = payload.analysis.documentation || "";

  renderMetrics(payload);
  renderSourceProfile(payload.source, payload.comparisonContext);
  renderPlatformSignals(payload.analysis.platformSignals || []);
  explanationElement.textContent = sanitize(payload.analysis.explanation);
  documentationElement.textContent = sanitize(payload.analysis.documentation);
  renderFrameworks(payload.analysis.summary);
  renderEntrypoints(payload.analysis.summary);
  renderLanguages(payload.analysis.summary);
  renderFindings(payload.analysis.quality);
  renderHotspots(payload.analysis.quality);
  renderModules(payload.analysis.modules);
  renderDependencies(payload.analysis.dependencies);
  renderRelationships(payload.analysis.relationships);
  renderFiles(payload.analysis.fileHighlights);
  renderComparison(payload.comparison, payload.comparisonContext);
  renderLearning(payload.analysis.learningGuide, payload.source);

  resultsElement.classList.remove("hidden");
  renderDemoTour(payload.source?.type === "demo");
  refreshMotionTargets(resultsElement);
  markStreamsLive();
  await setActiveDiagram("architecture");
  resetChat();
  appendChatBubble(
    "system",
    "LumenStack indexed the repository. Ask about a feature, file, module, or how the project works."
  );
  stopMetricsTicker();
  updateMetricsRibbon({
    engine: "Review ready",
    source: payload.source?.workspaceLabel || payload.source?.name || "Workspace indexed",
    throughput: (payload.analysis?.summary?.codeFiles || 0) * 2 + 20,
    latency: 110 + Math.random() * 75,
    modules: payload.analysis?.modules?.length || 0,
    confidence: Math.max(78, Math.min(98, Math.round((payload.analysis?.quality?.score || 70) * 0.9)))
  });
}

async function restoreLastAnalysis() {
  const generation = analysisGeneration;
  let savedAnalysisId = "";
  try {
    savedAnalysisId = window.localStorage.getItem("lumenstack-last-analysis-id") || "";
  } catch {
    return;
  }
  if (!/^[a-f\d-]{36}$/i.test(savedAnalysisId)) return;

  try {
    const payload = await requestJsonWithRetry(
      `/api/analysis/${encodeURIComponent(savedAnalysisId)}`,
      { headers: { Accept: "application/json" } },
      { retries: 0, fallbackMessage: "The previous analysis session is unavailable." }
    );
    if (generation !== analysisGeneration) return;
    await renderAnalysisPayload(payload);
    if (generation !== analysisGeneration) return;
    setStatus("Previous repository analysis restored. Your study progress remains on this browser.", "success");
    resultsElement.scrollIntoView({ behavior: "auto", block: "start" });
  } catch {
    if (generation !== analysisGeneration) return;
    try {
      window.localStorage.removeItem("lumenstack-last-analysis-id");
    } catch {
      // Expired sessions do not prevent a fresh analysis.
    }
    setStatus("The previous analysis session expired. Run the repository again to continue.", "error");
  }
}

function syncDiagramThemeFromDocument() {
  currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  configureMermaid(currentTheme);
}

syncDiagramThemeFromDocument();
new MutationObserver(() => {
  const nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

  if (nextTheme === currentTheme) {
    return;
  }

  syncDiagramThemeFromDocument();
  if (currentDiagrams[currentDiagramKey]) {
    renderCurrentDiagram();
  }
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"]
});

setupDropzone(dropzone, uploadInput, uploadCaption, "No file selected.");
setupDropzone(baselineDropzone, baselineUploadInput, baselineUploadCaption, "No baseline selected.");
setupMotionObserver();
setupParallax();
setupScrollProgress();
setupAmbientParticles();
setupPromptRotator();
setupHeroDeviceSlider();
bindDeviceActions();
setupTouchEffects();
resetChat();
applyWorkspacePresetFromLocation();

compareToggle.addEventListener("change", () => {
  compareFields.classList.toggle("hidden", !compareToggle.checked);
});

clearButton.addEventListener("click", () => {
  resetFormState();
  resetAnalysisState();
});

diagramTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveDiagram(tab.dataset.diagram);
  });
});

copyMermaidButton.addEventListener("click", () => {
  const diagram = currentDiagrams[currentDiagramKey] || "";

  if (!diagram) {
    setStatus("No diagram is available yet.", "error");
    return;
  }

  navigator.clipboard.writeText(diagram)
    .then(() => setStatus("Diagram copied.", "success"))
    .catch(() => setStatus("Clipboard access failed.", "error"));
});

copyDocsButton.addEventListener("click", () => {
  if (!lastDocumentation) {
    setStatus("No documentation is available yet.", "error");
    return;
  }

  navigator.clipboard.writeText(lastDocumentation)
    .then(() => setStatus("Documentation copied.", "success"))
    .catch(() => setStatus("Clipboard access failed.", "error"));
});

document.getElementById("copy-presentation").addEventListener("click", async () => {
  const status = document.getElementById("learning-copy-status");
  try {
    await navigator.clipboard.writeText(document.getElementById("presentation-script").textContent);
    status.textContent = "Talk track copied.";
  } catch {
    status.textContent = "Clipboard access is unavailable in this browser.";
  }
});

downloadReportButton.addEventListener("click", async () => {
  try {
    await downloadExport(exportUrls?.markdown, "lumenstack-report.md");
    setStatus("Markdown report downloaded.", "success");
  } catch (error) {
    setStatus(error.message || "Markdown export failed.", "error");
  }
});

downloadJsonButton.addEventListener("click", async () => {
  try {
    await downloadExport(exportUrls?.json, "lumenstack-report.json");
    setStatus("JSON export downloaded.", "success");
  } catch (error) {
    setStatus(error.message || "JSON export failed.", "error");
  }
});

zoomOutDiagramButton?.addEventListener("click", async () => {
  currentDiagramZoom = Math.max(0.5, Number((currentDiagramZoom - 0.15).toFixed(2)));
  applyDiagramZoom();
});

zoomResetDiagramButton?.addEventListener("click", async () => {
  currentDiagramZoom = 1;
  applyDiagramZoom();
});

zoomInDiagramButton?.addEventListener("click", async () => {
  currentDiagramZoom = Math.min(2.2, Number((currentDiagramZoom + 0.15).toFixed(2)));
  applyDiagramZoom();
});

topChatForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = topChatInput?.value.trim() || "";

  if (!question) {
    setTopChatAnswer("Type your question first and I will answer right here.", "idle");
    return;
  }

  setTopChatAnswer("Thinking...", "loading");
  updateMetricsRibbon({
    engine: "Assistant",
    source: "Top-level product Q&A",
    latency: 130 + Math.random() * 70
  });

  try {
    const payload = await requestJsonWithRetry(
      "/api/system-chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          analysisId: analysisId || undefined
        })
      },
      {
        retries: 2,
        retryDelayMs: 1200,
        fallbackMessage: "System chat failed because the server returned an unexpected response.",
        onRetry: ({ attempt, retries }) => {
          updateMetricsRibbon({
            source: `Top assistant reconnect (${attempt}/${retries + 1})`,
            latency: 180 + attempt * 60 + Math.random() * 55
          });
          setStatus(`Top assistant reconnecting... (${attempt}/${retries + 1})`, "loading");
        }
      }
    );

    setTopChatAnswer(payload.answer || "I could not generate an answer right now.", "ready");
    if (topChatInput) {
      topChatInput.value = "";
    }
    updateMetricsRibbon({
      source: "Top assistant answered",
      confidence: Math.max(82, metricsState.confidence)
    });
    setStatus(
      payload.aiStatus === "live"
        ? "Top assistant answered in live mode."
        : getAiFallbackStatus("Top assistant", payload),
      "success"
    );
  } catch (error) {
    const message = normalizeRequestError(error, "System chat");
    updateMetricsRibbon({
      source: "Top assistant retry needed",
      confidence: Math.max(72, metricsState.confidence - 5)
    });
    setTopChatAnswer(message, "error");
    setStatus(message, "error");
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = chatQuestionInput.value.trim();

  if (!analysisId) {
    setStatus("Run an analysis before using chat.", "error");
    return;
  }

  if (!question) {
    return;
  }

  appendChatBubble("user", question);
  chatQuestionInput.value = "";
  updateMetricsRibbon({
    engine: "Assistant",
    source: "Repo chat in progress",
    latency: 115 + Math.random() * 70
  });

  try {
    const payload = await requestJsonWithRetry(
      "/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          analysisId,
          question
        })
      },
      {
        retries: 2,
        retryDelayMs: 1000,
        fallbackMessage: "Chat failed because the server returned an unexpected response.",
        onRetry: ({ attempt, retries }) => {
          updateMetricsRibbon({
            source: `Repo chat reconnect (${attempt}/${retries + 1})`,
            latency: 170 + attempt * 45 + Math.random() * 45
          });
          setStatus(`Repo chat reconnecting... (${attempt}/${retries + 1})`, "loading");
        }
      }
    );

    appendChatBubble("system", payload.answer, payload.citations || []);
    updateMetricsRibbon({
      source: "Repo chat answered",
      confidence: Math.max(81, metricsState.confidence)
    });
    setStatus(
      payload.aiStatus === "live"
        ? "Chat answered with live AI support and repository evidence."
        : getAiFallbackStatus("Repo chat", payload),
      "success"
    );
  } catch (error) {
    const message = normalizeRequestError(error, "Repo chat");
    updateMetricsRibbon({
      source: "Repo chat retry needed",
      confidence: Math.max(72, metricsState.confidence - 5)
    });
    appendChatBubble("system", message);
    setStatus(message, "error");
  }
});

const demoAnalysisButton = document.getElementById("load-demo-analysis");
demoAnalysisButton.addEventListener("click", async () => {
  const generation = ++analysisGeneration;
  demoAnalysisButton.disabled = true;
  resetAnalysisState({ preserveStoredAnalysis: true });
  resultsElement.classList.add("hidden");
  showOverlay("Loading the bundled sample repository.");
  setStatus("Preparing the sample project and its source-linked walkthrough...", "loading");

  try {
    const payload = await requestJsonWithRetry("/api/demo-analysis", {
      method: "POST",
      headers: { Accept: "application/json" }
    }, {
      retries: 1,
      retryDelayMs: 700,
      fallbackMessage: "The guided sample could not be loaded. Try again or analyze a repository URL."
    });
    if (generation !== analysisGeneration) return;
    await renderAnalysisPayload(payload);
    setStatus("Sample loaded. LumenStack analyzed its bundled example; no external AI request was made.", "success");
    resultsElement.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    hideOverlay("Guided sample ready.");
  } catch (error) {
    if (generation !== analysisGeneration) return;
    stopMetricsTicker();
    setStatus(normalizeRequestError(error, "Guided sample"), "error");
    hideOverlay("Sample loading stopped.");
  } finally {
    demoAnalysisButton.disabled = false;
  }
});
demoAnalysisButton.disabled = false;

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const generation = ++analysisGeneration;
  const formData = new FormData(form);
  formData.set("compareMode", compareToggle.checked ? "1" : "0");
  resetAnalysisState({ preserveStoredAnalysis: true });
  resultsElement.classList.add("hidden");
  showOverlay(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
  updateMetricsRibbon({
    engine: "Initializing",
    source: "Preparing source intake",
    throughput: 24,
    latency: 360,
    modules: 0,
    confidence: 88
  });
  startMetricsTicker();
  setStatus(
    "Scanning repository structure, calculating risks, generating diagrams, and preparing codebase chat...",
    "loading"
  );

  try {
    const payload = await requestJsonWithRetry(
      "/api/analyze",
      {
        method: "POST",
        body: formData
      },
      {
        retries: 3,
        retryDelayMs: 1500,
        fallbackMessage: "Analysis failed because the server returned an unexpected response.",
        onRetry: ({ attempt, retries }) => {
          updateMetricsRibbon({
            source: `Service wake retry (${attempt}/${retries + 1})`,
            latency: 320 + attempt * 80 + Math.random() * 60
          });
          setStatus(`Service warming up... retrying analysis (${attempt}/${retries + 1})`, "loading");
        }
      }
    );

    if (generation !== analysisGeneration) return;
    await renderAnalysisPayload(payload);

    setStatus(
      payload.analysis.aiStatus === "live"
        ? `Analysis complete. ${payload.analysis.platformSignals?.length || 0} platform signals, review layers, chat, and exports are ready.`
        : `Analysis complete. ${payload.analysis.platformSignals?.length || 0} platform signals, review layers, chat, and exports are ready. ${getAiFallbackStatus("Analysis", payload.analysis)}`,
      "success"
    );
    const resultBounds = resultsElement.getBoundingClientRect();
    const needsReveal = resultBounds.top < 0 || resultBounds.top > window.innerHeight * 0.45;
    if (needsReveal) {
      resultsElement.scrollIntoView({
        behavior: window.matchMedia("(max-width: 760px)").matches ? "auto" : "smooth",
        block: "start"
      });
    }
    hideOverlay("Architecture window opened.");
  } catch (error) {
    if (generation !== analysisGeneration) return;
    stopMetricsTicker();
    updateMetricsRibbon({
      engine: "Recovery",
      source: "Analysis retry required",
      confidence: Math.max(70, metricsState.confidence - 8)
    });
    setStatus(normalizeRequestError(error, "Analysis"), "error");
    hideOverlay("Analysis window closed.");
  }
});

document.addEventListener("lumenstack:themechange", () => {
  if (!resultsElement?.classList.contains("hidden") && currentDiagrams[currentDiagramKey]) {
    renderCurrentDiagram();
  }
});

resetFormState();
updateMetricsRibbon(metricsState);
restoreLastAnalysis();
