const fs = require("fs/promises");
const path = require("path");

const IGNORED_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  "target",
  "vendor",
  "venv",
  ".venv",
  "__pycache__",
  ".idea",
  ".vscode"
]);

const CODE_FILE_TYPES = {
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".java": "Java",
  ".go": "Go",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#",
  ".rs": "Rust",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".scala": "Scala",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "SCSS",
  ".vue": "Vue",
  ".svelte": "Svelte"
};

const MANIFEST_FILES = new Set([
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "composer.json"
]);

const ENTRYPOINT_NAMES = new Set([
  "index.js",
  "index.ts",
  "app.js",
  "app.ts",
  "server.js",
  "server.ts",
  "main.js",
  "main.ts",
  "main.py",
  "manage.py",
  "wsgi.py",
  "asgi.py"
]);

const PRIORITY_MODULE_NAMES = new Set([
  "api",
  "app",
  "client",
  "components",
  "config",
  "controllers",
  "database",
  "db",
  "hooks",
  "lib",
  "middleware",
  "models",
  "pages",
  "routes",
  "schemas",
  "server",
  "services",
  "state",
  "stores",
  "tests",
  "types",
  "ui",
  "utils"
]);

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function incrementCounter(counter, key, amount = 1) {
  counter.set(key, (counter.get(key) || 0) + amount);
}

function sortCounter(counter) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
}

function dedupeBy(items, resolver) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = resolver(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function isTextBuffer(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 512));
  return !sample.includes(0);
}

function getModuleName(relativePath) {
  const segments = relativePath.split("/");
  const directorySegments = segments.slice(0, -1);

  for (const segment of directorySegments) {
    if (PRIORITY_MODULE_NAMES.has(segment.toLowerCase())) {
      return segment.toLowerCase();
    }
  }

  if (directorySegments.length === 0) {
    return "root";
  }

  if (["src", "app", "server", "client", "lib"].includes(directorySegments[0]) && directorySegments[1]) {
    return directorySegments[1].toLowerCase();
  }

  return directorySegments[0].toLowerCase();
}

function normalizePackageName(value) {
  if (!value) {
    return "";
  }

  if (value.startsWith("@")) {
    return value.split("/").slice(0, 2).join("/");
  }

  return value.split("/")[0];
}

