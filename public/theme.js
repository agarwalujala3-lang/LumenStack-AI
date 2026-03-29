const themeToggleButton = document.getElementById("theme-toggle");
const themeToggleLabel = document.getElementById("theme-toggle-label");
const themeStorageKey = "lumenstack-theme";
const themePreferenceQuery = window.matchMedia("(prefers-color-scheme: dark)");

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

  return themePreferenceQuery.matches ? "dark" : "light";
}

function updateThemeToggle(theme) {
  if (!themeToggleButton || !themeToggleLabel) {
    return;
  }

  const darkModeEnabled = theme === "dark";
  themeToggleButton.setAttribute("aria-pressed", String(darkModeEnabled));
  themeToggleButton.setAttribute(
    "aria-label",
    darkModeEnabled ? "Switch to light mode" : "Switch to dark mode"
  );
  themeToggleLabel.textContent = darkModeEnabled ? "Light Mode" : "Dark Mode";
}

function applyTheme(theme, options = {}) {
  const { persist = true } = options;
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = nextTheme;
  updateThemeToggle(nextTheme);

  if (persist) {
    try {
      window.localStorage.setItem(themeStorageKey, nextTheme);
    } catch {
      // Ignore localStorage failures.
    }
  }
}

applyTheme(getPreferredTheme(), { persist: false });

themeToggleButton?.addEventListener("click", () => {
  applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
});

themePreferenceQuery.addEventListener("change", (event) => {
  if (getStoredTheme()) {
    return;
  }

  applyTheme(event.matches ? "dark" : "light", { persist: false });
});
