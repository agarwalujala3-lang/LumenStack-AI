import { tsParticles } from "tsparticles-slim";

/**
 * UIController: Manages virtual effects, animations, and DOM state.
 */
export class UIController {
  
  // 1. System Initialization
  initializeSystem() {
    this.initParticles();
    console.log("Professional UI System Initialized with Particle Effects.");
  }

  // 2. High-fidelity background effect
  initParticles() {
    tsParticles.load("tsparticles", {
      particles: {
        color: { value: "#00f2ff" },
        links: { enable: true, color: "#00f2ff", opacity: 0.2 },
        move: { enable: true, speed: 0.5 },
        number: { value: 60 }
      },
      background: { color: "transparent" }
    });
  }

  // 3. Cinematic Loading State
  showLoadingState(message) {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `<div class="spinner"></div><p>${message}</p>`;
    document.body.appendChild(overlay);
  }

  hideLoadingState() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
  }
}