function summarizeRole(relativePath, sample) {
  const fileName = path.posix.basename(relativePath).toLowerCase();

  if (/lambda|handler/.test(fileName)) {
    return "Implements serverless handler logic.";
  }

  if (/api|endpoint/.test(fileName)) {
    return "Handles API requests or response shaping.";
  }

  if (/auth|login|signup|signin|cognito|session|token/.test(fileName)) {
    return "Handles authentication or sign-in related flow.";
  }

  if (/route|router/.test(fileName)) {
    return "Defines request routing.";
  }

  if (/controller/.test(fileName)) {
    return "Coordinates request handling logic.";
  }

  if (/service/.test(fileName)) {
    return "Implements reusable business logic.";
  }

  if (/model|schema|entity/.test(fileName)) {
    return "Represents application data structures.";
  }

  if (/component|page|view/.test(fileName)) {
    return "Renders part of the user interface.";
  }

  if (/config|settings/.test(fileName)) {
    return "Provides configuration or environment setup.";
  }

  if (/test|spec/.test(fileName)) {
    return "Verifies application behavior.";
  }

  if (/express\(|router\./i.test(sample)) {
    return "Contains request handling logic.";
  }

  if (/class\s+\w+/.test(sample)) {
    return "Defines a class-based module.";
  }

  if (/function\s+\w+|const\s+\w+\s*=\s*\(/.test(sample)) {
    return "Provides functional application logic.";
  }

  return "Contributes to the application structure.";
}

function detectImports(extension, sample) {
  const imports = [];
  const addImport = (value, type) => {
    if (!value) {
      return;
    }

    imports.push({ value, type });
  };

  if ([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte"].includes(extension)) {
    for (const match of sample.matchAll(/import\s+[\s\S]*?\sfrom\s+["']([^"']+)["']/g)) {
      addImport(match[1], "esm");
    }

    for (const match of sample.matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)) {
      addImport(match[1], "cjs");
    }

    for (const match of sample.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) {
      addImport(match[1], "dynamic");
    }
  }

  if (extension === ".py") {
    for (const match of sample.matchAll(/from\s+([a-zA-Z0-9_\.]+)\s+import/g)) {
      addImport(match[1], "python");
    }

    for (const match of sample.matchAll(/import\s+([a-zA-Z0-9_\.]+)/g)) {
      addImport(match[1], "python");
    }
  }

  if (extension === ".java") {
    for (const match of sample.matchAll(/import\s+([a-zA-Z0-9_.*]+);/g)) {
      addImport(match[1], "java");
    }
  }

  if (extension === ".go") {
    for (const match of sample.matchAll(/import\s+(?:\([\s\S]*?\)|"([^"]+)")/g)) {
      if (match[1]) {
        addImport(match[1], "go");
      }
    }

    for (const match of sample.matchAll(/"([^"]+)"/g)) {
      addImport(match[1], "go");
    }
  }

  return dedupeBy(imports, (entry) => `${entry.type}:${entry.value}`).slice(0, 30);
}

function extractClasses(extension, sample) {
  const classes = [];
  const addClass = (name, base = "") => {
    if (!name) {
      return;
    }

    classes.push({
      name,
      base
    });
  };

  if ([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(extension)) {
    for (const match of sample.matchAll(/class\s+([A-Z][A-Za-z0-9_]*)\s*(?:extends\s+([A-Z][A-Za-z0-9_]*))?/g)) {
      addClass(match[1], match[2] || "");
    }
  }

  if (extension === ".py") {
    for (const match of sample.matchAll(/class\s+([A-Z][A-Za-z0-9_]*)\s*(?:\(([^)]*)\))?/g)) {
      addClass(match[1], match[2] || "");
    }
  }

  if ([".java", ".cs", ".kt", ".scala"].includes(extension)) {
    for (const match of sample.matchAll(/class\s+([A-Z][A-Za-z0-9_]*)\s*(?:extends\s+([A-Z][A-Za-z0-9_]*))?/g)) {
      addClass(match[1], match[2] || "");
    }
  }

  return dedupeBy(classes, (entry) => `${entry.name}:${entry.base}`);
}

function countFunctions(extension, sample) {
  if (extension === ".py") {
    return [...sample.matchAll(/def\s+[a-zA-Z0-9_]+\s*\(/g)].length;
  }

  if ([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(extension)) {
    return [
      ...sample.matchAll(/function\s+[a-zA-Z0-9_]+\s*\(/g),
      ...sample.matchAll(/const\s+[a-zA-Z0-9_]+\s*=\s*\(/g),
      ...sample.matchAll(/[a-zA-Z0-9_]+\s*\([^)]*\)\s*{/g)
    ].length;
  }

  return [...sample.matchAll(/\bfunction\b/g)].length;
}

function parseDependenciesFromPackageJson(content) {
  const parsed = JSON.parse(content);
  const dependencies = [];
  const sections = ["dependencies", "devDependencies", "peerDependencies"];

  for (const section of sections) {
    for (const [name, version] of Object.entries(parsed[section] || {})) {
      dependencies.push({ name, version, section, source: "package.json" });
    }
  }

  return dependencies;
}

function parseDependenciesFromRequirements(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [name, version = ""] = line.split(/==|>=|<=|~=|>|</);
      return {
        name: name.trim(),
        version: version.trim(),
        section: "dependencies",
        source: "requirements.txt"
      };
    });
}

function parseDependenciesFromPyProject(content) {
  const dependencies = [];
  const pep621Match = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/m);

  if (pep621Match) {
    for (const match of pep621Match[1].matchAll(/"([^"]+)"/g)) {
      const [name, version = ""] = match[1].split(/[<>=!~]/);
      dependencies.push({
        name: name.trim(),
        version: version.trim(),
        section: "dependencies",
        source: "pyproject.toml"
      });
    }
  }

  const lines = content.split(/\r?\n/);
  let inPoetryBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[tool.poetry.dependencies]") {
      inPoetryBlock = true;
      continue;
    }

    if (inPoetryBlock && /^\[.+\]$/.test(trimmed)) {
      inPoetryBlock = false;
    }

    if (inPoetryBlock && trimmed && !trimmed.startsWith("#")) {
      const [rawName, rawVersion = ""] = trimmed.split("=");

      if (rawName && rawName !== "python") {
        dependencies.push({
          name: rawName.trim(),
          version: rawVersion.replace(/['",{}]/g, "").trim(),
          section: "dependencies",
          source: "pyproject.toml"
        });
      }
    }
  }

  return dependencies;
}

function parseDependenciesFromGoMod(content) {
  const dependencies = [];

  for (const match of content.matchAll(/^\s*require\s+([^\s]+)\s+([^\s]+)$/gm)) {
    dependencies.push({
      name: match[1],
      version: match[2],
      section: "dependencies",
      source: "go.mod"
    });
  }

  const blockMatch = content.match(/require\s*\(([\s\S]*?)\)/m);

  if (blockMatch) {
    for (const line of blockMatch[1].split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      const [name, version = ""] = trimmed.split(/\s+/);
      if (name) {
        dependencies.push({
          name,
          version,
          section: "dependencies",
          source: "go.mod"
        });
      }
    }
  }

  return dependencies;
}

function parseDependenciesFromCargo(content) {
  const dependencies = [];
  const lines = content.split(/\r?\n/);
  let inDependencies = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[dependencies]") {
      inDependencies = true;
      continue;
    }

    if (inDependencies && /^\[.+\]$/.test(trimmed)) {
      inDependencies = false;
    }

    if (inDependencies && trimmed && !trimmed.startsWith("#")) {
      const [name, rawVersion = ""] = trimmed.split("=");
      dependencies.push({
        name: name.trim(),
        version: rawVersion.replace(/['",{}]/g, "").trim(),
        section: "dependencies",
        source: "Cargo.toml"
      });
    }
  }

  return dependencies;
}

function parseDependenciesFromPom(content) {
  const dependencies = [];

  for (const match of content.matchAll(/<dependency>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?(?:<version>(.*?)<\/version>)?[\s\S]*?<\/dependency>/g)) {
    dependencies.push({
      name: match[1].trim(),
      version: (match[2] || "").trim(),
      section: "dependencies",
      source: "pom.xml"
    });
  }

  return dependencies;
}

function parseDependenciesFromComposer(content) {
  const parsed = JSON.parse(content);
  const dependencies = [];
  const sections = ["require", "require-dev"];

  for (const section of sections) {
    for (const [name, version] of Object.entries(parsed[section] || {})) {
      dependencies.push({
        name,
        version,
        section,
        source: "composer.json"
      });
    }
  }

  return dependencies;
}

function parseManifestDependencies(fileName, content) {
  try {
    switch (fileName) {
      case "package.json":
        return parseDependenciesFromPackageJson(content);
      case "requirements.txt":
        return parseDependenciesFromRequirements(content);
      case "pyproject.toml":
        return parseDependenciesFromPyProject(content);
      case "go.mod":
        return parseDependenciesFromGoMod(content);
      case "Cargo.toml":
        return parseDependenciesFromCargo(content);
      case "pom.xml":
        return parseDependenciesFromPom(content);
      case "composer.json":
        return parseDependenciesFromComposer(content);
      default:
        return [];
    }
  } catch {
    return [];
  }
}

function getLocalTargetModule(importValue, relativePath, knownModules) {
  const normalizedImport = importValue.replace(/\\/g, "/");

  if (normalizedImport.startsWith(".") || normalizedImport.startsWith("/")) {
    const baseDir = path.posix.dirname(relativePath);
    const resolvedPath = path.posix.normalize(path.posix.join(baseDir, normalizedImport));
    return getModuleName(resolvedPath);
  }

  const topSegment = normalizePackageName(normalizedImport).split(".")[0].toLowerCase();

  if (knownModules.has(topSegment)) {
    return topSegment;
  }

  return null;
}

function detectFrameworks(dependencies, languages, entrypoints) {
  const dependencyNames = new Set(dependencies.map((item) => item.name.toLowerCase()));
  const frameworks = new Set();
  const frameworkChecks = [
    ["express", "Express"],
    ["next", "Next.js"],
    ["react", "React"],
    ["vue", "Vue"],
    ["@angular/core", "Angular"],
    ["nestjs", "NestJS"],
    ["flask", "Flask"],
    ["django", "Django"],
    ["fastapi", "FastAPI"],
    ["spring-boot", "Spring Boot"],
    ["gin", "Gin"],
    ["laravel/framework", "Laravel"],
    ["rails", "Ruby on Rails"]
  ];

  for (const [name, label] of frameworkChecks) {
    if (dependencyNames.has(name)) {
      frameworks.add(label);
    }
  }

  const languageNames = new Set(languages.map((item) => item.name));

  if (!frameworks.size && languageNames.has("JavaScript") && entrypoints.some((file) => /server|app|index/.test(file))) {
    frameworks.add("Node.js");
  }

  if (!frameworks.size && languageNames.has("Python")) {
    frameworks.add("Python Application");
  }

  return [...frameworks];
}

function buildArchitectureDiagram(sourceName, modules, relationships, frameworks) {
  const lines = [
    "flowchart TD",
    `  app["${sourceName}"]`
  ];

  for (const framework of frameworks.slice(0, 3)) {
    const frameworkId = framework.toLowerCase().replace(/[^a-z0-9]+/g, "");
    lines.push(`  ${frameworkId}["${framework}"]`);
    lines.push(`  app --> ${frameworkId}`);
  }

  for (const module of modules.slice(0, 8)) {
    const moduleId = `module_${module.name.replace(/[^a-z0-9]+/gi, "_")}`;
    lines.push(`  ${moduleId}["${module.name} (${module.fileCount})"]`);
    lines.push(`  app --> ${moduleId}`);
  }

  for (const relationship of relationships.slice(0, 12)) {
    const fromId = `module_${relationship.from.replace(/[^a-z0-9]+/gi, "_")}`;
    const toId = `module_${relationship.to.replace(/[^a-z0-9]+/gi, "_")}`;
    lines.push(`  ${fromId} --> ${toId}`);
  }

  lines.push("  classDef focus fill:#17494d,stroke:#0d2f32,color:#f7f3e8;");
  lines.push("  class app focus;");

  return lines.join("\n");
}

function buildSequenceDiagram(entrypoints, relationships) {
  const lines = ["sequenceDiagram"];
  const chain = relationships.slice(0, 6);
  const participants = new Set();

  if (!chain.length) {
    lines.push("  participant User");
    lines.push("  participant App");
    lines.push("  User->>App: Analyze repository");
    lines.push("  App-->>User: Return architecture brief");
    return lines.join("\n");
  }

  for (const entrypoint of entrypoints.slice(0, 2)) {
    const alias = entrypoint.split("/").pop().replace(/[^a-z0-9]/gi, "_");
    participants.add(`${alias}:${entrypoint}`);
  }

  for (const relationship of chain) {
    participants.add(`${relationship.from}:${relationship.from}`);
    participants.add(`${relationship.to}:${relationship.to}`);
  }

  for (const participant of participants) {
    const [alias, label] = participant.split(":");
    lines.push(`  participant ${alias} as ${label}`);
  }

  if (entrypoints.length) {
    const alias = entrypoints[0].split("/").pop().replace(/[^a-z0-9]/gi, "_");
    lines.push(`  ${alias}->>${chain[0].from}: entrypoint dispatch`);
  }

  for (const relationship of chain) {
    lines.push(`  ${relationship.from}->>${relationship.to}: ${relationship.count} linked imports`);
  }

  return lines.join("\n");
}

function buildClassDiagram(classRecords) {
  const lines = ["classDiagram"];
  const flattened = classRecords.slice(0, 12);

  if (!flattened.length) {
    lines.push("  class NoClasses");
    lines.push('  note for NoClasses "No class declarations detected in sampled files."');
    return lines.join("\n");
  }

  for (const record of flattened) {
    const classId = `${record.module}_${record.name}`.replace(/[^a-z0-9_]/gi, "_");
    lines.push(`  class ${classId}["${record.name}"]`);

    if (record.base) {
      const baseId = `${record.module}_${record.base}`.replace(/[^a-z0-9_]/gi, "_");
      lines.push(`  class ${baseId}["${record.base}"]`);
      lines.push(`  ${baseId} <|-- ${classId}`);
    }
  }

  return lines.join("\n");
}

function buildDependencyDiagram(modules, dependencies) {
  const lines = [
    "flowchart LR",
    '  app["Application"]'
  ];

  for (const module of modules.slice(0, 6)) {
    const moduleId = `module_${module.name.replace(/[^a-z0-9]+/gi, "_")}`;
    lines.push(`  ${moduleId}["${module.name}"]`);
    lines.push(`  app --> ${moduleId}`);
  }

  for (const dependency of dependencies.slice(0, 8)) {
    const dependencyId = `dep_${dependency.name.replace(/[^a-z0-9]+/gi, "_")}`;
    lines.push(`  ${dependencyId}["${dependency.name}"]`);
    lines.push(`  app --> ${dependencyId}`);
  }

  return lines.join("\n");
}

function buildQualityReport({ files, dependencies, modules, relationships, summary }) {
  let score = 100;
  const findings = [];
  const hotspotFiles = [...files]
    .sort((a, b) => {
      const aScore = (a.importCount || 0) + a.functionCount + a.classRecords.length;
      const bScore = (b.importCount || 0) + b.functionCount + b.classRecords.length;
      return bScore - aScore;
    })
    .slice(0, 5)
    .map((file) => ({
      path: file.relativePath,
      module: file.moduleName,
      importCount: file.importCount || 0,
      functionCount: file.functionCount,
      classCount: file.classRecords.length
    }));

  const hasTests = files.some((file) => file.moduleName === "tests" || /test|spec/i.test(file.relativePath));

  if (!hasTests) {
    score -= 12;
    findings.push({
      severity: "medium",
      title: "Testing footprint is weak",
      detail: "No obvious test suite was detected in the scanned files."
    });
  }

  if (dependencies.length > 30) {
    score -= 8;
    findings.push({
      severity: "medium",
      title: "Dependency surface is broad",
      detail: `${dependencies.length} dependencies were detected across manifests.`
    });
  }

  if (relationships.length > Math.max(8, modules.length * 2)) {
    score -= 7;
    findings.push({
      severity: "medium",
      title: "Cross-module coupling is growing",
      detail: `${relationships.length} module relationships were inferred from imports.`
    });
  }

  if (hotspotFiles[0] && hotspotFiles[0].importCount > 12) {
    score -= 8;
    findings.push({
      severity: "high",
      title: "A hotspot file is pulling in many dependencies",
      detail: `${hotspotFiles[0].path} references ${hotspotFiles[0].importCount} imports in the sampled content.`
    });
  }

  if (modules[0] && modules[0].fileCount > Math.max(4, Math.round(summary.codeFiles * 0.45))) {
    score -= 5;
    findings.push({
      severity: "low",
      title: "One module dominates the codebase",
      detail: `${modules[0].name} contains ${modules[0].fileCount} files.`
    });
  }

  score = Math.max(35, Math.min(100, score));

  return {
    score,
    summary:
      score >= 85
        ? "Structure looks healthy for the current codebase size."
        : score >= 70
          ? "Architecture is workable but has a few maintainability risks."
          : "Architecture is showing warning signs that merit review.",
    findings,
    hotspots: hotspotFiles,
    hasTests
  };
}

function buildReportMarkdown(analysis) {
  return [
    `# Architecture Report: ${analysis.summary.sourceName}`,
    "",
    "## Summary",
    `- Source type: ${analysis.summary.sourceType}`,
    `- Code files: ${analysis.summary.codeFiles}`,
    `- Primary language: ${analysis.summary.primaryLanguage}`,
    `- Frameworks: ${analysis.summary.frameworks.join(", ") || "None detected"}`,
    `- Quality score: ${analysis.quality.score}`,
    "",
    "## Modules",
    ...analysis.modules.slice(0, 10).map((module) => `- ${module.name}: ${module.fileCount} files`),
    "",
    "## Dependencies",
    ...analysis.dependencies.slice(0, 12).map((dependency) => `- ${dependency.name} (${dependency.source})`),
    "",
    "## Findings",
    ...analysis.quality.findings.map((finding) => `- [${finding.severity}] ${finding.title}: ${finding.detail}`),
    "",
    "## Review Hotspots",
    ...analysis.quality.hotspots.map((hotspot) => `- ${hotspot.path}`),
    "",
    "## Mermaid Architecture Diagram",
    "```mermaid",
    analysis.diagrams.architecture,
    "```"
  ].join("\n");
}

async function walkDirectory(rootPath, currentPath, state) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") && ![".env.example", ".github"].includes(entry.name)) {
      continue;
    }

    const fullPath = path.join(currentPath, entry.name);
    const relativePath = toPosixPath(path.relative(rootPath, fullPath));

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      await walkDirectory(rootPath, fullPath, state);
      continue;
    }

    state.totalFiles += 1;

    const extension = path.extname(entry.name).toLowerCase();
    const isCodeFile = Boolean(CODE_FILE_TYPES[extension]);
    const isManifest = MANIFEST_FILES.has(entry.name);

    if (!isCodeFile && !isManifest) {
      continue;
    }

    const buffer = await fs.readFile(fullPath);

    if (!isTextBuffer(buffer)) {
      continue;
    }

    const sample = buffer.toString("utf8", 0, Math.min(buffer.length, 12000));

    if (isManifest) {
      state.manifests.push({
        fileName: entry.name,
        relativePath,
        content: sample
      });
    }

    if (isCodeFile) {
      const language = CODE_FILE_TYPES[extension];
      const moduleName = getModuleName(relativePath);
      const classRecords = extractClasses(extension, sample).map((record) => ({
        ...record,
        module: moduleName,
        path: relativePath
      }));
      const fileRecord = {
        relativePath,
        extension,
        language,
        moduleName,
        sample,
        role: summarizeRole(relativePath, sample),
        isEntrypoint: ENTRYPOINT_NAMES.has(entry.name.toLowerCase()),
        classRecords,
        functionCount: countFunctions(extension, sample),
        lineCount: sample.split(/\r?\n/).length
      };

      state.codeFiles += 1;
      incrementCounter(state.languageCounts, language);
      incrementCounter(state.moduleCounts, moduleName);

      if (!state.moduleExamples.has(moduleName)) {
        state.moduleExamples.set(moduleName, []);
      }

      if (state.moduleExamples.get(moduleName).length < 3) {
        state.moduleExamples.get(moduleName).push(relativePath);
      }

      if (fileRecord.isEntrypoint) {
        state.entrypoints.push(relativePath);
      }

      state.files.push(fileRecord);
      state.classRecords.push(...classRecords);
    }
  }
}

