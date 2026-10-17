(() => {
  const finePointer = window.matchMedia?.("(pointer: fine)");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  if (!finePointer?.matches || reducedMotion?.matches) {
    return;
  }

  const root = document.documentElement;
  const body = document.body;

  function getCursorElement(id, className) {
    let element = document.getElementById(id);

    if (!element) {
      element = document.createElement("div");
      element.id = id;
      element.className = className;
      element.setAttribute("aria-hidden", "true");
      body.appendChild(element);
    }

    return element;
  }

  const core = getCursorElement("cursor-core", "cursor-core");
  const aura = getCursorElement("cursor-aura", "cursor-aura");
  let targetX = 0;
  let targetY = 0;
  let auraX = 0;
  let auraY = 0;
  let animationFrame = 0;

  function updateAura() {
    auraX += (targetX - auraX) * 0.22;
    auraY += (targetY - auraY) * 0.22;
    aura.style.transform = `translate3d(${auraX}px, ${auraY}px, 0) translate(-50%, -50%)`;

    if (Math.abs(targetX - auraX) > 0.15 || Math.abs(targetY - auraY) > 0.15) {
      animationFrame = window.requestAnimationFrame(updateAura);
    } else {
      animationFrame = 0;
    }
  }

  function getCursorKind(target) {
    if (!(target instanceof Element)) {
      return "";
    }

    if (target.closest(".upload-surface")) {
      return "upload";
    }

    if (target.closest("textarea, [contenteditable='true'], input:not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio']):not([type='range']):not([type='file'])")) {
      return "field";
    }

    if (target.closest("a, button, select, input[type='checkbox'], input[type='radio'], .diagram-tab, .theme-toggle, .toggle-row")) {
      return "action";
    }

    return "";
  }

  function clearCursor() {
    root.classList.remove("cursor-enhanced");
    body.classList.remove("cursor-enhanced");
  }

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") {
      return;
    }

    targetX = event.clientX;
    targetY = event.clientY;
    if (!animationFrame) {
      auraX = targetX;
      auraY = targetY;
      aura.style.transform = `translate3d(${auraX}px, ${auraY}px, 0) translate(-50%, -50%)`;
    }
    core.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;

    const target = document.elementFromPoint(targetX, targetY);
    const kind = getCursorKind(target);

    ["action", "upload", "field"].forEach((state) => {
      core.classList.toggle(`is-${state}`, state === kind);
      aura.classList.toggle(`is-${state}`, state === kind);
    });
    root.classList.add("cursor-enhanced");
    body.classList.add("cursor-enhanced");

    if (!animationFrame) {
      animationFrame = window.requestAnimationFrame(updateAura);
    }
  });

  root.addEventListener("pointerleave", clearCursor);
  window.addEventListener("blur", clearCursor);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearCursor();
    }
  });
})();
