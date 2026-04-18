export const TOKEN_KEY = "lumina-token";
export const EXPERIENCE_KEY = "lumina-current-experience";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
    || localStorage.getItem("codesprout-token")
    || localStorage.getItem("nexus-token")
    || "";
}

export function setToken(token) {
  if (!token) {
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem("codesprout-token", token);
  localStorage.setItem("nexus-token", token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("codesprout-token");
  localStorage.removeItem("nexus-token");
}

export function saveExperience(experience) {
  localStorage.setItem(EXPERIENCE_KEY, JSON.stringify(experience || {}));
}

export function loadExperience() {
  const raw = localStorage.getItem(EXPERIENCE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getToken();
  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

export function requireAuth(redirectTo = "/login.html") {
  const token = getToken();
  if (!token) {
    window.location.replace(redirectTo);
    return false;
  }
  return true;
}

export function setFlash(target, message, type = "ok") {
  if (!target) {
    return;
  }

  if (!message) {
    target.innerHTML = "";
    return;
  }

  target.innerHTML = `<div class="flash ${type === "error" ? "error" : "ok"}">${escapeHtml(message)}</div>`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function bindLogout(selector = "[data-logout]") {
  document.querySelector(selector)?.addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } catch {}
    clearToken();
    window.location.replace("/login.html");
  });
}

export function formatProviderLabel(provider) {
  const normalized = String(provider || "").toLowerCase();
  if (normalized === "github") {
    return "GitHub";
  }
  if (normalized === "linkedin") {
    return "LinkedIn";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
