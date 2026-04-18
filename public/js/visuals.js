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

const visualsRoot = document.querySelector("#visuals-root");
const experience = loadExperience();

if (!experience) {
  visualsRoot.innerHTML = `<article class="panel"><h3>No visuals yet</h3><p>Generate from Dashboard first.</p></article>`;
} else {
  const flowSteps = safeArray(experience.flowDiagram?.steps);
  const chartBars = safeArray(experience.kidsMode?.chart?.bars);
  const lanes = safeArray(experience.architectureDiagram?.lanes);

  visualsRoot.innerHTML = `
    <section class="cards-grid two">
      <article class="panel stack" data-reveal>
        <div class="kicker">Flow Diagram</div>
        <h3>${escapeHtml(experience.flowDiagram?.title || `${experience.topic} flow`)}</h3>
        <div class="stack">
          ${flowSteps.map((step, index) => `
            <article class="metric-card">
              <strong>${escapeHtml(`Step ${index + 1}: ${step.label}`)}</strong>
              <p>${escapeHtml(step.summary)}</p>
            </article>
          `).join("")}
        </div>
      </article>
      <article class="panel stack" data-reveal>
        <div class="kicker">Simple Chart</div>
        <h3>${escapeHtml(experience.kidsMode?.chart?.title || "Simple learning chart")}</h3>
        <div class="bar-chart">
          ${chartBars.map((bar) => `
            <div class="bar-row">
              <strong>${escapeHtml(bar.label)}</strong>
              <div class="bar-track"><span class="bar-fill" style="width:${escapeHtml(String(bar.value))}%"></span></div>
              <small>${escapeHtml(bar.note)}</small>
            </div>
          `).join("")}
        </div>
      </article>
    </section>
    <article class="panel stack" data-reveal>
      <div class="kicker">Architecture</div>
      <h3>${escapeHtml(experience.architectureDiagram?.title || `${experience.topic} architecture`)}</h3>
      <section class="cards-grid three">
        ${lanes.map((lane) => `
          <article class="metric-card">
            <strong>${escapeHtml(lane.title)}</strong>
            <ul>
              ${safeArray(lane.items).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
        `).join("")}
      </section>
    </article>
  `;

  initRevealCards();
}
