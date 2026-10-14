(function () {
  const commands = [
    { label: "Run live analyzer", hint: "Open the repository intake form", url: "/#analyze-panel" },
    { label: "Open repository explorer", hint: "Browse analyzed files and architecture context", url: "/explorer.html" },
    { label: "Open quick guide", hint: "Follow the four-step repository review", url: "/guide.html" },
    { label: "Open product overview", hint: "See the product and its workflow", url: "/product.html" },
    { label: "Open provider workspaces", hint: "Use Git host and ZIP intake presets", url: "/workspaces.html" },
    { label: "Open integrations", hint: "Configure repository webhook paths", url: "/integrations.html" },
    { label: "Read case study", hint: "Recruiter-focused project narrative", url: "/case-study.html" },
    { label: "Try saved projects", hint: "Open saved review snapshots", url: "/saved-projects.html" },
    { label: "Contact Ujala", hint: "Email, LinkedIn, GitHub, portfolio", url: "/contact.html" },
    { label: "Download recruiter brief", hint: "Export a markdown summary", action: "export" },
    { label: "Share live site", hint: "Copy or share the deployment URL", action: "share" }
  ];

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

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openPalette();
    }

    if (event.key === "Escape") {
      closePalette();
    }
  });

  document.addEventListener("click", (event) => {
    const commandButton = event.target instanceof Element
      ? event.target.closest("[data-open-command], .command-result")
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

    if (commandButton.matches(".command-result")) {
      executeCommand(commands[Number(commandButton.dataset.commandIndex)]);
    }
  });

  input.addEventListener("input", () => renderCommands(input.value));

})();
