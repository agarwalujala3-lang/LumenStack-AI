function shouldSkipIntro() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character] || character;
  });
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
  const columns = Math.max(12, Math.min(22, Math.ceil(window.innerWidth / 94)));
  const rows = Math.max(7, Math.min(12, Math.ceil(window.innerHeight / 108)));
  return { columns, rows };
}

function buildIntroPanels(panels, columns, rows) {
  const centerColumn = (columns - 1) / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const pane = document.createElement("span");
      const distanceFromCenter = Math.abs(col - centerColumn);
      const horizontalDirection = col < centerColumn ? -1 : 1;
      const shift = Math.round((18 + distanceFromCenter * 5) * horizontalDirection);
      const delay = Math.round(distanceFromCenter * 34 + row * 10);

      pane.className = "page-intro-pane";
      pane.style.setProperty("--intro-delay", `${delay}ms`);
      pane.style.setProperty("--intro-shift", `${shift}px`);
      pane.style.setProperty("--intro-lift", `${(row % 2 === 0 ? -1 : 1) * (6 + distanceFromCenter)}px`);
      pane.style.setProperty("--intro-tilt", `${horizontalDirection * (2 + (row % 3))}deg`);
      panels.appendChild(pane);
    }
  }
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
  buildIntroPanels(panels, columns, rows);

  const scan = document.createElement("div");
  scan.className = "page-intro-scan";
  scan.setAttribute("aria-hidden", "true");

  const core = document.createElement("div");
  core.className = "page-intro-core";
  core.innerHTML = `
    <div class="page-intro-neural" aria-hidden="true">
      <span class="page-intro-pulse"></span>
      <span class="page-intro-seed"></span>
      <div class="page-intro-network">
        <span class="page-intro-orbit orbit-a"></span>
        <span class="page-intro-orbit orbit-b"></span>
        <span class="page-intro-orbit orbit-c"></span>
        <span class="page-intro-orbit orbit-d"></span>
        <span class="page-intro-orbit orbit-e"></span>
        <span class="page-intro-orbit orbit-f"></span>
        <span class="page-intro-node node-a"></span>
        <span class="page-intro-node node-b"></span>
        <span class="page-intro-node node-c"></span>
        <span class="page-intro-node node-d"></span>
        <span class="page-intro-node node-e"></span>
        <span class="page-intro-node node-f"></span>
      </div>
    </div>

    <div class="page-intro-logo-lockup">
      <div class="page-intro-logo-shell" aria-hidden="true">
        <img class="page-intro-logo-mark" src="/brand-mark.svg" alt="" />
      </div>
      <div class="page-intro-logo-copy">
        <span class="page-intro-badge">${escapeHtml(badge)}</span>
        <strong class="page-intro-title">LumenStack AI</strong>
        <p class="page-intro-text">${escapeHtml(title)}</p>
      </div>
    </div>

    <p class="page-intro-subcopy">${escapeHtml(text)}</p>
    <div class="page-intro-meta" aria-hidden="true">
      ${metaItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
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
    }, 1220);
  };

  document.body.classList.add("intro-active");
  document.body.appendChild(intro);

  window.requestAnimationFrame(() => {
    intro.classList.add("is-entered");
  });

  window.setTimeout(finishIntro, 1320);
  intro.addEventListener("pointerdown", finishIntro, { once: true });
  window.addEventListener("keydown", finishIntro, { once: true });
}

runPageIntro();
