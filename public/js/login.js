import {
  api,
  formatProviderLabel,
  setFlash,
  setToken
} from "./common.js";
import { initNebula, initRevealCards } from "./graphics.js";

initNebula();
initRevealCards();

const flashRoot = document.querySelector("#flash-root");
const loginForm = document.querySelector("#login-form");
const providerGrid = document.querySelector("#provider-grid");
const providerQuickForm = document.querySelector("#provider-quick-form");
const providerQuickTitle = document.querySelector("#provider-quick-title");
const phoneOtpLink = document.querySelector("#phone-otp-link");

const state = {
  providers: [],
  selectedProvider: ""
};

async function start() {
  try {
    const response = await api("/api/auth/providers", { auth: false });
    state.providers = response.providers || [];
  } catch {
    state.providers = [];
  }
  renderProviders();
}

function renderProviders() {
  const socialProviders = state.providers.filter((item) => ["google", "github", "linkedin"].includes(item.id));
  const useProviders = socialProviders.length
    ? socialProviders
    : [
        { id: "google", mode: "email-assisted" },
        { id: "github", mode: "email-assisted" },
        { id: "linkedin", mode: "email-assisted" }
      ];

  providerGrid.innerHTML = state.providers
    .filter((item) => useProviders.some((provider) => provider.id === item.id))
    .concat(useProviders.filter((provider) => !state.providers.some((item) => item.id === provider.id)))
    .map((provider) => `
      <button class="btn" data-provider="${provider.id}" type="button">
        ${formatProviderLabel(provider.id)} ${provider.mode === "oauth" ? "(OAuth)" : "(Quick)"}
      </button>
    `)
    .join("");

  providerGrid.querySelectorAll("[data-provider]").forEach((button) => {
    button.addEventListener("click", () => onSelectProvider(button.dataset.provider || ""));
  });

  if (phoneOtpLink) {
    const phoneEnabled = state.providers.some((item) => item.id === "phone");
    phoneOtpLink.classList.toggle("hidden", !phoneEnabled);
  }
}

function onSelectProvider(providerId) {
  const provider = state.providers.find((item) => item.id === providerId);
  if (!provider && !["google", "github", "linkedin"].includes(providerId)) {
    setFlash(flashRoot, "Provider is unavailable right now.", "error");
    return;
  }

  if (provider?.mode === "oauth") {
    window.location.href = `/api/auth/provider/start?provider=${encodeURIComponent(provider.id)}`;
    return;
  }

  state.selectedProvider = provider?.id || providerId;
  providerQuickTitle.textContent = `${formatProviderLabel(state.selectedProvider)} quick login`;
  providerQuickForm.classList.remove("hidden");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(loginForm).entries());
  setFlash(flashRoot, "Logging in...");
  try {
    const response = await api("/api/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload)
    });
    setToken(response.token);
    window.location.href = "/dashboard.html";
  } catch (error) {
    setFlash(flashRoot, error.message, "error");
  }
});

providerQuickForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedProvider) {
    setFlash(flashRoot, "Select a provider first.", "error");
    return;
  }

  const payload = Object.fromEntries(new FormData(providerQuickForm).entries());
  payload.provider = state.selectedProvider;
  setFlash(flashRoot, "Signing in with provider...");
  try {
    const response = await api("/api/auth/provider/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload)
    });
    setToken(response.token);
    window.location.href = "/dashboard.html";
  } catch (error) {
    setFlash(flashRoot, error.message, "error");
  }
});

start();
