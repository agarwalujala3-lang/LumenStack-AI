const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const AdmZip = require("adm-zip");

const { createApp } = require("../src/app");
const { buildLearningGuide } = require("../src/services/learningGuideService");
const { compareAnalyses } = require("../src/services/comparisonService");
const { analyzeCodebase } = require("../src/services/analyzerService");

function createAnalysis(overrides = {}) {
  return {
    summary: {
      sourceName: "sample-store",
      codeFiles: 3,
      primaryLanguage: "JavaScript",
      frameworks: ["Express"],
      entrypoints: ["src/index.js"]
    },
    modules: [
      { name: "src", fileCount: 3, examples: ["src/index.js", "src/services/cart.js"] }
    ],
    relationships: [
      {
        from: "src",
        to: "services",
        count: 1,
        evidence: [{ path: "src/index.js", line: 2, import: "./services/cart" }]
      }
    ],
    dependencies: [],
    quality: { hasTests: true, findings: [] },
    sourceIndex: [
      {
        path: "package.json",
        content: '{\n  "description": "A small shopping basket API",\n  "scripts": { "test": "node --test" }\n}',
        module: "root",
        language: "JSON",
        role: "Project configuration"
      },
      {
        path: "README.md",
        content: "# Sample store\n\nA demo service for an online shop.",
        module: "root",
        language: "Markdown",
        role: "Project documentation"
      },
      {
        path: "src/index.js",
        content: 'const express = require("express");\nconst cart = require("./services/cart");\nmodule.exports = express();',
        module: "src",
        language: "JavaScript",
        role: "Application entrypoint"
      },
      {
        path: "src/services/cart.js",
        content: "function addItem(items, item) { return [...items, item]; }\nmodule.exports = { addItem };",
        module: "services",
        language: "JavaScript",
        role: "Reusable application logic"
      },
      {
        path: "tests/cart.test.js",
        content: "test('adds item', () => {});",
        module: "tests",
        language: "JavaScript",
        role: "Verifies application behavior"
      }
    ],
    ...overrides
  };
}

test("learning guide ties purpose, entrypoint, flow, and verification to indexed lines", () => {
  const guide = buildLearningGuide(createAnalysis());
  const evidence = guide.steps.flatMap((step) => step.evidence);

  assert.equal(guide.steps.length, 5);
  assert.match(guide.steps[0].body, /shopping basket API/);
  assert.match(guide.steps[1].basis, /inferred/);
  assert.match(guide.steps[3].body, /src and services/);
  assert.match(guide.steps[4].body, /npm test/);
  assert.ok(evidence.some((item) => item.path === "src/index.js" && item.line === 2));
  for (const item of evidence) {
    const sourceFile = createAnalysis().sourceIndex.find((file) => file.path === item.path);
    const sourceLine = sourceFile.content.split(/\r?\n/)[item.line - 1];
    assert.ok(sourceLine, `expected ${item.path}:${item.line} to exist in the indexed file`);
    assert.ok(item.line > 0);
  }
  assert.match(guide.scopeNote, /does not execute/);
});

test("guide avoids inventing a project purpose when documentation and manifest description are missing", () => {
  const analysis = createAnalysis({
    sourceIndex: createAnalysis().sourceIndex.filter((file) => file.path !== "package.json" && file.path !== "README.md")
  });
  const guide = buildLearningGuide(analysis);

  assert.match(guide.steps[0].body, /does not solve|not what problem/i);
  assert.match(guide.presentationScript, /confirm the exact problem/i);
});

test("comparison exposes changed file details and the modules touched", () => {
  const baseline = {
    dependencies: [],
    modules: [{ name: "src" }],
    summary: { sourceName: "sample-store", frameworks: [], totalFiles: 2, codeFiles: 2 },
    relationships: [],
    quality: { score: 90 },
    searchIndex: [
      { path: "src/index.js", module: "src", language: "JavaScript", role: "Entry", content: "old" },
      { path: "src/old.js", module: "src", language: "JavaScript", role: "Code", content: "removed" }
    ]
  };
  const current = {
    ...baseline,
    summary: { ...baseline.summary, totalFiles: 3, codeFiles: 3 },
    modules: [{ name: "src" }, { name: "services" }],
    searchIndex: [
      { path: "src/index.js", module: "src", language: "JavaScript", role: "Entry", content: "new" },
      { path: "src/new.js", module: "services", language: "JavaScript", role: "Code", content: "added" }
    ]
  };
  const comparison = compareAnalyses(baseline, current);

  assert.deepEqual(comparison.fileDiff.changedDetails[0], {
    path: "src/index.js",
    beforeModule: "src",
    afterModule: "src",
    language: "JavaScript"
  });
  assert.equal(comparison.fileDiff.addedDetails[0].module, "services");
  assert.deepEqual(comparison.fileDiff.removed, ["src/old.js"]);
  assert.equal(comparison.stats.impactedModules, 2);
  assert.match(comparison.reviewMarkdown, /does not establish runtime behavior/);
});

