(function () {
  function showToast(message) {
    let toast = document.getElementById("site-action-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "site-action-toast";
      toast.className = "site-action-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.hideTimer);
    showToast.hideTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Fall back to a temporary textarea for restricted browser contexts.
      }
    }

    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }

  function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function shareSite() {
    const shareData = {
      title: "LumenStack AI by Ujala Agarwal",
      text: "Recruiter-ready AI architecture intelligence workspace.",
      url: window.location.origin
    };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await copyTextToClipboard(shareData.url);
    showToast("Live site link copied.");
  }

  function openCompare() {
    const compareToggle = document.getElementById("compare-toggle");

    if (compareToggle) {
      compareToggle.checked = true;
      compareToggle.dispatchEvent(new Event("change", { bubbles: true }));
      document.getElementById("analyze-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Compare mode is ready in the analyzer.");
      return;
    }

    window.location.href = "/#analyze-panel";
  }

  function exportSampleReport() {
    downloadTextFile(
      "lumenstack-ai-recruiter-brief.md",
      [
        "# LumenStack AI Recruiter Brief",
        "",
        "Candidate: Ujala Agarwal",
        "Role target: Software Developer",
        "",
        "Highlights:",
        "- Premium multi-page recruiter website",
        "- AI architecture analysis workflow",
        "- Saved projects and demo auth flow",
        "- Mermaid diagrams, exports, and codebase chat",
        "- Express backend with static analysis services"
      ].join("\n")
    );
    showToast("Recruiter brief downloaded.");
  }

  function refreshOverview() {
    document.querySelectorAll("[data-updated-label]").forEach((element) => {
      element.textContent = "Updated just now";
    });
    showToast("Architecture overview refreshed.");
  }

  const useCases = {
    "pr-review": {
      label: "PR review mode",
      status: "PR review mode selected. Add current and baseline sources to compare merge risk.",
      compare: true,
      question: "What changed most between baseline and current architecture?"
    },
    "security-radar": {
      label: "Security radar",
      status: "Security radar selected. Run analysis to inspect risky boundaries, config, uploads, and dependency exposure.",
      compare: false,
      question: "Which files or modules look risky from a security perspective?"
    },
    "onboarding-guide": {
      label: "Onboarding guide",
      status: "Onboarding guide selected. Run analysis to explain modules, entrypoints, and system flow for a new developer.",
      compare: false,
      question: "Explain this codebase to a new developer."
    },
    "dependency-audit": {
      label: "Dependency audit",
      status: "Dependency audit selected. Run analysis to inspect manifests, package pressure, and upgrade risk.",
      compare: false,
      question: "Which dependencies shape this project the most?"
    },
    "migration-plan": {
      label: "Migration plan",
      status: "Migration plan selected. Run analysis to identify architecture zones before platform or framework changes.",
      compare: true,
      question: "What should be checked before migrating this application?"
    },
    "release-brief": {
      label: "Release brief",
      status: "Release brief selected. Run analysis and export a stakeholder-ready architecture decision report.",
      compare: true,
      question: "Create a release readiness summary for stakeholders."
    }
  };

  function launchUseCase(trigger) {
    const useCase = useCases[trigger?.dataset?.useCase] || useCases["pr-review"];
    const compareToggle = document.getElementById("compare-toggle");
    const statusText = document.querySelector("#status p");
    const chatQuestion = document.getElementById("chat-question");

    if (!document.getElementById("analyze-panel")) {
      window.location.href = `/?useCase=${encodeURIComponent(trigger?.dataset?.useCase || "pr-review")}#analyze-panel`;
      return;
    }

    if (compareToggle) {
      compareToggle.checked = useCase.compare;
      compareToggle.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (statusText) {
      statusText.textContent = useCase.status;
    }

    if (chatQuestion) {
      chatQuestion.placeholder = useCase.question;
    }

    document.getElementById("analyze-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(`${useCase.label} ready.`);
  }

  async function copyProofBrief() {
    const pitch = [
      "LumenStack AI is a production-minded architecture intelligence workspace that turns repositories into diagrams, quality signals, compare views, codebase chat, and exportable briefs.",
      "It demonstrates polished frontend product design, an Express analysis backend, security-conscious browser headers, automated audits, and live deployment readiness."
    ].join(" ");

    await copyTextToClipboard(pitch);
    showToast("Project pitch copied.");
  }

  const actions = {
    share: shareSite,
    compare: openCompare,
    export: exportSampleReport,
    "copy-proof-brief": copyProofBrief,
    refresh: refreshOverview,
    "use-case": launchUseCase,
    demo: () => {
      document.getElementById("concept-cockpit")?.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Opening the architecture cockpit preview.");
    },
    contact: () => {
      window.location.href = "mailto:agarwalujala3@gmail.com";
    }
  };

  document.addEventListener("click", async (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest("[data-live-action]")
      : null;

    if (!trigger) {
      return;
    }

    const action = actions[trigger.dataset.liveAction];
    if (!action) {
      return;
    }

    event.preventDefault();

    try {
      await action(trigger);
    } catch {
      showToast("Action could not complete in this browser.");
    }
  });


  const visualModes = {
    quality: {
      primaryLabel: '91 score',
      score: '91',
      scoreLabel: 'Ready',
      scoreCopy: 'Security, UX, audit, and deploy posture are trending upward.',
      trend: '+37%',
      release: '94%',
      nodeCount: '8 nodes',
      radar: 'Stable',
      ledgerA: '+37%',
      ledgerB: '08',
      progress: '78%',
      bars: ['48%', '64%', '58%', '78%', '88%', '96%']
    },
    security: {
      primaryLabel: '88 secure',
      score: '88',
      scoreLabel: 'Hardened',
      scoreCopy: 'Headers, upload controls, dependency pressure, and risky boundaries stay visible.',
      trend: '+42%',
      release: '92%',
      nodeCount: '10 nodes',
      radar: 'Protected',
      ledgerA: '+42%',
      ledgerB: '10',
      progress: '74%',
      bars: ['54%', '72%', '82%', '76%', '90%', '88%']
    },
    release: {
      primaryLabel: '94 ready',
      score: '94',
      scoreLabel: 'Ship',
      scoreCopy: 'Smoke checks, audit scripts, polished UI, and deployment evidence are bundled for review.',
      trend: '+51%',
      release: '97%',
      nodeCount: '12 nodes',
      radar: 'Launch',
      ledgerA: '+51%',
      ledgerB: '12',
      progress: '86%',
      bars: ['62%', '70%', '84%', '89%', '94%', '98%']
    }
  };

  function setVisualText(deck, selector, value) {
    const element = deck.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  }

  function activateVisualMode(modeName) {
    const deck = document.querySelector('.visual-intelligence-deck');

    if (!deck) {
      return;
    }

    const nextMode = visualModes[modeName] ? modeName : 'quality';
    const mode = visualModes[nextMode];
    deck.dataset.visualMode = nextMode;
    deck.style.setProperty('--visual-progress', mode.progress);

    setVisualText(deck, '[data-visual-primary-label]', mode.primaryLabel);
    setVisualText(deck, '[data-visual-score]', mode.score);
    setVisualText(deck, '[data-visual-score-label]', mode.scoreLabel);
    setVisualText(deck, '[data-visual-score-copy]', mode.scoreCopy);
    setVisualText(deck, '[data-visual-trend]', mode.trend);
    setVisualText(deck, '[data-visual-release]', mode.release);
    setVisualText(deck, '[data-visual-node-count]', mode.nodeCount);
    setVisualText(deck, '[data-visual-radar]', mode.radar);
    setVisualText(deck, '[data-visual-ledger-a]', mode.ledgerA);
    setVisualText(deck, '[data-visual-ledger-b]', mode.ledgerB);

    deck.querySelectorAll('.visual-bars i').forEach((bar, index) => {
      bar.style.setProperty('--bar', mode.bars[index] || mode.bars[mode.bars.length - 1]);
    });

    deck.querySelectorAll('[data-visual-mode-trigger]').forEach((button) => {
      const isActive = button.dataset.visualModeTrigger === nextMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest('[data-visual-mode-trigger]')
      : null;

    if (!trigger) {
      return;
    }

    event.preventDefault();
    activateVisualMode(trigger.dataset.visualModeTrigger);
    showToast(trigger.textContent.trim() + ' visual mode active.');
  });

  activateVisualMode('quality');
  const initialUseCase = new URLSearchParams(window.location.search).get("useCase");
  if (initialUseCase) {
    window.setTimeout(() => {
      launchUseCase({ dataset: { useCase: initialUseCase } });
    }, 150);
  }
})();
