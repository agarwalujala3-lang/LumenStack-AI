function shouldSkipIntro() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getIntroCopy() {
  const dataset = document.body?.dataset || {};
  const metaItems = String(dataset.introTags || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    badge: dataset.introBadge || "LumenStack AI",
    title: dataset.introTitle || "Opening the architecture window",
    text:
      dataset.introCopy || "Calibrating repo signals, review layers, and interactive system views.",
    metaItems: metaItems.length ? metaItems : ["Cross-platform intake", "Compare mode", "Codebase chat"]
  };
}

function getIntroGrid() {
  const columns = Math.max(8, Math.min(16, Math.ceil(window.innerWidth / 112)));
  const rows = Math.max(5, Math.min(9, Math.ceil(window.innerHeight / 122)));
  return { columns, rows };
}

function createIntroElement() {
  const { badge, title, text, metaItems } = getIntroCopy();
  const { columns, rows } = getIntroGrid();
  const intro = document.createElement("div");
  intro.className = "page-intro";
  intro.setAttribute("aria-hidden", "true");
  intro.style.setProperty("--intro-columns", String(columns));
  intro.style.setProperty("--intro-rows", String(rows));

  const panels = document.createElement("div");
  panels.className = "page-intro-panels";
  panels.setAttribute("aria-hidden", "true");

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const pane = document.createElement("span");
      pane.className = "page-intro-pane";
      pane.style.setProperty("--intro-delay", `${col * 52 + row * 14}ms`);
      pane.style.setProperty("--intro-shift", `${col % 2 === 0 ? 22 : -22}px`);
      pane.style.setProperty("--intro-tilt", `${row % 2 === 0 ? -4 : 4}deg`);
      panels.appendChild(pane);
    }
  }

  const scan = document.createElement("div");
  scan.className = "page-intro-scan";
  scan.setAttribute("aria-hidden", "true");

  const core = document.createElement("div");
  core.className = "page-intro-core";
  core.innerHTML = `
    <span class="page-intro-badge">${badge}</span>
    <strong class="page-intro-title">${title}</strong>
    <p class="page-intro-text">${text}</p>
    <div class="page-intro-meta" aria-hidden="true">
      ${metaItems.map((item) => `<span>${item}</span>`).join("")}
    </div>
  `;

  intro.appendChild(panels);
  intro.appendChild(scan);
  intro.appendChild(core);
  return intro;
}

function runPageIntro() {
  if (!document.body || shouldSkipIntro()) {
    return;
  }

  const intro = createIntroElement();
  let finished = false;

  const finishIntro = () => {
    if (finished) {
      return;
    }

    finished = true;
    intro.classList.add("is-leaving");
    window.setTimeout(() => {
      intro.remove();
      document.body.classList.remove("intro-active");
    }, 1500);
  };

  document.body.classList.add("intro-active");
  document.body.appendChild(intro);

  window.requestAnimationFrame(() => {
    intro.classList.add("is-entered");
  });

  window.setTimeout(finishIntro, 980);
  intro.addEventListener("pointerdown", finishIntro, { once: true });
  window.addEventListener("keydown", finishIntro, { once: true });
}

runPageIntro();