async function analyzeCodebase(rootPath, options = {}) {
  const state = {
    totalFiles: 0,
    codeFiles: 0,
    manifests: [],
    files: [],
    entrypoints: [],
    languageCounts: new Map(),
    moduleCounts: new Map(),
    moduleExamples: new Map(),
    classRecords: []
  };

  await walkDirectory(rootPath, rootPath, state);

  const knownModules = new Set([...state.moduleCounts.keys()]);
  const relationshipCounts = new Map();

  for (const file of state.files) {
    const imports = detectImports(file.extension, file.sample);
    file.imports = imports.map((entry) => entry.value);
    file.importCount = file.imports.length;

    for (const entry of imports) {
      const targetModule = getLocalTargetModule(entry.value, file.relativePath, knownModules);

      if (!targetModule || targetModule === file.moduleName) {
        continue;
      }

      const key = `${file.moduleName}->${targetModule}`;
      incrementCounter(relationshipCounts, key);
    }
  }

  const dependencies = dedupeBy(
    state.manifests.flatMap((manifest) => parseManifestDependencies(manifest.fileName, manifest.content)),
    (entry) => `${entry.source}:${entry.section}:${entry.name}`
  ).sort((a, b) => a.name.localeCompare(b.name));

  const languages = sortCounter(state.languageCounts);
  const modules = sortCounter(state.moduleCounts).map((item) => ({
    name: item.name,
    fileCount: item.count,
    examples: state.moduleExamples.get(item.name) || []
  }));

  const relationships = [...relationshipCounts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split("->");
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));

  const frameworks = detectFrameworks(dependencies, languages, state.entrypoints);

  const fileHighlights = [...state.files]
    .sort((a, b) => {
      const aScore = (a.isEntrypoint ? 3 : 0) + (a.importCount || 0) + a.classRecords.length;
      const bScore = (b.isEntrypoint ? 3 : 0) + (b.importCount || 0) + b.classRecords.length;
      return bScore - aScore;
    })
    .slice(0, 8)
    .map((file) => ({
      path: file.relativePath,
      language: file.language,
      module: file.moduleName,
      role: file.role,
      imports: (file.imports || []).slice(0, 8),
      classCount: file.classRecords.length,
      functionCount: file.functionCount
    }));

  const summary = {
    sourceName: options.sourceName || path.basename(rootPath),
    sourceType: options.sourceType || "upload",
    totalFiles: state.totalFiles,
    codeFiles: state.codeFiles,
    manifestCount: state.manifests.length,
    primaryLanguage: languages[0]?.name || "Unknown",
    languages,
    frameworks,
    dependencyCount: dependencies.length,
    entrypoints: state.entrypoints
  };

  const quality = buildQualityReport({
    files: state.files,
    dependencies,
    modules,
    relationships,
    summary
  });

  const diagrams = {
    architecture: buildArchitectureDiagram(summary.sourceName, modules, relationships, frameworks),
    sequence: buildSequenceDiagram(summary.entrypoints, relationships),
    classes: buildClassDiagram(state.classRecords),
    dependencies: buildDependencyDiagram(modules, dependencies)
  };

  const searchIndex = state.files.map((file) => ({
    path: file.relativePath,
    module: file.moduleName,
    language: file.language,
    role: file.role,
    content: file.sample
  }));

  const analysis = {
    summary,
    modules,
    dependencies: dependencies.slice(0, 40),
    relationships,
    fileHighlights,
    quality,
    diagrams,
    mermaidDiagram: diagrams.architecture,
    reportMarkdown: "",
    searchIndex
  };

  analysis.reportMarkdown = buildReportMarkdown(analysis);

  return analysis;
}

module.exports = {
  analyzeCodebase
};
