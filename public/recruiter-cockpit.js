(function () {
  const tabs = Array.from(document.querySelectorAll("[data-cockpit-tab]"));
  const modeLabel = document.getElementById("cockpit-mode-label");
  const score = document.getElementById("cockpit-score");
  const scoreCopy = document.getElementById("cockpit-score-copy");
  const proofList = document.getElementById("cockpit-proof-list");

  if (!tabs.length || !modeLabel || !score || !scoreCopy || !proofList) {
    return;
  }

  const modes = {
    recruiter: {
      label: "Recruiter View",
      score: "96",
      copy: "Strong portfolio signal: product polish, backend depth, and clear demo flow.",
      bullets: [
        "Shows full product thinking: acquisition, onboarding, analysis, chat, diagrams, exports.",
        "Uses AI as a workflow accelerator, not just as a generic text box.",
        "Creates a recruiter-friendly demo path with immediate visual and technical proof."
      ]
    },
    ai: {
      label: "AI Summary",
      score: "94",
      copy: "Highly indexable project story with explicit capabilities, stack, workflows, and structured metadata.",
      bullets: [
        "Schema.org metadata describes the app as a developer-focused software product.",
        "README content uses clear headings, capability language, and concrete workflow descriptions.",
        "Visible UI copy names the problem, solution, stack, and evaluation criteria."
      ]
    },
    engineering: {
      label: "Engineering View",
      score: "92",
      copy: "Practical service design with source ingestion, analysis sessions, exports, and fallback AI behavior.",
      bullets: [
        "Express routes separate source intake, analysis, chat, platform catalog, and export flows.",
        "Analyzer service produces modules, dependencies, relationships, diagrams, and quality findings.",
        "OpenAI integration degrades to local fallback summaries when API access is unavailable."
      ]
    }
  };

  function renderMode(modeName) {
    const mode = modes[modeName] || modes.recruiter;

    tabs.forEach((tab) => {
      const active = tab.dataset.cockpitTab === modeName;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    modeLabel.textContent = mode.label;
    score.textContent = mode.score;
    scoreCopy.textContent = mode.copy;
    proofList.innerHTML = mode.bullets.map((bullet) => `<li>${bullet}</li>`).join("");
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => renderMode(tab.dataset.cockpitTab));
  });

  const authButton = document.getElementById("demo-auth-button");
  const authStateLabel = document.getElementById("auth-state-label");
  const projectForm = document.getElementById("saved-project-form");
  const projectName = document.getElementById("saved-project-name");
  const projectRepo = document.getElementById("saved-project-repo");
  const projectList = document.getElementById("saved-projects-list");
  const storageKey = "lumenstack-demo-user";

  function getDemoUser() {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || "null");
    } catch {
      return null;
    }
  }

  function setDemoUser(user) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(user));
    } catch {
      // Local storage can fail in restricted browser modes.
    }
  }

  function renderProjects(projects) {
    if (!projectList) {
      return;
    }

    if (!projects.length) {
      projectList.innerHTML = '<p class="empty-state">No saved projects yet. Sign in and save one review.</p>';
      return;
    }

    projectList.innerHTML = projects
      .map((project) => {
        const updatedAt = new Date(project.updatedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric"
        });
        return `
          <article class="saved-project-card">
            <div>
              <strong>${project.name}</strong>
              <span>${project.repository}</span>
            </div>
            <p>${project.score}% architecture confidence</p>
            <small>${project.status} · ${updatedAt}</small>
          </article>
        `;
      })
      .join("");
  }

  async function loadProjects() {
    if (!projectList) {
      return;
    }

    const user = getDemoUser();
    if (!user) {
      renderProjects([]);
      return;
    }

    const response = await fetch(`/api/projects?userId=${encodeURIComponent(user.id)}`);
    const payload = await response.json();
    renderProjects(payload.projects || []);
  }

  authButton?.addEventListener("click", async () => {
    const response = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Recruiter" })
    });
    const payload = await response.json();
    setDemoUser(payload.user);
    authStateLabel.textContent = `Signed in: ${payload.user.name}`;
    authButton.textContent = "Recruiter signed in";
    await loadProjects();
  });

  projectForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    let user = getDemoUser();

    if (!user) {
      const response = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Recruiter" })
      });
      const payload = await response.json();
      user = payload.user;
      setDemoUser(user);
      authStateLabel.textContent = `Signed in: ${user.name}`;
      authButton.textContent = "Recruiter signed in";
    }

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        name: projectName.value,
        repository: projectRepo.value,
        score: 92,
        status: "Saved for recruiter review"
      })
    });
    const payload = await response.json();
    renderProjects(payload.projects || []);
  });

  const existingUser = getDemoUser();
  if (existingUser) {
    authStateLabel.textContent = `Signed in: ${existingUser.name}`;
    authButton.textContent = "Recruiter signed in";
  }
  loadProjects();
})();
