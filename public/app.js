/**
 * LumenStack AI - Professional Entrypoint
 * Orchestrates the modular UI and API systems.
 */

import { UIController } from './modules/UIController.js';
import { APIClient } from './modules/APIClient.js';

class App {
  constructor() {
    this.ui = new UIController();
    this.api = new APIClient();
    this.init();
  }

  init() {
    // 1. Initialize UI (Parallax, Animations, Spotlight)
    this.ui.initializeSystem();
    
    // 2. Log initialization for verification
    console.log("LumenStack AI Pro Orchestrator Active.");
  }
}

// Ensure the app initializes once the DOM is ready
document.addEventListener('DOMContentLoaded', () => new App());