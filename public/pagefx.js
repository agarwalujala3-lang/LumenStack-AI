const INTRO_SEEN_KEY = "lumenstack-intro-seen";
const ROUTE_TRANSITION_KEY = "lumenstack-route-transition";

function shouldSkipIntro() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function safeSessionStorage(action, fallback = null) {
  try {
    return action();
  } catch {
    return fallback;
  }
}

function hasSeenIntro() {
  return safeSessionStorage(() => window.sessionStorage.getItem(INTRO_SEEN_KEY) === "1", false);
}

function markIntroSeen() {
  safeSessionStorage(() => window.sessionStorage.setItem(INTRO_SEEN_KEY, "1"));
}

function queueRouteTransition() {
  safeSessionStorage(() => window.sessionStorage.setItem(ROUTE_TRANSITION_KEY, "1"));
}

function consumeRouteTransition() {
  return safeSessionStorage(() => {
    const shouldTransition = window.sessionStorage.getItem(ROUTE_TRANSITION_KEY) === "1";
    window.sessionStorage.removeItem(ROUTE_TRANSITION_KEY);
    return shouldTransition;
  }, false);
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
  const columns = Math.max(10, Math.min(16, Math.ceil(window.innerWidth / 128)));
  const rows = Math.max(6, Math.min(9, Math.ceil(window.innerHeight / 146)));
  return { columns, rows };
}

function buildIntroPanels(panels, columns, rows) {
  const centerColumn = (columns - 1) / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const pane = document.createElement("span");
      const distanceFromCenter = Math.abs(col - centerColumn);
      const horizontalDirection = col < centerColumn ? -1 : 1;
      const shift = Math.round((22 + distanceFromCenter * 5) * horizontalDirection);
      const delay = Math.round(distanceFromCenter * 38 + row * 12);

      pane.className = "page-intro-pane";
      pane.style.setProperty("--intro-delay", `${delay}ms`);
      pane.style.setProperty("--intro-shift", `${shift}px`);
      pane.style.setProperty(
        "--intro-lift",
        `${(row % 2 === 0 ? -1 : 1) * Math.round(6 + distanceFromCenter * 1.1)}px`
      );
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
  let settled = false;

  const settleIntro = () => {
    if (finished || settled) {
      return;
    }

    settled = true;
    intro.classList.add("is-settled");
  };

  const finishIntro = () => {
    if (finished) {
      return;
    }

    finished = true;
    settleIntro();
    intro.classList.add("is-leaving");
    window.setTimeout(() => {
      intro.remove();
      document.body.classList.remove("intro-active");
    }, 1380);
  };

  document.body.classList.add("intro-active");
  document.body.appendChild(intro);

  window.requestAnimationFrame(() => {
    intro.classList.add("is-entered");
  });

  window.setTimeout(settleIntro, 1080);
  window.setTimeout(finishIntro, 1980);
  intro.addEventListener("pointerdown", finishIntro, { once: true });
  window.addEventListener("keydown", finishIntro, { once: true });
}

function runRouteTransition() {
  if (!document.body || shouldSkipIntro()) {
    return;
  }

  const routeGlass = document.createElement("div");
  routeGlass.className = "page-route-glass";
  routeGlass.setAttribute("aria-hidden", "true");
  document.body.classList.add("route-enter");
  document.body.appendChild(routeGlass);

  window.requestAnimationFrame(() => {
    document.body.classList.add("route-enter-active");
    routeGlass.classList.add("is-active");
  });

  window.setTimeout(() => {
    document.body.classList.remove("route-enter", "route-enter-active");
    routeGlass.classList.add("is-leaving");
    window.setTimeout(() => {
      routeGlass.remove();
    }, 360);
  }, 720);
}

function isInternalAppLink(anchor) {
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return false;
  }

  let url;

  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) {
    return false;
  }

  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return false;
  }

  return true;
}

function bindNavigationIntent() {
  document.addEventListener("click", (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;

    if (!anchor || event.defaultPrevented) {
      return;
    }

    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (!isInternalAppLink(anchor)) {
      return;
    }

    queueRouteTransition();
  });
}

function initPageFx() {
  bindNavigationIntent();

  if (!document.body) {
    return;
  }

  const shouldRunIntro = !shouldSkipIntro() && !hasSeenIntro();
  const shouldRunRouteTransition = consumeRouteTransition();

  if (shouldRunIntro) {
    markIntroSeen();
    runPageIntro();
    return;
  }

  if (shouldRunRouteTransition) {
    runRouteTransition();
  }
}

initPageFx();
