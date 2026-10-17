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

function clampNumber(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createIntroMotionField() {
  const field = document.createElement("div");
  field.className = "prism-intro-field";
  field.setAttribute("aria-hidden", "true");

  const canvas = document.createElement("canvas");
  canvas.className = "prism-intro-field-canvas";
  canvas.setAttribute("aria-hidden", "true");
  field.appendChild(canvas);

  const context = canvas.getContext("2d", { alpha: true });
  let frameId = 0;
  let running = false;
  let startTime = 0;
  let width = 1;
  let height = 1;
  let particles = [];

  function buildParticles() {
    particles = [];

    const laneCount = clampNumber(Math.round(height / 64), 14, 22);
    const pointsPerLane = clampNumber(Math.round(width / 24), 62, 116);

    for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
      const depth = laneIndex / (laneCount - 1);

      for (let pointIndex = 0; pointIndex < pointsPerLane; pointIndex += 1) {
        const progress = pointIndex / (pointsPerLane - 1);
        const brightness = 0.48 + Math.random() * 0.5;
        const size = 0.85 + (1 - depth) * 1.6 + Math.random() * 0.8;
        const drift = (Math.random() * 2 - 1) * (1.2 + (1 - depth) * 4.6);
        const sparkle = Math.random();

        particles.push({
          depth,
          progress,
          phase: Math.random() * Math.PI * 2,
          speed: 0.35 + Math.random() * 0.95,
          offset: drift,
          brightness,
          size,
          sparkle
        });
      }
    }
  }

  function resizeField() {
    const rect = field.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    const dpr = clampNumber(window.devicePixelRatio || 1, 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    if (context) {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    buildParticles();
  }

  function drawFrame(timestamp) {
    if (!running || !context) {
      return;
    }

    if (!startTime) {
      startTime = timestamp;
    }

    const elapsed = (timestamp - startTime) / 1000;
    const horizon = height * 0.24;
    const depthSpread = height * 0.72;

    context.clearRect(0, 0, width, height);

    for (const particle of particles) {
      const profile = Math.sin(particle.progress * Math.PI) * (1 - particle.depth * 0.48) * height * 0.25;
      const wavePrimary =
        Math.sin(
          particle.progress * Math.PI * (1.65 + particle.depth * 1.25) +
            elapsed * particle.speed +
            particle.phase
        ) *
        (8 + (1 - particle.depth) * 12);
      const waveSecondary =
        Math.sin(particle.progress * Math.PI * 7.2 - elapsed * 0.86 + particle.phase * 0.74) *
        (2.6 + (1 - particle.depth) * 4.4);
      const y =
        horizon - profile + Math.pow(particle.depth, 1.22) * depthSpread + wavePrimary + waveSecondary;
      const x =
        particle.progress * width +
        Math.sin(elapsed * 0.76 + particle.phase) * particle.offset +
        Math.sin(elapsed * 0.22 + particle.phase * 1.6) * (1.2 + (1 - particle.depth) * 4.2);

      if (x < -4 || x > width + 4 || y < -4 || y > height + 4) {
        continue;
      }

      const flicker = Math.sin(elapsed * (1.6 + particle.depth) + particle.phase) * 0.18;
      const alpha = clampNumber(particle.brightness + flicker, 0.14, 0.98);
      const blue = Math.round(214 + (1 - particle.depth) * 38);
      const size = particle.size + Math.sin(elapsed * 1.8 + particle.phase) * 0.14;

      context.fillStyle = `rgba(116, ${blue}, 255, ${alpha.toFixed(3)})`;
      context.fillRect(x, y, size, size);

      if (particle.sparkle > 0.986) {
        context.beginPath();
        context.fillStyle = `rgba(196, 247, 255, ${Math.min(0.9, alpha + 0.2).toFixed(3)})`;
        context.arc(x + size * 0.5, y + size * 0.5, 1.2 + size, 0, Math.PI * 2);
        context.fill();
      }
    }

    frameId = window.requestAnimationFrame(drawFrame);
  }

  const handleResize = () => {
    resizeField();
  };

  return {
    element: field,
    start() {
      if (running) {
        return;
      }

      running = true;
      startTime = 0;
      resizeField();
      frameId = window.requestAnimationFrame(drawFrame);
      window.addEventListener("resize", handleResize, { passive: true });
    },
    stop() {
      running = false;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    }
  };
}

function createIntroElement() {
  const intro = document.createElement("div");
  intro.className = "page-intro prism-intro";
  intro.setAttribute("aria-hidden", "true");

  const motionField = createIntroMotionField();

  const core = document.createElement("div");
  core.className = "prism-intro-core";
  core.innerHTML = `
    <div class="prism-intro-logo-copy">
      <img class="prism-intro-lockup prism-intro-lockup-main" src="/brand-lockup.svg" alt="" />
    </div>
  `;

  intro.appendChild(motionField.element);
  intro.appendChild(core);
  return {
    intro,
    startMotion: motionField.start,
    stopMotion: motionField.stop
  };
}

function runPageIntro() {
  if (!document.body || shouldSkipIntro()) {
    return;
  }

  const { intro, startMotion, stopMotion } = createIntroElement();
  let finished = false;
  let settled = false;
  let settleTimer = 0;
  let finishTimer = 0;

  const handleKeyDown = () => {
    finishIntro();
  };

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
    window.clearTimeout(settleTimer);
    window.clearTimeout(finishTimer);
    window.removeEventListener("keydown", handleKeyDown);
    stopMotion();
    settleIntro();
    intro.classList.add("is-leaving");
    window.setTimeout(() => {
      intro.remove();
      document.body.classList.remove("intro-active");
    }, 620);
  };

  document.body.classList.add("intro-active");
  document.body.appendChild(intro);

  window.requestAnimationFrame(() => {
    startMotion();
    intro.classList.add("is-entered");
  });

  settleTimer = window.setTimeout(settleIntro, 1500);
  finishTimer = window.setTimeout(finishIntro, 3200);
  intro.addEventListener("pointerdown", finishIntro, { once: true });
  window.addEventListener("keydown", handleKeyDown, { once: true });
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

  const shouldRunRouteTransition = consumeRouteTransition();

  if (shouldRunRouteTransition) {
    runRouteTransition();
    return;
  }

  if (document.body.classList.contains("app-home") && !shouldSkipIntro()) {
    runPageIntro();
  }
}

initPageFx();
