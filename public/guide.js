(function () {
  const steps = [
    {
      label: "Connect",
      title: "Start with a public Git URL or a ZIP archive.",
      copy: "Paste a supported HTTPS repository link, choose an optional branch, or upload a ZIP when the code should stay offline.",
      resultTitle: "A source snapshot ready to inspect",
      resultCopy: "The analyzer reads project files and maps the code it can identify.",
      action: "Choose a repository",
      href: "/#analyze-panel"
    },
    {
      label: "Understand",
      title: "Start with the summary, stack, and entrypoints.",
      copy: "The overview explains the repository's structure, primary language, detected frameworks, dependencies, and likely starting files.",
      resultTitle: "A concise explanation of the codebase",
      resultCopy: "Use the summary and key signals to introduce the project before opening individual files.",
      action: "See the analysis view",
      href: "/#analyze-panel"
    },
    {
      label: "Explore",
      title: "Follow the architecture map into source files.",
      copy: "Switch between readable diagrams, expand the directory tree, and open a file preview with its module and role.",
      resultTitle: "A navigable project structure",
      resultCopy: "Move from a module relationship to the source preview that implements it.",
      action: "Open repository explorer",
      href: "/explorer.html"
    },
    {
      label: "Present",
      title: "Turn what you learned into a clear walkthrough.",
      copy: "Ask a grounded question, compare a baseline, or export the generated notes and analysis as Markdown or JSON.",
      resultTitle: "A brief you can explain and share",
      resultCopy: "Keep the explanation, source references, diagrams, and review findings together.",
      action: "Start a repository review",
      href: "/#analyze-panel"
    }
  ];

  const buttons = [...document.querySelectorAll("[data-guide-step]")];
  const kicker = document.getElementById("guide-kicker");
  const title = document.getElementById("guide-title");
  const copy = document.getElementById("guide-copy");
  const resultTitle = document.getElementById("guide-result-title");
  const resultCopy = document.getElementById("guide-result-copy");
  const action = document.getElementById("guide-action");
  const resultIcon = document.querySelector(".guide-result-icon");

  function selectStep(index, focus = false) {
    const step = steps[index];
    if (!step) return;
    buttons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === index;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus();
    });
    kicker.textContent = `Step ${String(index + 1).padStart(2, "0")} · ${step.label}`;
    title.textContent = step.title;
    copy.textContent = step.copy;
    resultTitle.textContent = step.resultTitle;
    resultCopy.textContent = step.resultCopy;
    action.textContent = step.action;
    action.href = step.href;
    resultIcon.textContent = String(index + 1).padStart(2, "0");
  }

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => selectStep(index));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? steps.length - 1 : (index + (event.key === "ArrowRight" ? 1 : steps.length - 1)) % steps.length;
      selectStep(next, true);
    });
  });

  selectStep(0);
})();
