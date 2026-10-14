(function () {
  const themeStorageKey = "lumenstack-theme";
  const root = document.documentElement;
  const themePreferenceQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

  function getLockedTheme() {
    const lockedTheme = document.body?.dataset.themeLock || root.dataset.themeLock || "";
    return lockedTheme === "dark" || lockedTheme === "light" ? lockedTheme : "";
  }

  function bindMediaQueryChange(query, listener) {
    if (!query || typeof listener !== "function") {
      return;
    }

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", listener);
      return;
    }

    if (typeof query.addListener === "function") {
      query.addListener(listener);
    }
  }

  function getStoredTheme() {
    try {
      return window.localStorage.getItem(themeStorageKey) || "";
    } catch {
      return "";
    }
  }

  function getPreferredTheme() {
    const lockedTheme = getLockedTheme();

    if (lockedTheme) {
      return lockedTheme;
    }

    const storedTheme = getStoredTheme();

    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }

    return themePreferenceQuery?.matches ? "dark" : "light";
  }

  function updateThemeToggle(theme) {
    const toggleButton = document.getElementById("theme-toggle");
    const darkModeEnabled = theme === "dark";
    const lockedTheme = getLockedTheme();

    if (toggleButton) {
      let track = toggleButton.querySelector(".theme-toggle-track");
      let label = toggleButton.querySelector("#theme-toggle-label");

      if (!track || !label) {
        track = document.createElement("span");
        track.className = "theme-toggle-track";
        track.setAttribute("aria-hidden", "true");
        const thumb = document.createElement("span");
        thumb.className = "theme-toggle-thumb";
        track.appendChild(thumb);
        label = document.createElement("span");
        label.id = "theme-toggle-label";
        toggleButton.replaceChildren(track, label);
      }

      toggleButton.hidden = Boolean(lockedTheme);
      toggleButton.disabled = Boolean(lockedTheme);
      toggleButton.setAttribute("aria-pressed", String(darkModeEnabled));
      toggleButton.setAttribute(
        "aria-label",
        darkModeEnabled ? "Switch to light mode" : "Switch to dark mode"
      );
    }

    const label = document.getElementById("theme-toggle-label");
    if (label) {
      label.textContent = darkModeEnabled ? "Light Mode" : "Dark Mode";
    }
  }

  function applyTheme(theme, options = {}) {
    const { persist = true } = options;
    const lockedTheme = getLockedTheme();
    const nextTheme = lockedTheme || (theme === "dark" ? "dark" : "light");

    root.setAttribute("data-theme", nextTheme);
    document.body?.setAttribute("data-theme", nextTheme);
    updateThemeToggle(nextTheme);
    document.dispatchEvent(new CustomEvent("lumenstack:themechange", { detail: { theme: nextTheme } }));

    if (persist && !lockedTheme) {
      try {
        window.localStorage.setItem(themeStorageKey, nextTheme);
      } catch {
        // Ignore localStorage failures in restricted browser modes.
      }
    }
  }

  applyTheme(getPreferredTheme(), { persist: false });

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(getPreferredTheme(), { persist: false });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#theme-toggle")) {
      return;
    }

    if (getLockedTheme()) {
      return;
    }

    const currentTheme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  });

  bindMediaQueryChange(themePreferenceQuery, (event) => {
    if (getLockedTheme()) {
      return;
    }

    if (getStoredTheme()) {
      return;
    }

    applyTheme(event.matches ? "dark" : "light", { persist: false });
  });
})();
