export class UIController {
  constructor() {
    this.events = {};
  }

  on(event, callback) { this.events[event] = callback; }
  trigger(event, data) { if (this.events[event]) this.events[event](data); }

  initializeSystem() {
    this.initParticles();
    console.log("UI System Initialized.");
  }

  async initParticles() {
    const container = document.getElementById("tsparticles");
    if (!container) {
      console.warn("Particle container '#tsparticles' not found. Skipping particle initialization.");
      return;
    }

    try {
      await this.loadParticleRuntime();
      window.tsParticles.load("tsparticles", {
        particles: {
          color: { value: "#00f2ff" },
          links: { enable: true, color: "#00f2ff", opacity: 0.2 },
          move: { enable: true, speed: 0.5 },
          number: { value: 60 }
        },
        background: { color: "transparent" }
      });
    } catch (error) {
      console.warn("Particle runtime unavailable. Continuing without background particles.", error);
    }
  }

  loadParticleRuntime() {
    if (window.tsParticles) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/vendor/tsparticles/tsparticles.slim.bundle.min.js";
      script.async = true;
      script.onload = () => (window.tsParticles ? resolve() : reject(new Error("tsParticles did not initialize.")));
      script.onerror = () => reject(new Error("Unable to load tsParticles runtime."));
      document.head.appendChild(script);
    });
  }
  clearChatBubble() {
    const bubble = document.getElementById('ai-chat-bubble');
    if (bubble) bubble.textContent = "";
  }

  updateChatBubble(text) {
    const bubble = document.getElementById('ai-chat-bubble');
    if (bubble) bubble.textContent += text;
  }
}
