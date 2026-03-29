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

  return {
    badge: dataset.introBadge || "LumenStack AI",
    title: dataset.introTitle || "Opening the architecture window",
    text:
      dataset.introCopy || "Calibrating repo signals, review layers, and interactive system views."
  };
}

function createIntroShutters(container) {
  for (let index = 0; index < 6; index += 1) {
    const shutter = document.createElement("span");
    shutter.className = "page-intro-shutter";
    shutter.style.setProperty("--shutter-delay", `${index * 70}ms`);
    shutter.style.setProperty("--shutter-shift", `${index < 3 ? -100 : 100}%`);
    container.appendChild(shutter);
  }
}

function createIntroElement() {
  const { badge, title, text } = getIntroCopy();
  const intro = document.createElement("div");
  intro.className = "page-intro";
  intro.setAttribute("aria-hidden", "true");

  const shutters = document.createElement("div");
  shutters.className = "page-intro-shutters";
  shutters.setAttribute("aria-hidden", "true");
  createIntroShutters(shutters);

  const scan = document.createElement("div");
  scan.className = "page-intro-scan";
  scan.setAttribute("aria-hidden", "true");

  const core = document.createElement("div");
  core.className = "page-intro-core";
  core.innerHTML = `
    <div class="page-intro-bloom" aria-hidden="true">
      <span class="page-intro-seed"></span>
      <span class="page-intro-orbit orbit-a"></span>
      <span class="page-intro-orbit orbit-b"></span>
      <span class="page-intro-orbit orbit-c"></span>
      <span class="page-intro-node node-a"></span>
      <span class="page-intro-node node-b"></span>
      <span class="page-intro-node node-c"></span>
      <span class="page-intro-node node-d"></span>
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

  window.setTimeout(settleIntro, 1500);
  window.setTimeout(finishIntro, 2900);
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
