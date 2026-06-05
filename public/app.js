import { UIController } from './modules/UIController.js';
import { APIClient } from './modules/APIClient.js';

class App {
  constructor() {
    this.ui = new UIController();
    this.api = new APIClient();
    this.init();
  }

  init() {
    this.ui.initializeSystem();
    this.setupEventListeners();
    console.log("LumenStack AI Pro Orchestrator Active.");
  }

  setupEventListeners() {
    this.ui.on('chat', async (analysisData) => {
      this.ui.clearChatBubble();
      await this.api.streamChat(analysisData, (token) => {
        this.ui.updateChatBubble(token);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => new App());
