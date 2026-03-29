const integrationGridElement = document.getElementById("integration-grid");

function createNode(tagName, className, text) {
  const node = document.createElement(tagName);

  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

async function loadIntegrations() {
  if (!integrationGridElement) {
    return;
  }

  try {
    const response = await fetch("/api/platforms");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load provider coverage.");
    }

    integrationGridElement.replaceChildren();

    for (const provider of payload.providers || []) {
      const card = createNode("article", "integration-card spotlight-card");
      card.appendChild(createNode("span", "file-meta-label", provider.supportsWebhook ? "Webhook-capable" : "Clone or upload"));
      card.appendChild(createNode("strong", "", provider.name));
      card.appendChild(createNode("p", "", provider.exampleUrl));

      const meta = createNode(
        "div",
        "file-meta",
        `Hosts: ${(provider.hostPatterns || []).join(", ")} | ${
          provider.supportsWebhook ? "Supports stored webhook reports" : "No native webhook route yet"
        }`
      );
      card.appendChild(meta);
      integrationGridElement.appendChild(card);
    }
  } catch (error) {
    integrationGridElement.replaceChildren(
      createNode("p", "empty-state", error.message || "Unable to load provider coverage.")
    );
  }
}

loadIntegrations();
