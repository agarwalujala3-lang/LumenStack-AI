import {
  bindLogout,
  escapeHtml,
  loadExperience,
  requireAuth,
  safeArray
} from "./common.js";
import { initNebula, initRevealCards } from "./graphics.js";

if (!requireAuth()) {
  // Redirect handled in requireAuth.
}

initNebula();
initRevealCards();
bindLogout();

const notesRoot = document.querySelector("#notes-root");
const experience = loadExperience();

if (!experience) {
  notesRoot.innerHTML = `
    <article class="panel stack">
      <h3>No notes generated yet</h3>
      <p>Go to Dashboard, paste a YouTube URL, and generate your lesson first.</p>
    </article>
  `;
} else {
  const deepNotes = safeArray(experience.deepNotes);
  const importantPoints = safeArray(experience.importantPoints);
  const quickAnswers = safeArray(experience.cheatSheet?.quickAnswers);
  const commonMistakes = safeArray(experience.cheatSheet?.commonMistakes);
  const realWorldExamples = safeArray(experience.realWorldExamples);

  notesRoot.innerHTML = `
    <article class="panel stack" data-reveal>
      <div class="kicker">Cheat Sheet</div>
      <h2>${escapeHtml(experience.cheatSheet?.headline || `${experience.topic} cheat sheet`)}</h2>
      <p>${escapeHtml(experience.cheatSheet?.oneLineAnswer || "One-line concept summary for fast revision.")}</p>
      <div class="cards-grid two">
        <article class="metric-card">
          <strong>Must remember</strong>
          <ul>${safeArray(experience.cheatSheet?.mustRemember).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
        <article class="metric-card">
          <strong>Common mistakes</strong>
          <ul>${commonMistakes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </article>
      </div>
    </article>

    <article class="panel stack" data-reveal>
      <div class="kicker">Important Points</div>
      <ul>${importantPoints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <div class="note-chip-row">
        ${quickAnswers.map((item) => `<span class="mini-pill">${escapeHtml(item)}</span>`).join("")}
      </div>
    </article>

    <article class="panel stack" data-reveal>
      <div class="kicker">Deep Notes</div>
      ${deepNotes.map((section, index) => `
        <article class="note-section">
          <h3>${escapeHtml(`${index + 1}. ${section.heading || "Section"}`)}</h3>
          <p>${escapeHtml(section.summary || "")}</p>
          <ul>${safeArray(section.bullets).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
        </article>
      `).join("")}
    </article>

    <article class="panel stack" data-reveal>
      <div class="kicker">Real-World Examples</div>
      <div class="cards-grid three">
        ${realWorldExamples.map((example) => `
          <article class="metric-card">
            <strong>${escapeHtml(example.title || "Example")}</strong>
            <p>${escapeHtml(example.summary || "")}</p>
            <small>${escapeHtml(example.whyItMatters || "")}</small>
          </article>
        `).join("")}
      </div>
    </article>
  `;

  initRevealCards();
}
