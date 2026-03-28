const body = document.body;
const overlay = document.getElementById("analysis-overlay");
const overlayStatus = document.getElementById("overlay-status");
const scrollProgressBar = document.getElementById("scroll-progress-bar");
const ambientParticles = document.getElementById("ambient-particles");
const cursorCore = document.getElementById("cursor-core");
const cursorAura = document.getElementById("cursor-aura");
const cursorTrail = document.getElementById("cursor-trail");
const themeToggleButton = document.getElementById("theme-toggle");
const themeToggleLabel = document.getElementById("theme-toggle-label");
const promptRotator = document.getElementById("prompt-rotator");
const promptCycler = promptRotator?.closest(".prompt-cycler");
const form = document.getElementById("analyze-form");
const clearButton = document.getElementById("clear-form");
const compareToggle = document.getElementById("compare-toggle");
const compareFields = document.getElementById("compare-fields");
const uploadInput = document.getElementById("upload-input");
const baselineUploadInput = document.getElementById("baseline-upload-input");
const uploadCaption = document.getElementById("upload-caption");
const baselineUploadCaption = document.getElementById("baseline-upload-caption");
const dropzone = document.getElementById("dropzone");
const baselineDropzone = document.getElementById("baseline-dropzone");
const statusPanel = document.getElementById("status");
const statusText = statusPanel.querySelector("p");
const resultsElement = document.getElementById("results");
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
const diagramElement = document.getElementById("diagram");
const aiBadgeElement = document.getElementById("ai-badge");
const copyMermaidButton = document.getElementById("copy-mermaid");
const copyDocsButton = document.getElementById("copy-docs");
const downloadReportButton = document.getElementById("download-report");
const downloadJsonButton = document.getElementById("download-json");
const diagramTabs = [...document.querySelectorAll(".diagram-tab")];
const comparisonPanel = document.getElementById("comparison-panel");
const comparisonSummaryElement = document.getElementById("comparison-summary");
const comparisonStatsElement = document.getElementById("comparison-stats");
const comparisonFindingsElement = document.getElementById("comparison-findings");
const chatForm = document.getElementById("chat-form");
const chatQuestionInput = document.getElementById("chat-question");
const chatMessagesElement = document.getElementById("chat-messages");

let analysisId = "";
let exportUrls = null;
let currentDiagrams = {};
let currentDiagramKey = "architecture";
let lastDocumentation = "";
let overlayTimer = 0;
let overlayMessageTimer = 0;
let motionObserver = null;
let pointerHot = false;
let promptTimer = 0;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const themePreferenceQuery = window.matchMedia("(prefers-color-scheme: dark)");
const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
const themeStorageKey = "lumenstack-theme";
let currentTheme = "light";

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

function configureMermaid(theme) {
  if (!window.mermaid) {
    return;
  }

  const isDark = theme === "dark";
  window.mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: isDark
      ? {
          primaryColor: "#16363c",
          primaryTextColor: "#ecf8f5",
          primaryBorderColor: "#53d5c7",
          lineColor: "#53d5c7",
          secondaryColor: "#102328",
          tertiaryColor: "#0b181c",
          background: "#0b181c",
          mainBkg: "#11262b",
          fontFamily: "Bahnschrift, Aptos Display, Arial Narrow, sans-serif"
        }
      : {
          primaryColor: "#d9efec",
          primaryTextColor: "#132326",
          primaryBorderColor: "#0f6663",
          lineColor: "#0f6663",
          secondaryColor: "#fffdf8",
          tertiaryColor: "#f4efe6",
          background: "#f4efe6",
          mainBkg: "#fffdf8",
          fontFamily: "Bahnschrift, Aptos Display, Arial Narrow, sans-serif"
        }
  });
}

