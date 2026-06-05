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

    await navigator.clipboard?.writeText(shareData.url);
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

  const actions = {
    share: shareSite,
    compare: openCompare,
    export: exportSampleReport,
    refresh: refreshOverview,
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
})();
