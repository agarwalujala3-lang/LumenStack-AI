(function () {
  const tabs = [...document.querySelectorAll("[data-result-view]")];
  const panels = [...document.querySelectorAll("[data-result-panel]")];
  const viewStorageKey = "lumenstack-result-view:v1";

  function activate(view, moveFocus = false) {
    for (const tab of tabs) {
      const selected = tab.dataset.resultView === view;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && moveFocus) tab.focus();
    }

    for (const panel of panels) {
      panel.hidden = panel.dataset.resultPanel !== view;
    }

    try {
      window.sessionStorage.setItem(viewStorageKey, view);
    } catch {
      // Tab selection remains usable when browser storage is restricted.
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab.dataset.resultView));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
      activate(tabs[nextIndex].dataset.resultView, true);
    });
  });

  let storedView = "";
  try {
    storedView = window.sessionStorage.getItem(viewStorageKey) || "";
  } catch {
    // The default overview is used when browser storage is restricted.
  }
  const initialView = tabs.some((tab) => tab.dataset.resultView === storedView)
    ? storedView
    : tabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.dataset.resultView || "overview";
  activate(initialView);
})();
