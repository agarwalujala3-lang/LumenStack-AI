(function () {
  const commands = [
    { label: "Run live analyzer", hint: "Open the repository intake form", url: "/#analyze-panel" },
    { label: "Open product page", hint: "See product workflow and metrics", url: "/product.html" },
    { label: "Read case study", hint: "Recruiter-focused project narrative", url: "/case-study.html" },
    { label: "Try saved projects", hint: "Demo auth and saved reviews", url: "/saved-projects.html" },
    { label: "Contact Ujala", hint: "Email, LinkedIn, GitHub, portfolio", url: "/contact.html" },
    { label: "Download recruiter brief", hint: "Export a markdown summary", action: "export" },
    { label: "Share live site", hint: "Copy or share the deployment URL", action: "share" }
  ];

  const tourSteps = [
    {
      selector: ".concept-hero",
      title: "Premium product story",
      copy: "The first viewport explains the product clearly and gives recruiters immediate proof of UI quality."
    },
    {
      selector: "#concept-cockpit",
      title: "Architecture cockpit",
      copy: "This section mirrors a real SaaS workspace with evaluation, graph, compare, chat, and export surfaces."
    },
    {
      selector: "#auth-projects",
      title: "Saved projects",
      copy: "Demo auth and saved reviews show that the product direction goes beyond a static landing page."
    },
    {
      selector: "#analyze-panel",
      title: "Live analyzer",
      copy: "The actual analyzer remains available so visitors can test repository or ZIP analysis."
    }
  ];

  const cockpitPanels = {
    overview: {
      label: "System Architecture",
      detail: {
        evaluation: `
          <div class="confidence-block">
            <div class="health-ring compact"><strong>82%</strong></div>
            <div><strong>High</strong><p>Based on analysis of 3,142 files</p></div>
          </div>
          <h4>Top Strengths</h4>
          <ul class="positive-list">
            <li>Clear service boundaries</li>
            <li>Good separation of concerns</li>
            <li>Effective use of caching</li>
          </ul>
          <h4>Top Risks</h4>
          <ul class="risk-list">
            <li>High coupling between services</li>
            <li>Large Checkout Service component</li>
            <li>Missing error handling in 8 modules</li>
          </ul>
        `,
        components: `
          <div class="component-detail-grid">
            <article><strong>API Gateway</strong><span>Routes traffic and policy decisions.</span></article>
            <article><strong>Checkout</strong><span>Highest pressure module, 18 dependencies.</span></article>
            <article><strong>Payments</strong><span>External boundary with security review needs.</span></article>
            <article><strong>Data Layer</strong><span>PostgreSQL, Redis, and object storage.</span></article>
          </div>
        `
      }
    },
    architecture: { label: "3D System Flow" },
    evaluate: { label: "Release Readiness Simulator" },
    issues: { label: "Risk Queue" },
    dependencies: { label: "Dependency Pressure Map" },
    reports: { label: "Recruiter Report Pack" }
  };

  function createPalette() {
    const palette = document.createElement("div");
    palette.className = "command-palette";
    palette.setAttribute("aria-hidden", "true");
    palette.innerHTML = `
      <div class="command-panel" role="dialog" aria-label="Command palette">
        <div class="command-header">
          <strong>Command Center</strong>
          <span>Ctrl K</span>
        </div>
        <input id="command-input" type="search" placeholder="Search actions, pages, exports..." autocomplete="off" />
        <div id="command-results" class="command-results"></div>
      </div>
    `;
    document.body.appendChild(palette);
    return palette;
  }

  const palette = createPalette();
  const input = palette.querySelector("#command-input");
  const results = palette.querySelector("#command-results");

  function runLiveAction(actionName) {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.dataset.liveAction = actionName;
    document.body.appendChild(trigger);
    trigger.click();
    trigger.remove();
  }

  function renderCommands(query = "") {
    const normalized = query.trim().toLowerCase();
    const visibleCommands = commands.filter((command) => {
      return !normalized || `${command.label} ${command.hint}`.toLowerCase().includes(normalized);
    });

    results.innerHTML = visibleCommands
      .map((command, index) => `
        <button class="command-result" type="button" data-command-index="${commands.indexOf(command)}" ${index === 0 ? "data-active=\"true\"" : ""}>
          <strong>${command.label}</strong>
          <span>${command.hint}</span>
        </button>
      `)
      .join("");
  }

  function openPalette() {
    palette.classList.add("is-open");
    palette.setAttribute("aria-hidden", "false");
    renderCommands();
    window.setTimeout(() => input.focus(), 20);
  }

  function closePalette() {
    palette.classList.remove("is-open");
    palette.setAttribute("aria-hidden", "true");
  }

  function executeCommand(command) {
    if (!command) {
      return;
    }

    closePalette();

    if (command.url) {
      window.location.href = command.url;
      return;
    }

    if (command.action) {
      runLiveAction(command.action);
    }
  }

  function createTour() {
    const tour = document.createElement("div");
    tour.className = "guided-tour";
    tour.setAttribute("aria-hidden", "true");
    tour.innerHTML = `
      <div class="tour-card">
        <span id="tour-count"></span>
        <h2 id="tour-title"></h2>
        <p id="tour-copy"></p>
        <div class="tour-actions">
          <button class="secondary-button compact-button" type="button" data-tour-action="skip">Skip</button>
          <button class="primary-button compact-button" type="button" data-tour-action="next">Next</button>
        </div>
      </div>
    `;
    document.body.appendChild(tour);
    return tour;
  }

  const tour = createTour();
  let tourIndex = 0;

  function renderTourStep() {
    const step = tourSteps[tourIndex];
    const target = document.querySelector(step.selector);

    tour.querySelector("#tour-count").textContent = `${tourIndex + 1} / ${tourSteps.length}`;
    tour.querySelector("#tour-title").textContent = step.title;
    tour.querySelector("#tour-copy").textContent = step.copy;
    tour.querySelector("[data-tour-action='next']").textContent =
      tourIndex === tourSteps.length - 1 ? "Finish" : "Next";

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("tour-highlight");
      window.setTimeout(() => target.classList.remove("tour-highlight"), 1600);
    }
  }

  function startTour() {
    tourIndex = 0;
    tour.classList.add("is-open");
    tour.setAttribute("aria-hidden", "false");
    renderTourStep();
  }

  function closeTour() {
    tour.classList.remove("is-open");
    tour.setAttribute("aria-hidden", "true");
  }

  function nextTourStep() {
    if (tourIndex >= tourSteps.length - 1) {
      closeTour();
      return;
    }

    tourIndex += 1;
    renderTourStep();
  }

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openPalette();
    }

    if (event.key === "Escape") {
      closePalette();
      closeTour();
    }
  });

  document.addEventListener("click", (event) => {
    const commandButton = event.target instanceof Element
      ? event.target.closest("[data-open-command], .command-result, [data-start-tour], [data-tour-action]")
      : null;

    if (!commandButton) {
      if (event.target === palette) {
        closePalette();
      }
      return;
    }

    if (commandButton.matches("[data-open-command]")) {
      openPalette();
      return;
    }

    if (commandButton.matches("[data-start-tour]")) {
      startTour();
      return;
    }

    if (commandButton.matches(".command-result")) {
      executeCommand(commands[Number(commandButton.dataset.commandIndex)]);
      return;
    }

    if (commandButton.dataset.tourAction === "skip") {
      closeTour();
      return;
    }

    if (commandButton.dataset.tourAction === "next") {
      nextTourStep();
    }
  });

  input.addEventListener("input", () => renderCommands(input.value));

  const conceptTabs = Array.from(document.querySelectorAll("[data-concept-tab]"));
  const conceptPanels = Array.from(document.querySelectorAll("[data-concept-panel]"));
  const conceptViewLabel = document.getElementById("concept-view-label");
  const detailContent = document.getElementById("concept-detail-content");

  function renderConceptDetail(detailName = "evaluation") {
    if (!detailContent) {
      return;
    }

    const detail = cockpitPanels.overview.detail[detailName] || cockpitPanels.overview.detail.evaluation;
    detailContent.innerHTML = detail;
    document.querySelectorAll("[data-concept-detail]").forEach((button) => {
      button.classList.toggle("active", button.dataset.conceptDetail === detailName);
      button.setAttribute("aria-pressed", String(button.dataset.conceptDetail === detailName));
    });
  }

  function activateConceptPanel(panelName = "overview") {
    const nextPanel = cockpitPanels[panelName] ? panelName : "overview";

    conceptTabs.forEach((tab) => {
      const isActive = tab.dataset.conceptTab === nextPanel;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    conceptPanels.forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.conceptPanel !== nextPanel);
      panel.classList.toggle("is-switching", panel.dataset.conceptPanel === nextPanel);
    });

    if (conceptViewLabel) {
      conceptViewLabel.textContent = cockpitPanels[nextPanel].label;
    }
  }

  function updateSimulatorScore() {
    const inputs = Array.from(document.querySelectorAll("[data-sim-input]"));
    const score = document.getElementById("sim-score");
    const copy = document.getElementById("sim-copy");

    if (!inputs.length || !score || !copy) {
      return;
    }

    const values = inputs.map((input) => Number(input.value) || 0);
    const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    score.textContent = String(average);
    copy.textContent =
      average >= 86
        ? "Excellent release posture. This looks ready for stakeholder review."
        : average >= 74
          ? "Balanced release posture. Increase the lowest signal to improve confidence."
          : "Needs attention before release. Start with tests and security hygiene.";
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element
      ? event.target.closest("[data-concept-tab], [data-concept-detail]")
      : null;

    if (!target) {
      return;
    }

    if (target.matches("[data-concept-tab]")) {
      activateConceptPanel(target.dataset.conceptTab);
      return;
    }

    if (target.matches("[data-concept-detail]")) {
      renderConceptDetail(target.dataset.conceptDetail);
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target instanceof Element && event.target.matches("[data-sim-input]")) {
      updateSimulatorScore();
    }
  });

  renderConceptDetail();
  activateConceptPanel("overview");
  updateSimulatorScore();
})();
