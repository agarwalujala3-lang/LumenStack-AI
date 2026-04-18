import {
  api,
  bindLogout,
  escapeHtml,
  requireAuth,
  safeArray,
  setFlash
} from "./common.js";
import { initNebula, initRevealCards } from "./graphics.js";

if (!requireAuth()) {
  // Redirect handled in requireAuth.
}

initNebula();
initRevealCards();
bindLogout();

const flashRoot = document.querySelector("#flash-root");
const accountRoot = document.querySelector("#account-root");

async function start() {
  try {
    const [appResponse, providerResponse] = await Promise.all([
      api("/api/app"),
      api("/api/auth/providers", { auth: false })
    ]);

    const app = appResponse.app;
    const providers = providerResponse.providers || [];
    const linked = new Set(safeArray(app.user.providers));

    accountRoot.innerHTML = `
      <article class="panel stack" data-reveal>
        <div class="kicker">Profile</div>
        <h2>${escapeHtml(app.user.name)}</h2>
        <p>${escapeHtml(app.user.email)}</p>
      </article>
      <article class="panel stack" data-reveal>
        <div class="kicker">Providers</div>
        <div class="cards-grid two">
          ${providers.map((provider) => `
            <article class="metric-card">
              <strong>${escapeHtml(provider.id)}</strong>
              <p>${escapeHtml(linked.has(provider.id) ? "Connected" : `Available (${provider.mode})`)}</p>
            </article>
          `).join("")}
        </div>
      </article>
      <article class="panel stack" data-reveal>
        <div class="kicker">Saved Library</div>
        <p>Lessons: ${escapeHtml(String(app.savedLibrary.lessons.length))}</p>
        <p>Projects: ${escapeHtml(String(app.savedLibrary.projects.length))}</p>
        <p>Videos: ${escapeHtml(String(app.savedLibrary.videos?.length || 0))}</p>
      </article>
    `;
    initRevealCards();
  } catch (error) {
    setFlash(flashRoot, error.message, "error");
  }
}

start();
