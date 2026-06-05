(function () {
  const themeStorageKey = "lumenstack-theme";
  const root = document.documentElement;
  const themePreferenceQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

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
    const storedTheme = getStoredTheme();

    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }

    return themePreferenceQuery?.matches ? "dark" : "light";
  }

  function updateThemeToggle(theme) {
    const toggleButton = document.getElementById("theme-toggle");
    const label = document.getElementById("theme-toggle-label");
    const darkModeEnabled = theme === "dark";

    if (toggleButton) {
      toggleButton.setAttribute("aria-pressed", String(darkModeEnabled));
      toggleButton.setAttribute(
        "aria-label",
        darkModeEnabled ? "Switch to light mode" : "Switch to dark mode"
      );
    }

    if (label) {
      label.textContent = darkModeEnabled ? "Light Mode" : "Dark Mode";
    }
  }

  function applyTheme(theme, options = {}) {
    const { persist = true } = options;
    const nextTheme = theme === "dark" ? "dark" : "light";

    root.setAttribute("data-theme", nextTheme);
    document.body?.setAttribute("data-theme", nextTheme);
    updateThemeToggle(nextTheme);

    if (persist) {
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

    const currentTheme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  });

  bindMediaQueryChange(themePreferenceQuery, (event) => {
    if (getStoredTheme()) {
      return;
    }

    applyTheme(event.matches ? "dark" : "light", { persist: false });
  });
})();