function sanitize(value) {
  return String(value ?? "");
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

function setStatus(message, state = "idle") {
  statusPanel.dataset.state = state;
  statusText.textContent = sanitize(message);
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

function getStoredTheme() {
  try {
    return window.localStorage.getItem(themeStorageKey) || "";
  } catch {
    return "";
  }
}

function getPreferredTheme() {
  const storedTheme = getStoredTheme();

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return themePreferenceQuery.matches ? "dark" : "light";
}

function updateThemeToggle() {
  if (!themeToggleButton || !themeToggleLabel) {
    return;
  }

  const darkModeEnabled = currentTheme === "dark";
  themeToggleButton.setAttribute("aria-pressed", String(darkModeEnabled));
  themeToggleButton.setAttribute(
    "aria-label",
    darkModeEnabled ? "Switch to light mode" : "Switch to dark mode"
  );
  themeToggleLabel.textContent = darkModeEnabled ? "Light Mode" : "Dark Mode";
}

async function applyTheme(theme, options = {}) {
  const { persist = true, rerender = true } = options;
  currentTheme = theme === "dark" ? "dark" : "light";
  body.dataset.theme = currentTheme;
  configureMermaid(currentTheme);
  updateThemeToggle();

  if (persist) {
    try {
      window.localStorage.setItem(themeStorageKey, currentTheme);
    } catch {
      // Ignore private-mode/localStorage failures.
    }
  }

  if (rerender && Object.keys(currentDiagrams).length) {
    try {
      await renderCurrentDiagram();
    } catch {
      // Keep the current view even if a rerender fails.
    }
  }
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

function bindSpotlight(element) {
  if (element.dataset.spotlightBound) {
    return;
  }

  element.dataset.spotlightBound = "true";
  element.addEventListener("pointermove", (event) => {
    const rect = element.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    element.style.setProperty("--mx", `${x}%`);
    element.style.setProperty("--my", `${y}%`);
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

  let index = 0;

  promptTimer = window.setInterval(() => {
    index = (index + 1) % rotatingPrompts.length;
    promptCycler.classList.remove("is-swapping");
    void promptCycler.offsetWidth;
    promptRotator.textContent = rotatingPrompts[index];
    promptCycler.classList.add("is-swapping");
  }, 2600);
}

function setupMagneticButtons() {
  if (prefersReducedMotion || !window.matchMedia("(pointer: fine)").matches) {
    return;
  }

  const buttons = document.querySelectorAll(".primary-button, .secondary-button, .ghost-button, .diagram-tab");

  buttons.forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - (rect.left + rect.width / 2);
      const y = event.clientY - (rect.top + rect.height / 2);
      button.style.transform = `translate3d(${x * 0.08}px, ${y * 0.08}px, 0)`;
    });

    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
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

function refreshSpotlights(root) {
  const elements = root.querySelectorAll(
    ".spotlight-card, .preview-card, .metric-card, .finding-card, .module-card, .dependency-item, .file-card, .relationship-item, .chat-bubble"
  );

  elements.forEach((element) => {
    element.classList.add("spotlight-card");
    bindSpotlight(element);
  });
}

function setupParallax() {
  if (
    prefersReducedMotion ||
    !window.matchMedia("(pointer: fine)").matches ||
    !window.matchMedia("(min-width: 1180px)").matches
  ) {
    return;
  }

  const parallaxTargets = [...document.querySelectorAll("[data-parallax]")];

  function update() {
    const viewport = window.innerHeight || 1;

    for (const target of parallaxTargets) {
      const factor = Number(target.dataset.parallax || "0");
      const rect = target.getBoundingClientRect();
      const distanceFromCenter = rect.top + rect.height / 2 - viewport / 2;
      const shift = distanceFromCenter * factor * -0.035;
      target.style.setProperty("--parallax-shift", `${shift}px`);
    }
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

function setupCursorSystem() {
  if (prefersReducedMotion || !window.matchMedia("(pointer: fine)").matches) {
    return;
  }

  body.classList.add("cursor-enhanced");

  const target = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };
  const core = { ...target };
  const aura = { ...target };
  let lastTrace = 0;
  let lastScrollY = window.scrollY;

  function spawnTrace(x, y) {
    const trace = createElement("span", "cursor-trace");
    trace.style.left = `${x}px`;
    trace.style.top = `${y}px`;
    cursorTrail.appendChild(trace);
    trace.addEventListener("animationend", () => trace.remove(), { once: true });
  }

  function spawnFlow(x, y, direction, intensity) {
    const flow = createElement("span", "cursor-flow");
    flow.style.left = `${x}px`;
    flow.style.top = `${y}px`;
    flow.style.height = `${Math.min(200, 84 + intensity * 0.8)}px`;
    flow.style.setProperty("--flow-start-shift", direction > 0 ? "-18px" : "18px");
    flow.style.setProperty("--flow-end-shift", direction > 0 ? "-44px" : "44px");
    cursorTrail.appendChild(flow);
    flow.addEventListener("animationend", () => flow.remove(), { once: true });
  }

  function spawnWave(x, y, intensity) {
    const wave = createElement("span", "cursor-wave");
    const size = Math.min(88, 36 + intensity * 0.34);
    wave.style.left = `${x}px`;
    wave.style.top = `${y}px`;
    wave.style.width = `${size}px`;
    wave.style.height = `${size}px`;
    wave.style.setProperty("--wave-scale", `${1.4 + intensity / 220}`);
    cursorTrail.appendChild(wave);
    wave.addEventListener("animationend", () => wave.remove(), { once: true });
  }

  function loop() {
    core.x += (target.x - core.x) * 0.3;
    core.y += (target.y - core.y) * 0.3;
    aura.x += (target.x - aura.x) * 0.16;
    aura.y += (target.y - aura.y) * 0.16;

    cursorCore.style.left = `${core.x}px`;
    cursorCore.style.top = `${core.y}px`;
    cursorAura.style.left = `${aura.x}px`;
    cursorAura.style.top = `${aura.y}px`;

    window.requestAnimationFrame(loop);
  }

  window.requestAnimationFrame(loop);

  window.addEventListener("pointermove", (event) => {
    target.x = event.clientX;
    target.y = event.clientY;

    const now = performance.now();
    if (now - lastTrace > 38) {
      spawnTrace(event.clientX, event.clientY);
      lastTrace = now;
    }
  });

  window.addEventListener("scroll", () => {
    const delta = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;

    if (!delta) {
      return;
    }

    const intensity = Math.min(140, Math.abs(delta));
    const direction = delta > 0 ? 1 : -1;
    spawnFlow(target.x, target.y, direction, intensity);
    spawnWave(target.x, target.y, intensity);
  }, { passive: true });

  window.addEventListener("pointerover", (event) => {
    pointerHot = Boolean(event.target.closest("a, button, input, label, .diagram-tab, .panel"));
    cursorAura.classList.toggle("is-hot", pointerHot);
  });
}

function renderMetrics(payload) {
  const { summary, modules, relationships, quality } = payload.analysis;
  const { source } = payload;

  resultTitleElement.textContent = `${source.name} intelligence brief`;
  sourcePillElement.textContent = `${source.name} / ${source.type}`;
  analysisTimeElement.textContent = formatTime();
  primaryLanguageElement.textContent = sanitize(summary.primaryLanguage || "-");
  animateCount(codeFilesElement, summary.codeFiles || 0);
  animateCount(dependencyCountElement, summary.dependencyCount || 0);
  animateCount(moduleCountElement, modules.length);
  animateCount(relationshipCountElement, relationships.length);
  animateCount(qualityScoreElement, quality.score);
  aiBadgeElement.textContent = payload.analysis.aiStatus === "live" ? "OpenAI" : "Fallback";
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
    item.appendChild(createElement("strong", "", entrypoint));
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
    item.appendChild(createElement("strong", "", hotspot.path));
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
    card.appendChild(
      createElement(
        "p",
        "",
        module.examples.length ? `Example files: ${module.examples.join(", ")}` : "No example files recorded."
      )
    );
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
    card.appendChild(createElement("strong", "", file.path));
    card.appendChild(createElement("p", "", file.role));

    const meta = createElement("div", "file-meta");
    const imports = file.imports.length ? file.imports.join(", ") : "none detected";
    meta.textContent = `${file.module} | imports: ${imports} | classes: ${file.classCount} | functions: ${file.functionCount}`;
    card.appendChild(meta);
    filesElement.appendChild(card);
  }
}

function renderComparison(comparison) {
  if (!comparison) {
    comparisonPanel.classList.add("hidden");
    return;
  }

  comparisonPanel.classList.remove("hidden");
  comparisonSummaryElement.textContent = sanitize(comparison.summary);

  clearChildren(comparisonStatsElement);
  const stats = [
    `Quality ${comparison.stats.scoreDelta >= 0 ? "+" : ""}${comparison.stats.scoreDelta}`,
    `Files ${comparison.stats.codeFilesDelta >= 0 ? "+" : ""}${comparison.stats.codeFilesDelta}`,
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
}

function appendChatBubble(kind, text, citations = []) {
  const bubble = createElement("article", `chat-bubble ${kind} spotlight-card`, text);

  if (citations.length) {
    const citationText = citations
      .slice(0, 4)
      .map((citation) => citation.path)
      .join(", ");
    bubble.appendChild(createElement("div", "chat-citations", `References: ${citationText}`));
  }

  chatMessagesElement.appendChild(bubble);
  refreshSpotlights(chatMessagesElement);
  chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
}

function resetChat() {
  clearChildren(chatMessagesElement);
  appendChatBubble("system", "Ask about architecture, files, modules, dependencies, or where logic lives.");
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
    diagramElement.innerHTML = svg;
  } catch {
    diagramElement.appendChild(createElement("pre", "text-block", diagram));
  }

  animateStream(diagramElement);
}

async function setActiveDiagram(key) {
  currentDiagramKey = key;

  for (const tab of diagramTabs) {
    tab.classList.toggle("active", tab.dataset.diagram === key);
  }

  await renderCurrentDiagram();
}

function resetFormState() {
  form.reset();
  compareFields.classList.add("hidden");
  setFileCaption(uploadInput, uploadCaption, "No file selected.");
  setFileCaption(baselineUploadInput, baselineUploadCaption, "No baseline selected.");
  setStatus("Waiting for a repository, ZIP upload, or compare baseline.", "idle");
}

function resetAnalysisState() {
  analysisId = "";
  exportUrls = null;
  currentDiagrams = {};
  currentDiagramKey = "architecture";
  comparisonPanel.classList.add("hidden");
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

applyTheme(getPreferredTheme(), { persist: false, rerender: false });

setupDropzone(dropzone, uploadInput, uploadCaption, "No file selected.");
setupDropzone(baselineDropzone, baselineUploadInput, baselineUploadCaption, "No baseline selected.");
setupMotionObserver();
setupParallax();
setupScrollProgress();
setupAmbientParticles();
setupPromptRotator();
setupMagneticButtons();
setupTouchEffects();
setupCursorSystem();
refreshSpotlights(document);
resetChat();

themeToggleButton?.addEventListener("click", async () => {
  await applyTheme(currentTheme === "dark" ? "light" : "dark");
});

themePreferenceQuery.addEventListener("change", async (event) => {
  if (getStoredTheme()) {
    return;
  }

  await applyTheme(event.matches ? "dark" : "light", { persist: false });
});

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

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        analysisId,
        question
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Chat failed.");
    }

    appendChatBubble("system", payload.answer, payload.citations || []);
    setStatus(
      payload.aiStatus === "live"
        ? "Chat answered with live AI support and repository evidence."
        : "Chat answered from the indexed repository context.",
      "success"
    );
  } catch (error) {
    appendChatBubble("system", error.message || "Chat failed.");
    setStatus(error.message || "Chat failed.", "error");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  resetAnalysisState();
  resultsElement.classList.add("hidden");
  showOverlay(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
  setStatus(
    "Scanning repository structure, calculating risks, generating diagrams, and preparing codebase chat...",
    "loading"
  );

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Analysis failed.");
    }

    analysisId = payload.analysisId;
    exportUrls = payload.exportUrls;
    currentDiagrams = payload.analysis.diagrams || {};
    lastDocumentation = payload.analysis.documentation || "";

    renderMetrics(payload);
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
    renderComparison(payload.comparison);

    resultsElement.classList.remove("hidden");
    refreshMotionTargets(resultsElement);
    refreshSpotlights(resultsElement);
    markStreamsLive();
    await setActiveDiagram("architecture");

    appendChatBubble(
      "system",
      "LumenStack indexed the repository. Ask follow-up questions like 'Where is routing handled?' or 'Which files look risky?'"
    );

    setStatus("Analysis complete. Review, compare, chat, and export are now available.", "success");
    resultsElement.scrollIntoView({ behavior: "smooth", block: "start" });
    hideOverlay("Architecture window opened.");
  } catch (error) {
    setStatus(error.message || "Analysis failed.", "error");
    hideOverlay("Analysis window closed.");
  }
});

resetFormState();
