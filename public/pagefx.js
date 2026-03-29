const introStorageKey = "lumenstack-intro-played";

function shouldSkipIntro() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }

  try {
    if (window.sessionStorage.getItem(introStorageKey) === "1") {
      return true;
    }

    window.sessionStorage.setItem(introStorageKey, "1");
  } catch {
    // Ignore storage failures and continue with the intro.
  }

  return false;
}

function createIntroElement() {
  const intro = document.createElement("div");
  intro.className = "page-intro";
  intro.setAttribute("aria-hidden", "true");
  intro.innerHTML = `
    <div class="page-intro-panels" aria-hidden="true">
      <span class="page-intro-pane"></span>
      <span class="page-intro-pane"></span>
      <span class="page-intro-pane"></span>
      <span class="page-intro-pane"></span>
      <span class="page-intro-pane"></span>
    </div>
    <div class="page-intro-core">
      <span class="page-intro-badge">LumenStack AI</span>
      <strong class="page-intro-title">Opening the architecture window</strong>
      <p class="page-intro-text">
        Calibrating repo signals, review layers, and interactive system views.
      </p>
      <div class="page-intro-meta" aria-hidden="true">
        <span>Cross-platform intake</span>
        <span>Compare mode</span>
        <span>Codebase chat</span>
      </div>
    </div>
  `;
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
    }, 920);
  };

  document.body.classList.add("intro-active");
  document.body.appendChild(intro);

  window.requestAnimationFrame(() => {
    intro.classList.add("is-entered");
  });

  window.setTimeout(finishIntro, 1380);
  intro.addEventListener("pointerdown", finishIntro, { once: true });
  window.addEventListener("keydown", finishIntro, { once: true });
}

runPageIntro();
