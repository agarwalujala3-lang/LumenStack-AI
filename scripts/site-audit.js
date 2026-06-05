const { createApp } = require("../src/app");

const pages = [
  "/",
  "/product.html",
  "/case-study.html",
  "/saved-projects.html",
  "/contact.html",
  "/workspaces.html",
  "/integrations.html"
];

function unique(values) {
  return [...new Set(values)];
}

function extractAttributes(html, tagPattern, attrName) {
  const results = [];
  const regex = new RegExp(tagPattern, "gi");
  let match;

  while ((match = regex.exec(html))) {
    const tag = match[0];
    const attr = tag.match(new RegExp(`${attrName}=["']([^"']+)["']`, "i"));
    if (attr?.[1]) {
      results.push(attr[1]);
    }
  }

  return results;
}

function extractButtons(html) {
  const buttons = html.match(/<button\b[^>]*>/gi) || [];
  return buttons.map((button) => ({
    button,
    hasHandler:
      /type=["']submit["']/i.test(button) ||
      /data-live-action=/i.test(button) ||
      /data-device-action=/i.test(button) ||
      /data-cockpit-tab=/i.test(button) ||
      /data-diagram=/i.test(button) ||
      /class=["'][^"']*diagram-tab/i.test(button) ||
      /id=["'](theme-toggle|demo-auth-button|clear-form|copy-mermaid|download-report|download-json|copy-docs)["']/i.test(button)
  }));
}

function isInternalUrl(value) {
  return (
    value &&
    !value.startsWith("#") &&
    !value.startsWith("mailto:") &&
    !value.startsWith("tel:") &&
    !value.startsWith("http://") &&
    !value.startsWith("https://")
  );
}

async function main() {
  const app = createApp();
  const server = app.listen(0);

  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const failures = [];

  try {
    for (const page of pages) {
      const response = await fetch(`${base}${page}`);
      const html = await response.text();

      if (!response.ok) {
        failures.push(`${page} returned ${response.status}`);
        continue;
      }

      const hrefs = unique(extractAttributes(html, "<a\\b[^>]*>", "href")).filter(isInternalUrl);
      const scripts = unique(extractAttributes(html, "<script\\b[^>]*>", "src")).filter(isInternalUrl);
      const styles = unique(extractAttributes(html, "<link\\b[^>]*rel=[\"']stylesheet[\"'][^>]*>", "href")).filter(isInternalUrl);
      const internalAssets = [...hrefs, ...scripts, ...styles];

      for (const asset of internalAssets) {
        const assetResponse = await fetch(`${base}${asset}`);
        if (!assetResponse.ok) {
          failures.push(`${page} references ${asset}, returned ${assetResponse.status}`);
        }
      }

      const unhandledButtons = extractButtons(html).filter((entry) => !entry.hasHandler);
      for (const entry of unhandledButtons) {
        failures.push(`${page} has button without handler: ${entry.button}`);
      }
    }
  } finally {
    server.close();
  }

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(`Site audit passed for ${pages.length} pages.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