test("analyzer records the exact source line for local module connections", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lumenstack-import-evidence-"));
  try {
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "server.js"), '// boot the service\nconst app = require("./src/app");\napp.listen(3000);');
    await fs.writeFile(path.join(root, "src", "app.js"), "module.exports = {};\n");

    const analysis = await analyzeCodebase(root, { sourceName: "fixture" });
    const connection = analysis.relationships.find((item) => item.from === "root" && item.to === "src");

    assert.ok(connection, "expected a detected root-to-src import");
    assert.deepEqual(connection.evidence[0], {
      path: "server.js",
      line: 2,
      import: "./src/app"
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("local API returns a learnable comparison, cited chat answer, and evidence-rich export without AI", async (t) => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "";
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousApiKey;
  });

  function makeZip(version) {
    const zip = new AdmZip();
    const changed = version === "current";
    const files = {
      "package.json": JSON.stringify({
        name: "sample-catalog",
        description: "A small API for browsing a product catalog",
        scripts: { test: "node --test" },
        dependencies: { express: changed ? "^4.2.0" : "^4.0.0" }
      }, null, 2),
      "README.md": "# Sample catalog\n\nA small API for browsing a product catalog.\n",
      "server.js": 'const app = require("./src/app");\napp.listen(3000);\n',
      "src/app.js": 'const catalog = require("./services/catalog");\nmodule.exports = { catalog };\n',
      "src/services/catalog.js": changed
        ? "function searchProducts(items, query) { return items.filter((item) => item.name.includes(query)); }\nmodule.exports = { searchProducts };\n"
        : "function listProducts(items) { return items; }\nmodule.exports = { listProducts };\n"
    };
    for (const [filePath, content] of Object.entries(files)) zip.addFile(filePath, Buffer.from(content));
    return zip.toBuffer();
  }

  const form = new FormData();
  form.append("codebase", new Blob([makeZip("current")], { type: "application/zip" }), "sample-current.zip");
  form.append("baselineCodebase", new Blob([makeZip("base")], { type: "application/zip" }), "sample-base.zip");
  form.append("compareMode", "1");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const analyzeResponse = await fetch(`${baseUrl}/api/analyze`, { method: "POST", body: form });
  const result = await analyzeResponse.json();

  assert.equal(analyzeResponse.status, 200);
  assert.equal(result.analysis.aiStatus, "fallback");
  assert.equal(result.analysis.learningGuide.steps.length, 5);
  assert.ok(result.comparison.fileDiff.changedDetails.some((file) => file.path === "src/services/catalog.js"));

  const restoreResponse = await fetch(`${baseUrl}/api/analysis/${result.analysisId}`);
  const restored = await restoreResponse.json();
  assert.equal(restored.analysisId, result.analysisId);
  assert.equal(restored.analysis.learningGuide.steps.length, 5);
  assert.ok(restored.comparison.fileDiff.changedDetails.some((file) => file.path === "src/services/catalog.js"));
  assert.equal(restored.comparisonContext.baselineSource.name, "sample-base");

  const chatResponse = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysisId: result.analysisId, question: "Where is searchProducts implemented?" })
  });
  const chat = await chatResponse.json();
  assert.ok(chat.citations.some((item) => item.path === "src/services/catalog.js" && item.line === 1));

  const fileResponse = await fetch(`${baseUrl}/api/analysis/${result.analysisId}/file?path=src%2Fservices%2Fcatalog.js`);
  assert.match((await fileResponse.json()).file.content, /searchProducts/);
  const reportResponse = await fetch(`${baseUrl}/api/export/${result.analysisId}?format=markdown`);
  const report = await reportResponse.text();
  assert.match(report, /First-day learning guide/);
  assert.match(report, /Evidence: src\/services\/catalog\.js:1/);
  assert.match(report, /Recruiter walkthrough/);
});
