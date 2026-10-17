(() => {
  const finePointer = window.matchMedia?.("(pointer: fine)");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const textEntrySelector = [
    "textarea",
    "[contenteditable='true']",
    "input:not([type])",
    "input[type='text']",
    "input[type='search']",
    "input[type='url']",
    "input[type='tel']",
    "input[type='email']",
    "input[type='password']",
    "input[type='number']",
  ].join(",");

  if (!finePointer?.matches || reducedMotion?.matches) {
    return;
  }

  const root = document.documentElement;
  const body = document.body;
  let core = document.getElementById("cursor-core");

  if (!core) {
    core = document.createElement("div");
    core.id = "cursor-core";
    core.className = "cursor-core";
    core.setAttribute("aria-hidden", "true");
    body.appendChild(core);
  }

  function isTextEntry(target) {
    return target instanceof Element && Boolean(target.closest(textEntrySelector));
  }

  function clearCursor() {
    root.classList.remove("cursor-enhanced");
    body.classList.remove("cursor-enhanced");
  }

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") {
      return;
    }

    core.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    core.classList.toggle("is-field", isTextEntry(document.elementFromPoint(event.clientX, event.clientY)));
    root.classList.add("cursor-enhanced");
    body.classList.add("cursor-enhanced");
  });

  root.addEventListener("pointerleave", clearCursor);
  window.addEventListener("blur", clearCursor);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearCursor();
    }
  });
})();
