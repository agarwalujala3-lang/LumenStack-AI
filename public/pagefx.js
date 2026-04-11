const ROUTE_TRANSITION_KEY = "lumenstack-route-transition";
const CURSOR_POSITION_KEY = "lumenstack-cursor-position";

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

function queueRouteTransition() {
  safeSessionStorage(() => window.sessionStorage.setItem(ROUTE_TRANSITION_KEY, "1"));
}

function getStoredCursorPosition() {
  return safeSessionStorage(() => {
    const raw = window.sessionStorage.getItem(CURSOR_POSITION_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const x = Number(parsed?.x);
    const y = Number(parsed?.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    return { x, y };
  }, null);
}

function storeCursorPosition(x, y) {
  safeSessionStorage(() => {
    window.sessionStorage.setItem(CURSOR_POSITION_KEY, JSON.stringify({ x, y }));
  });
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

  return {
    badge: dataset.introBadge || "LumenStack AI",
    title: dataset.introTitle || "Opening the architecture window",
    text:
      dataset.introCopy || "Calibrating repo signals, review layers, and interactive system views."
  };
}

function createIntroShutters(container) {
  for (let index = 0; index < 8; index += 1) {
    const shutter = document.createElement("span");
    shutter.className = "prism-intro-shutter";
    shutter.style.setProperty("--shutter-delay", `${index * 55}ms`);
    shutter.style.setProperty("--shutter-shift-x", `${index % 2 === 0 ? -120 : 120}%`);
    shutter.style.setProperty("--shutter-shift-y", `${index < 4 ? -16 : 16}%`);
    container.appendChild(shutter);
  }
}

function createIntroElement() {
  const { badge, title, text } = getIntroCopy();
  const intro = document.createElement("div");
  intro.className = "page-intro prism-intro";
  intro.setAttribute("aria-hidden", "true");

  const shutters = document.createElement("div");
  shutters.className = "prism-intro-shutters";
  shutters.setAttribute("aria-hidden", "true");
  createIntroShutters(shutters);

  const scan = document.createElement("div");
  scan.className = "prism-intro-sweep";
  scan.setAttribute("aria-hidden", "true");

  const core = document.createElement("div");
  core.className = "prism-intro-core";
  core.innerHTML = `
    <div class="prism-intro-orbit" aria-hidden="true">
      <span class="prism-intro-ring ring-a"></span>
      <span class="prism-intro-ring ring-b"></span>
      <span class="prism-intro-ring ring-c"></span>
      <span class="prism-intro-trace trace-a"></span>
      <span class="prism-intro-trace trace-b"></span>
      <span class="prism-intro-trace trace-c"></span>
      <span class="prism-intro-node node-a"></span>
      <span class="prism-intro-node node-b"></span>
      <span class="prism-intro-node node-c"></span>
      <span class="prism-intro-node node-d"></span>
    </div>

    <div class="prism-intro-logo-copy">
      <span class="prism-intro-badge">${escapeHtml(badge)}</span>
      <div class="prism-intro-mark-stage">
        <span class="prism-intro-core-dot"></span>
        <img class="prism-intro-mark" src="/brand-favicon.svg" alt="" />
      </div>
      <img class="prism-intro-lockup" src="/brand-lockup.svg" alt="" />
      <p class="prism-intro-text">${escapeHtml(title)}</p>
    </div>

    <p class="prism-intro-subcopy">${escapeHtml(text)}</p>
  `;

  intro.appendChild(shutters);
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
    }, 1100);
  };

  document.body.classList.add("intro-active");
  document.body.appendChild(intro);

  window.requestAnimationFrame(() => {
    intro.classList.add("is-entered");
  });

  window.setTimeout(settleIntro, 2300);
  window.setTimeout(finishIntro, 4700);
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

function applyCursorKind(cursorCoreElement, cursorAuraElement, kind) {
  const kinds = ["action", "upload", "field"];
  kinds.forEach((entry) => {
    cursorCoreElement.classList.toggle(`is-${entry}`, entry === kind);
    cursorAuraElement.classList.toggle(`is-${entry}`, entry === kind);
  });
}

function resolveCursorKind(target) {
  if (!(target instanceof Element)) {
    return "";
  }

  if (target.closest(".upload-surface")) {
    return "upload";
  }

  if (target.closest("input:not([type='file']), textarea, select")) {
    return "field";
  }

  if (target.closest("a, button, .diagram-tab, .theme-toggle, .toggle-row")) {
    return "action";
  }

  return "";
}

function createCursorNode(className, id) {
  const element = document.createElement("div");
  element.id = id;
  element.className = className;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function initSharedCursorSystem() {
  if (!document.body || shouldSkipIntro() || !window.matchMedia("(pointer: fine)").matches) {
    return;
  }

  const cursorCore = document.getElementById("cursor-core") || createCursorNode("cursor-core", "cursor-core");
  const cursorAura = document.getElementById("cursor-aura") || createCursorNode("cursor-aura", "cursor-aura");
  const cursorTrail = document.getElementById("cursor-trail") || createCursorNode("cursor-trail", "cursor-trail");

  if (!cursorCore.isConnected || !cursorAura.isConnected || !cursorTrail.isConnected) {
    document.body.append(cursorCore, cursorAura, cursorTrail);
  }

  document.body.classList.add("cursor-enhanced");
  document.documentElement.classList.add("cursor-enhanced");
  document.documentElement.classList.remove("cursor-bootstrap");

  const storedPosition = getStoredCursorPosition();
  const target = storedPosition || {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };
  const core = { ...target };
  const aura = { ...target };
  let lastTrace = 0;
  let lastScrollY = window.scrollY;

  cursorCore.style.left = `${core.x}px`;
  cursorCore.style.top = `${core.y}px`;
  cursorAura.style.left = `${aura.x}px`;
  cursorAura.style.top = `${aura.y}px`;

  const initialTarget = document.elementFromPoint(target.x, target.y);
  if (initialTarget) {
    applyCursorKind(cursorCore, cursorAura, resolveCursorKind(initialTarget));
  }

  function spawnNode(className, styles = {}) {
    const node = document.createElement("span");
    node.className = className;
    Object.entries(styles).forEach(([property, value]) => {
      node.style[property] = value;
    });
    cursorTrail.appendChild(node);
    node.addEventListener("animationend", () => node.remove(), { once: true });
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
    storeCursorPosition(event.clientX, event.clientY);

    const now = performance.now();
    if (now - lastTrace > 38) {
      spawnNode("cursor-trace", {
        left: `${event.clientX}px`,
        top: `${event.clientY}px`
      });
      lastTrace = now;
    }
  });

  window.addEventListener("pointerdown", (event) => {
    storeCursorPosition(event.clientX, event.clientY);
  });

  window.addEventListener("scroll", () => {
    const delta = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;

    if (!delta) {
      return;
    }

    const intensity = Math.min(140, Math.abs(delta));
    const direction = delta > 0 ? 1 : -1;

    spawnNode("cursor-flow", {
      left: `${target.x}px`,
      top: `${target.y}px`,
      height: `${Math.min(200, 84 + intensity * 0.8)}px`,
      "--flow-start-shift": direction > 0 ? "-18px" : "18px",
      "--flow-end-shift": direction > 0 ? "-44px" : "44px"
    });

    const size = Math.min(88, 36 + intensity * 0.34);
    spawnNode("cursor-wave", {
      left: `${target.x}px`,
      top: `${target.y}px`,
      width: `${size}px`,
      height: `${size}px`,
      "--wave-scale": `${1.4 + intensity / 220}`
    });
  }, { passive: true });

  window.addEventListener("pointerover", (event) => {
    const kind = resolveCursorKind(event.target);
    applyCursorKind(cursorCore, cursorAura, kind);
  });
}

function initPageFx() {
  bindNavigationIntent();

  if (!document.body) {
    return;
  }

  initSharedCursorSystem();

  const shouldRunRouteTransition = consumeRouteTransition();

  if (shouldRunRouteTransition) {
    runRouteTransition();
    return;
  }

  if (!shouldSkipIntro()) {
    runPageIntro();
  }
}

initPageFx();
