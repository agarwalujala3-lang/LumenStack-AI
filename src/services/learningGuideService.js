function indexedFiles(analysis) {
  return analysis.sourceIndex || analysis.searchIndex || [];
}

function findFile(analysis, filePath) {
  return indexedFiles(analysis).find((file) => file.path === filePath) || null;
}

function makeEvidence(analysis, filePath, preferredLine, pattern) {
  const file = findFile(analysis, filePath);
  if (!file) return null;

  const lines = String(file.content || "").split(/\r?\n/);
  let lineIndex = Number.isInteger(preferredLine) ? preferredLine - 1 : -1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    lineIndex = pattern ? lines.findIndex((line) => pattern.test(line)) : -1;
  }
  if (lineIndex < 0) lineIndex = lines.findIndex((line) => line.trim());
  if (lineIndex < 0) return null;

  return {
    path: file.path,
    line: lineIndex + 1,
    excerpt: lines[lineIndex].trim().slice(0, 180)
  };
}

function cleanMarkdown(value) {
  return String(value || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[`*_>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findProjectDescription(analysis) {
  const files = indexedFiles(analysis);
  const packageFile = files.find((file) => file.path.toLowerCase().endsWith("package.json"));

  if (packageFile) {
    try {
      const description = JSON.parse(packageFile.content).description;
      if (typeof description === "string" && description.trim()) {
        const lineIndex = packageFile.content.split(/\r?\n/).findIndex((line) => /"description"\s*:/.test(line));
        return {
          text: description.trim().slice(0, 280),
          evidence: makeEvidence(analysis, packageFile.path, lineIndex + 1)
        };
      }
    } catch {
      // A malformed manifest is not reliable project-purpose evidence.
    }
  }

  const readme = files.find((file) => /(^|\/)readme(?:\.[^/]*)?$/i.test(file.path));
  if (!readme) return null;

  const lines = readme.content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].trim();
    if (
      !raw ||
      /^#{1,6}\s/.test(raw) ||
      /^\[?!?\[[^\]]*\]\(/.test(raw) ||
      /^```/.test(raw) ||
      /^[-*_]{3,}$/.test(raw)
    ) continue;

    const text = cleanMarkdown(raw);
    if (text.length >= 24) {
      return {
        text: text.slice(0, 280),
        evidence: makeEvidence(analysis, readme.path, index + 1)
      };
    }
  }

  return null;
}

function buildPresentationScript(analysis, description, technologyChoices = [], infrastructure = []) {
  const summary = analysis.summary || {};
  const sourceName = summary.sourceName || "This repository";
  const stack = [summary.frameworks?.[0], summary.primaryLanguage]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(" with ") || "a software project";
  const modules = (analysis.modules || []).slice(0, 3).map((module) => module.name);
  const entrypoint = summary.entrypoints?.[0];
  const firstRelationship = analysis.relationships?.find((item) => item.evidence?.length);
  const testCommand = findTestCommand(analysis);
  const mainTechnology = technologyChoices[0];
  const deployment = infrastructure.find((card) => card.category === "Deployment" && !card.id.startsWith("signal-"));
  const deploymentSummary = deployment?.details
    ?.filter((item) => ["Runtime", "Build Command", "Start Command", "Health Check Path"].includes(item.label))
    .map((item) => `${item.label.toLowerCase()}: ${item.value}`)
    .join("; ");

  return [
    description?.text
      ? `${sourceName} is described in its repository as ${description.text}`
      : `${sourceName} is a ${stack} codebase. I would confirm the exact problem it solves from its README before describing its purpose.`,
    `The scan identifies ${summary.codeFiles || 0} code files and ${analysis.modules?.length || 0} code groups.`,
    entrypoint
      ? `The analyzer marks ${entrypoint} as a likely starting point; that is a structural inference, so I would verify the run command in the project documentation.`
      : "The scan did not identify a reliable starting file, so I would verify the launch instructions in the project documentation.",
    modules.length
      ? `The largest code areas include ${modules.join(", ")}.`
      : "The scan did not find clear directory-based code areas.",
    mainTechnology
      ? `${mainTechnology.name} provides ${mainTechnology.role.toLowerCase()}${mainTechnology.apiEvidence ? ` One concrete use is ${mainTechnology.apiEvidence.excerpt} (${mainTechnology.apiEvidence.path}:${mainTechnology.apiEvidence.line}).` : ""} ${mainTechnology.projectRationale}`
      : "I would verify the role of the main technology against its actual imports and project documentation.",
    firstRelationship
      ? `A direct source import connects ${firstRelationship.from} to ${firstRelationship.to}, which gives me a concrete path to explain how parts of the code work together.`
      : "The scan did not find a clear local module connection, so I would trace a real feature from its entrypoint before presenting the architecture.",
    testCommand
      ? `The project declares ${testCommand} as a test command; I would run it before making claims about behavior.`
      : analysis.quality?.hasTests
        ? "Test-like files were detected, but the scan could not confirm the exact command for running them."
        : "The scan did not confirm a test suite, so I would check the repository instructions before claiming test coverage.",
    deployment
      ? `${deployment.title} configuration is indexed${deploymentSummary ? ` (${deploymentSummary})` : ""}; I would verify which hosting target is actually active.`
      : "No deployment blueprint was identified, so I would verify the actual hosting setup before describing production infrastructure."
  ].join("\n\n");
}

function findTestCommand(analysis) {
  const manifest = indexedFiles(analysis).find((file) => file.path.toLowerCase().endsWith("package.json"));
  if (!manifest) return "";

  try {
    const scripts = JSON.parse(manifest.content).scripts || {};
    const testScript = scripts.test;
    return typeof testScript === "string" && testScript.trim() ? `npm test (${testScript.trim()})` : "";
  } catch {
    return "";
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fileName(filePath) {
  return String(filePath || "").split("/").pop().toLowerCase();
}

function findLineEvidence(analysis, filePath, pattern) {
  return makeEvidence(analysis, filePath, null, pattern);
}

function findManifest(analysis) {
  return indexedFiles(analysis).find((file) => fileName(file.path) === "package.json") || null;
}

function findRuntimeManifest(analysis) {
  const manifestNames = new Set([
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "pipfile",
    "go.mod",
    "cargo.toml",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "composer.json",
    "gemfile",
    "pubspec.yaml"
  ]);
  return indexedFiles(analysis).find((file) => manifestNames.has(fileName(file.path))) || null;
}

function findScriptEvidence(analysis, scriptName) {
  const manifest = findManifest(analysis);
  if (!manifest) return null;
  return findLineEvidence(
    analysis,
    manifest.path,
    new RegExp(`^[\\s]*[\"']${escapeRegExp(scriptName)}[\"']\\s*:`)
  );
}

function readManifestScripts(analysis) {
  const manifest = findManifest(analysis);
  if (!manifest) return {};

  try {
    return JSON.parse(manifest.content).scripts || {};
  } catch {
    return {};
  }
}

const STACK_GUIDANCE = {
  express: {
    role: "HTTP routes and middleware for a Node.js application.",
    fit: "A small, flexible HTTP layer can suit an API or web server that wants to choose its own middleware and project structure."
  },
  fastify: {
    role: "HTTP server framework with a plugin-oriented design.",
    fit: "A schema-aware, plugin-based server can help teams compose APIs while keeping features isolated."
  },
  react: {
    role: "Reusable components for building browser interfaces.",
    fit: "A component model can help when screens share interactive UI pieces and state."
  },
  "next.js": {
    role: "Full-stack web framework built around React.",
    fit: "Integrated routing and rendering can reduce the amount of framework wiring a web product needs."
  },
  nextjs: {
    role: "Full-stack web framework built around React.",
    fit: "Integrated routing and rendering can reduce the amount of framework wiring a web product needs."
  },
  vue: {
    role: "Component framework for interactive browser interfaces.",
    fit: "A progressive component model can support incremental UI complexity without requiring every feature to use the same level of abstraction."
  },
  angular: {
    role: "Structured framework for browser applications.",
    fit: "A consistent framework can give a larger UI team shared conventions for components, dependency injection, and routing."
  },
  svelte: {
    role: "Component framework that compiles UI components for the browser.",
    fit: "A compile-time component model can keep interactive UI code concise while limiting runtime framework work."
  },
  django: {
    role: "Full-stack Python web framework.",
    fit: "A batteries-included framework can be useful when an application benefits from established conventions and built-in web features."
  },
  flask: {
    role: "Minimal Python web framework.",
    fit: "A small web layer can suit focused services that need control over which supporting components they add."
  },
  fastapi: {
    role: "Python framework for typed HTTP APIs.",
    fit: "Type-based request models and generated API schemas can make service contracts easier to validate and inspect."
  },
  nestjs: {
    role: "Structured Node.js framework for server applications.",
    fit: "Modules and dependency injection can provide shared structure as a server grows."
  },
  nest: {
    role: "Structured Node.js framework for server applications.",
    fit: "Modules and dependency injection can provide shared structure as a server grows."
  },
  vite: {
    role: "Frontend development server and build tool.",
    fit: "A focused dev/build tool can provide fast feedback without imposing a backend architecture."
  },
  astro: {
    role: "Web framework oriented toward content-driven sites.",
    fit: "A content-first rendering model can keep mostly static pages lightweight while allowing interactive components where needed."
  },
  "spring boot": {
    role: "Java framework for production web services and applications.",
    fit: "Convention-based configuration and a broad ecosystem can help teams build and operate structured Java services."
  },
  laravel: {
    role: "PHP framework for web applications.",
    fit: "A cohesive set of routing, data, and application conventions can help teams ship common web features consistently."
  },
  rails: {
    role: "Ruby web application framework.",
    fit: "Strong conventions can reduce setup decisions for database-backed web applications."
  },
  javascript: {
    role: "Primary language for the indexed application source.",
    fit: "JavaScript can let a team use one language across browser code and a Node.js service when both are present in the repository."
  },
  typescript: {
    role: "Typed JavaScript language used to describe application code and interfaces.",
    fit: "Static type checks can catch some mismatched values and interfaces before execution, especially as a codebase grows."
  },
  python: {
    role: "Primary language for the indexed application source.",
    fit: "Python's readable syntax and broad ecosystem can suit APIs, automation, and data-focused features."
  },
  java: {
    role: "Primary language for the indexed application source.",
    fit: "Java's static types and mature server ecosystem can support long-lived, structured services."
  },
  go: {
    role: "Primary language for the indexed application source.",
    fit: "Go's compiled binaries and standard-library networking support can suit operationally simple services."
  },
  php: {
    role: "Primary language for the indexed application source.",
    fit: "PHP's web ecosystem can make server-rendered applications and web APIs straightforward to build and deploy."
  }
};

function findDependencyUsage(analysis, dependencyName) {
  const sourcePattern = /\.(?:[cm]?[jt]sx?|py|go|java|cs|php|rb|vue|svelte)$/i;
  const files = indexedFiles(analysis).filter((file) => sourcePattern.test(file.path));
  const escapedName = escapeRegExp(dependencyName);
  const modulePattern = new RegExp(
    `(?:from\\s*[\"']${escapedName}(?:/[^\"']*)?[\"']|require\\(\\s*[\"']${escapedName}(?:/[^\"']*)?[\"']|import\\(\\s*[\"']${escapedName}(?:/[^\"']*)?[\"'])`,
    "i"
  );

  for (const file of files) {
    const line = file.content.split(/\r?\n/).findIndex((sourceLine) => modulePattern.test(sourceLine));
    if (line >= 0) return makeEvidence(analysis, file.path, line + 1);
  }
  return null;
}

function findFrameworkApiUse(analysis, technologyName) {
  const patterns = {
    express: /\bexpress\s*\(|\b(?:app|router)\.(?:use|get|post|put|patch|delete)\s*\(/i,
    fastify: /\bfastify\s*\(|\.(?:register|get|post|route)\s*\(/i,
    react: /\bcreateRoot\s*\(|\buse(?:State|Effect|Memo|Callback)\s*\(/i,
    vue: /\bcreateApp\s*\(|\bdefineComponent\s*\(/i,
    flask: /\bFlask\s*\(|@\w+\.route\s*\(/i,
    fastapi: /\bFastAPI\s*\(|@\w+\.(?:get|post|put|delete)\s*\(/i,
    django: /\burlpatterns\b|\bpath\s*\(/i,
    nestjs: /@(Controller|Get|Post|Module)\s*\(/i,
    nest: /@(Controller|Get|Post|Module)\s*\(/i
  };
  const pattern = patterns[String(technologyName).toLowerCase()];
  if (!pattern) return null;

  for (const file of indexedFiles(analysis)) {
    if (!/\.(?:[cm]?[jt]sx?|py|java|php)$/i.test(file.path)) continue;
    const lines = file.content.split(/\r?\n/);
    const line = lines.findIndex((content) => pattern.test(content));
    if (line >= 0) return makeEvidence(analysis, file.path, line + 1);
  }
  return null;
}

function findDocumentedRationale(analysis, technologyName) {
  const namePattern = new RegExp(`\\b${escapeRegExp(technologyName)}\\b`, "i");
  const reasonPattern = /\b(?:why|chose|choose|chosen|select(?:ed|ion)?|decision|because|due to|trade[- ]?off)\b/i;
  const documentationFiles = indexedFiles(analysis).filter((file) =>
    /(^|\/)(readme(?:\.[^/]*)?|docs\/.*\.(?:md|mdx|txt)|adr\/.*\.(?:md|mdx|txt)|architecture(?:\.[^/]*)?)$/i.test(file.path)
  );

  for (const file of documentationFiles) {
    const lines = file.content.split(/\r?\n/);
    const line = lines.findIndex((content) => namePattern.test(content) && reasonPattern.test(content));
    if (line >= 0) return makeEvidence(analysis, file.path, line + 1);
  }
  return null;
}

function buildTechnologyChoices(analysis) {
  const summary = analysis.summary || {};
  const frameworks = summary.frameworks || [];
  const dependencies = analysis.dependencies || [];
  const languageName = summary.primaryLanguage || "";
  const names = [...frameworks.slice(0, 3)];
  if (languageName && !names.some((name) => String(name).toLowerCase() === languageName.toLowerCase())) {
    names.push(languageName);
  }
  const choices = names.slice(0, 4).map((name) => {
    const normalized = String(name).toLowerCase();
    const guidance = STACK_GUIDANCE[normalized] || null;
    const dependency = dependencies.find((item) => String(item.name).toLowerCase() === normalized);
    const dependencyPath = dependency?.source || findManifest(analysis)?.path;
    const manifestEvidence = dependencyPath
      ? findLineEvidence(analysis, dependencyPath, new RegExp(escapeRegExp(dependency?.name || name), "i"))
      : null;
    const usageEvidence = dependency ? findDependencyUsage(analysis, dependency.name) : null;
    const apiEvidence = findFrameworkApiUse(analysis, name);
    const rationaleEvidence = findDocumentedRationale(analysis, name);

    return {
      name,
      observed: dependency
        ? `Declared in ${dependency.source || "a dependency manifest"}${usageEvidence ? " and imported by indexed source" : ""}.`
        : languageName && normalized === languageName.toLowerCase()
          ? `Primary language by indexed file count (${summary.languages?.find((language) => language.name === languageName)?.count || 0} files).`
          : "Detected from repository manifests and source signals.",
      role: guidance?.role || "The analyzer detected this framework; inspect its linked usage to confirm the exact responsibilities in this project.",
      typicalFit: guidance?.fit || "Teams commonly choose a framework to supply conventions or capabilities they do not want to build themselves; verify which ones this project uses.",
      projectRationale: rationaleEvidence
        ? `A repository document mentions this technology alongside a selection or trade-off explanation: ${rationaleEvidence.excerpt}`
        : "The indexed files confirm the technology, but no direct selection rationale was found. Present the fit above as a reasoned explanation, not a documented historical fact.",
      usageEvidence,
      apiEvidence,
      rationaleEvidence,
      evidence: [
        manifestEvidence,
        usageEvidence,
        apiEvidence,
        rationaleEvidence,
        !dependency && languageName && normalized === languageName.toLowerCase()
          ? makeEvidence(analysis, indexedFiles(analysis).find((file) => file.language === languageName)?.path)
          : null
      ].filter(Boolean)
    };
  });

  if (!choices.length && summary.primaryLanguage) {
    const languageFile = indexedFiles(analysis).find((file) => file.language === summary.primaryLanguage);
    choices.push({
      name: summary.primaryLanguage,
      observed: `Primary language by indexed file count (${summary.languages?.find((language) => language.name === summary.primaryLanguage)?.count || 0} files).`,
      role: "The main programming language used by the indexed source files.",
      typicalFit: "A common language can simplify shared tooling and make it easier for contributors to move between related code areas.",
      projectRationale: "The repository does not explain why this language was selected; treat this as a general engineering consideration, not a confirmed project decision.",
      usageEvidence: null,
      apiEvidence: null,
      rationaleEvidence: null,
      evidence: languageFile ? [makeEvidence(analysis, languageFile.path)] : []
    });
  }

  return choices;
}

function buildInfrastructure(analysis) {
  const files = indexedFiles(analysis);
  const cards = [];
  const manifest = findRuntimeManifest(analysis);
  const scripts = readManifestScripts(analysis);
  const commandDetails = Object.entries(scripts)
    .filter(([name]) => ["dev", "build", "start", "test", "lint", "typecheck"].includes(name))
    .slice(0, 5)
    .map(([name, command]) => ({
      label: name,
      value: String(command).slice(0, 140),
      evidence: findScriptEvidence(analysis, name)
    }));

  if (manifest) {
    cards.push({
      id: "runtime",
      title: "Runtime & project commands",
      category: "Runtime",
      description: `${analysis.summary?.primaryLanguage || "Project language"}${analysis.summary?.frameworks?.length ? ` with ${analysis.summary.frameworks.slice(0, 2).join(", ")}` : ""}. ${fileName(manifest.path) === "package.json" ? "This manifest declares the available local commands." : `${manifest.path} is a runtime or dependency manifest; this scan did not parse its commands.`}`,
      details: commandDetails,
      evidence: [makeEvidence(analysis, manifest.path)]
    });
  }

  const deliverySignals = (analysis.platformSignals || []).filter((signal) =>
    ["Delivery", "Deployment"].includes(signal.category)
  );
  for (const signal of deliverySignals.slice(0, 2)) {
    const filePath = signal.evidence?.[0];
    const signalFile = findFile(analysis, filePath);
    const configEvidence = signalFile
      ? findLineEvidence(analysis, signalFile.path, /^\s*(?:uses|run|script|commands)\s*:/i)
        || findLineEvidence(analysis, signalFile.path, /^\s*(?:name|on|runs-on|steps|runtime|platform|command)\s*:/i)
      : null;
    cards.push({
      id: `signal-${signal.id}`,
      title: signal.name,
      category: signal.category,
      description: signal.detail,
      details: [],
      evidence: [configEvidence || (signalFile ? makeEvidence(analysis, signalFile.path) : null)].filter(Boolean)
    });
  }

  const deployPatterns = [
    { pattern: /^render\.ya?ml$/, title: "Render service", description: "Render blueprint for service runtime, build/start commands, health checks, and deployment settings.", properties: ["name", "type", "runtime", "buildCommand", "startCommand", "healthCheckPath", "autoDeployTrigger"] },
    { pattern: /^dockerfile(?:\..+)?$/, title: "Container image", description: "Docker instructions define how the application image is assembled and launched.", properties: [] },
    { pattern: /^vercel\.json$/, title: "Vercel deployment", description: "Vercel project configuration for routes, builds, or deployment behavior.", properties: [] },
    { pattern: /^netlify\.toml$/, title: "Netlify deployment", description: "Netlify build and hosting configuration.", properties: [] },
    { pattern: /^fly\.toml$/, title: "Fly.io deployment", description: "Fly.io app configuration for runtime and deployment settings.", properties: [] },
    { pattern: /^procfile$/, title: "Process launch", description: "Process declaration for a hosting platform.", properties: [] },
    { pattern: /^serverless\.ya?ml$/, title: "Serverless deployment", description: "Serverless framework configuration for deployed functions and resources.", properties: [] }
  ];

  for (const candidate of deployPatterns) {
    const file = files.find((item) => candidate.pattern.test(fileName(item.path)));
    if (!file) continue;
    let details = [];
    if (candidate.properties.length) {
      details = candidate.properties
        .map((property) => {
          const pattern = new RegExp(`^\\s*${escapeRegExp(property)}\\s*:\\s*(.*?)\\s*(?:#.*)?$`, "i");
          const lines = file.content.split(/\r?\n/);
          const index = lines.findIndex((line) => pattern.test(line));
          if (index < 0) return null;
          const value = String(lines[index].match(pattern)?.[1] || "").replace(/^[\"']|[\"']$/g, "").trim();
          if (!value) return null;
          return {
            label: property.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()),
            value: value.slice(0, 140),
            evidence: makeEvidence(analysis, file.path, index + 1)
          };
        })
        .filter(Boolean);
    } else {
      const configEvidence = findLineEvidence(analysis, file.path, /^(?:\s*(?:FROM|WORKDIR|EXPOSE|CMD|ENTRYPOINT)\b|\s*[^#\s].*:\s*)/i);
      if (configEvidence) details.push({ label: "Configuration", value: configEvidence.excerpt, evidence: configEvidence });
    }
    cards.push({
      id: `deploy-${file.path}`,
      title: candidate.title,
      category: "Deployment",
      description: candidate.description,
      details,
      evidence: [makeEvidence(analysis, file.path)]
    });
    break;
  }

  const tests = files.filter((file) => /(^|\/)(test|tests|spec|specs)(\/|\.)/i.test(file.path));
  if (tests.length && !commandDetails.some((item) => item.label === "test")) {
    cards.push({
      id: "test-files",
      title: "Test files",
      category: "Verification",
      description: `${tests.length} test-like file${tests.length === 1 ? " was" : "s were"} detected. File names alone do not confirm coverage or a passing test run.`,
      details: [],
      evidence: tests.slice(0, 2).map((file) => makeEvidence(analysis, file.path))
    });
  }

  if (!cards.length) {
    cards.push({
      id: "infra-not-detected",
      title: "No deployment blueprint detected",
      category: "Not detected",
      description: "This scan did not find a supported hosting or container configuration. Check the README and hosting dashboard before describing where the application runs.",
      details: [],
      evidence: []
    });
  }

  return cards.slice(0, 6);
}

function buildWorkflow(analysis, infrastructure) {
  const summary = analysis.summary || {};
  const files = indexedFiles(analysis);
  const entrypoint = (summary.entrypoints || []).find((filePath) => findFile(analysis, filePath));
  const entryFile = entrypoint ? findFile(analysis, entrypoint) : null;
  const firstRelationship = entryFile
    ? (analysis.relationships || []).find((relationship) => relationship.from === entryFile.module && relationship.evidence?.length)
    : null;
  const nextRelationship = firstRelationship
    ? (analysis.relationships || []).find((relationship) => relationship.from === firstRelationship.to && relationship.evidence?.length)
    : null;
  const testCommand = findTestCommand(analysis);
  const testFiles = files.filter((file) => /(^|\/)(test|tests|spec|specs)(\/|\.)/i.test(file.path));
  const deployment = infrastructure.find((item) => item.category === "Deployment" && !item.id.startsWith("signal-"));
  const delivery = infrastructure.find((item) => item.category === "Delivery");
  const ciEvidence = delivery?.evidence?.[0];

  const stages = [
    {
      id: "start",
      title: "Start",
      detail: entrypoint
        ? `${entrypoint} is the likely entrypoint. Confirm the command and runtime before treating it as definitive.`
        : "No reliable entrypoint was found; use documented startup instructions to locate the runtime start.",
      state: entrypoint ? "Likely" : "Not detected",
      evidence: entrypoint ? [makeEvidence(analysis, entrypoint, null, /\b(require|import|export|main|app\.|router|listen)\b/i)].filter(Boolean) : []
    },
    {
      id: "trace",
      title: "Trace",
      detail: firstRelationship
        ? `${firstRelationship.from} imports ${firstRelationship.to}${nextRelationship ? `, which connects onward to ${nextRelationship.to}` : ""}. This is a static dependency path, not guaranteed runtime order.`
        : "No entrypoint-linked module import was confirmed. Follow a feature in Explorer to establish a source-backed path.",
      state: firstRelationship ? "Import evidence" : "Not detected",
      evidence: [
        ...(firstRelationship?.evidence || []).slice(0, 1),
        ...(nextRelationship?.evidence || []).slice(0, 1)
      ].map((item) => makeEvidence(analysis, item.path, item.line)).filter(Boolean)
    },
    {
      id: "verify",
      title: "Verify",
      detail: testCommand
        ? `The manifest declares ${testCommand}. A declared command is not proof that the tests currently pass.`
        : testFiles.length
          ? `${testFiles.length} test-like files were found, but the scan could not confirm how to run them.`
          : ciEvidence
            ? `${delivery.title} configuration was found; inspect its steps to identify checks. A workflow file does not prove a recent run passed.`
            : "No tests or run command were confirmed in the indexed files. Check project docs and CI before claiming validation.",
      state: testCommand ? "Command found" : testFiles.length ? "Files found" : ciEvidence ? "CI config found" : "Not confirmed",
      evidence: [
        findScriptEvidence(analysis, "test"),
        ...testFiles.slice(0, 1).map((file) => makeEvidence(analysis, file.path)),
        ...(!testCommand && !testFiles.length && ciEvidence ? [ciEvidence] : [])
      ].filter(Boolean)
    },
    {
      id: "operate",
      title: "Operate",
      detail: deployment
        ? `${deployment.title} configuration is present. Use its linked settings to explain the declared runtime and deployment behavior.`
        : delivery
          ? `No supported hosting blueprint was detected. ${delivery.title} is a CI/delivery signal, not proof of where production is hosted.`
          : "No supported deployment blueprint was detected. Check the README or hosting provider for the production runtime.",
      state: deployment ? "Config detected" : "Not detected",
      evidence: deployment?.evidence || delivery?.evidence || []
    }
  ];

  const exampleEvidence = firstRelationship?.evidence?.[0];
  const exampleFile = exampleEvidence ? findFile(analysis, exampleEvidence.path) : null;
  const exampleLine = exampleFile?.content.split(/\r?\n/)[(exampleEvidence?.line || 1) - 1] || "";

  return {
    title: "From startup to deployment",
    note: "The import path shows which files depend on each other. It does not prove exact runtime timing, network traffic, or that a deployment is currently healthy.",
    stages,
    example: exampleEvidence
      ? {
          title: "Read one real connection",
          body: `This line in ${exampleEvidence.path} imports ${exampleEvidence.import ? `"${exampleEvidence.import}"` : "a local module"}. In plain English, this file depends on code at that path. Open the target next and trace the behavior there; an import does not prove what runs for every request.`,
          snippet: exampleLine.trim().slice(0, 200),
          evidence: makeEvidence(analysis, exampleEvidence.path, exampleEvidence.line)
        }
      : null
  };
}

function buildInterviewQuestions(analysis, description, workflow, technologies, infrastructure) {
  const purposeAnswer = description?.text
    ? `The repository describes itself as: ${description.text}`
    : "I would first confirm the product goal from the README; the static scan can explain the implementation structure, but it cannot reliably invent the business problem.";
  const purposeEvidence = description?.evidence ? [description.evidence] : [];
  const startStage = workflow.stages.find((stage) => stage.id === "start");
  const traceStage = workflow.stages.find((stage) => stage.id === "trace");
  const verifyStage = workflow.stages.find((stage) => stage.id === "verify");
  const operateStage = workflow.stages.find((stage) => stage.id === "operate");
  const mainTechnology = technologies[0];
  const qualityFinding = analysis.quality?.findings?.[0];
  const improvementEvidence = qualityFinding?.path
    ? [makeEvidence(analysis, qualityFinding.path, qualityFinding.line)].filter(Boolean)
    : [];

  const technologyAnswer = mainTechnology
    ? mainTechnology.rationaleEvidence
      ? `${mainTechnology.name} is detected in this repository. ${mainTechnology.projectRationale}${mainTechnology.apiEvidence ? ` One implementation example is ${mainTechnology.apiEvidence.excerpt} (${mainTechnology.apiEvidence.path}:${mainTechnology.apiEvidence.line}).` : ""}`
      : `${mainTechnology.name} is detected in this repository. ${mainTechnology.typicalFit}${mainTechnology.apiEvidence ? ` In this code, one use is ${mainTechnology.apiEvidence.excerpt} (${mainTechnology.apiEvidence.path}:${mainTechnology.apiEvidence.line}).` : ""} The exact project-specific reason was not found in indexed documentation, so I would present that as a reasoned fit rather than a historical fact.`
    : "The scan did not confirm a framework choice. I would explain the language and libraries only after checking their use in source and project documentation.";

  const runtimeCard = infrastructure.find((card) => card.id === "runtime");
  const deploymentCard = infrastructure.find((card) => card.category === "Deployment" && !card.id.startsWith("signal-"));
  const ciCard = infrastructure.find((card) => card.category === "Delivery");
  const testCommandDetail = runtimeCard?.details?.find((item) => item.label === "test");
  const startCommandDetail = runtimeCard?.details?.find((item) => item.label === "start");
  const deploymentDetails = deploymentCard?.details?.filter((item) =>
    ["Runtime", "Build Command", "Start Command", "Health Check Path", "Auto Deploy Trigger"].includes(item.label)
  ) || [];
  const validationAnswer = [
    testCommandDetail ? `Tests: ${testCommandDetail.value}.` : verifyStage.detail,
    ciCard ? `${ciCard.title} workflow configuration is indexed; that file does not prove the latest workflow run passed.` : "",
    startCommandDetail ? `Local launch: ${startCommandDetail.value}.` : "",
    deploymentCard
      ? `${deploymentCard.title} configuration is present${deploymentDetails.length ? ` (${deploymentDetails.map((item) => `${item.label.toLowerCase()}: ${item.value}`).join("; ")})` : ""}. A config file does not prove this is the active production target.`
      : operateStage.detail
  ].filter(Boolean).join(" ");

  const improvementAnswer = qualityFinding
    ? `The static review flags ${qualityFinding.title}${qualityFinding.detail ? `: ${qualityFinding.detail}` : "."} I would reproduce or test the scenario before calling it a confirmed defect.`
    : analysis.quality?.hasTests
      ? "A useful next step is to strengthen a behavior-level test around the project's most important user journey and keep it in CI. That is a proposal, not a claim that the current implementation is broken."
      : "A practical next step is to add a focused automated test around the main user journey and wire it into CI. The scan did not confirm test coverage; that does not prove no tests exist outside the indexed files.";

  return [
    {
      question: "What problem does this project solve?",
      answer: purposeAnswer,
      evidence: purposeEvidence,
      followUp: "Who is the intended user, and what alternative did this replace?"
    },
    {
      question: "Can you walk me through how the code is organized?",
      answer: `${startStage.detail} ${traceStage.detail}`,
      evidence: [...startStage.evidence, ...traceStage.evidence],
      followUp: "Which file would you change first for a small feature, and how would you verify the change?"
    },
    {
      question: "Why did you use this technology stack?",
      answer: technologyAnswer,
      evidence: mainTechnology?.evidence || [],
      followUp: mainTechnology ? `What trade-off does ${mainTechnology.name} introduce here?` : "Which library or runtime would you investigate first, and why?"
    },
    {
      question: "How is the project tested and deployed?",
      answer: validationAnswer,
      evidence: [
        ...(testCommandDetail?.evidence ? [testCommandDetail.evidence] : verifyStage.evidence),
        ...(ciCard?.evidence || []),
        ...(startCommandDetail?.evidence ? [startCommandDetail.evidence] : []),
        ...deploymentDetails.map((item) => item.evidence).filter(Boolean),
        ...(!deploymentDetails.length ? operateStage.evidence : [])
      ],
      followUp: "What evidence would you check after a release to know it is healthy?"
    },
    {
      question: "What would you improve next?",
      answer: improvementAnswer,
      evidence: improvementEvidence,
      followUp: "How would you measure whether that improvement helped?"
    }
  ];
}

function createKnowledgeCheck(answer, distractors, explanation, evidence, seed) {
  const options = [answer, ...distractors].slice(0, 3);
  const offset = [1, 2, 0, 2, 1][seed % 5] % options.length;
  const rotated = [...options.slice(offset), ...options.slice(0, offset)];

  return {
    question: "Which statement is best supported by the repository?",
    options: rotated,
    correctIndex: rotated.indexOf(answer),
    explanation,
    evidence: (evidence || []).filter(Boolean)
  };
}

function buildKnowledgeChecks(analysis, description, entrypoint, moduleGroups, workflow) {
  const testCommand = findTestCommand(analysis);
  const firstRelationship = analysis.relationships?.find((item) => item.evidence?.length);
  const readme = indexedFiles(analysis).find((file) => /(^|\/)readme(?:\.[^/]*)?$/i.test(file.path));
  const entryEvidence = entrypoint ? makeEvidence(analysis, entrypoint, null, /\b(require|import|export|main|app\.|router|listen)\b/i) : null;
  const moduleEvidence = (moduleGroups[0]?.evidence || []).slice(0, 1);
  const checks = [
    createKnowledgeCheck(
      description ? "The README or project manifest describes it." : "Check the README and project documentation; the stack alone cannot establish purpose.",
      ["The most-used language tells you the user problem.", "A directory name is enough to state the product goal."],
      description
        ? `The repository states: ${description.text}`
        : "No project purpose was confirmed from the indexed files. Treat the goal as unknown until documentation supports it.",
      [description?.evidence || (readme ? makeEvidence(analysis, readme.path) : null)],
      0
    ),
    createKnowledgeCheck(
      entrypoint ? `Inspect ${entrypoint} first, then confirm it against the run command.` : "Use the documented run command to locate the actual starting point.",
      ["Start with the largest source file.", "The first alphabetical file is always the entrypoint."],
      entrypoint
        ? `${entrypoint} is a likely entrypoint inferred from names and source patterns; verify it against the manifest or README.`
        : "The scan could not identify a reliable entrypoint. Follow the documented launch command instead.",
      [entryEvidence, findScriptEvidence(analysis, "start")],
      1
    ),
    createKnowledgeCheck(
      "The analyzer groups files by directory; that is a navigation aid, not proof of formal architecture.",
      ["The analyzer measures runtime calls between services.", "Each folder automatically represents a separate deployed service."],
      moduleGroups.length
        ? `For example, ${moduleGroups[0].name} contains ${moduleGroups[0].fileCount} indexed files.`
        : "No directory-based module groups were identified.",
      moduleEvidence,
      2
    ),
    createKnowledgeCheck(
      firstRelationship
        ? `A source import connects ${firstRelationship.from} to ${firstRelationship.to}.`
        : "No cross-folder import was confirmed, so trace a real feature before describing a connection.",
      ["The diagram proves the exact runtime execution order.", "A folder relationship proves a network call between services."],
      firstRelationship
        ? "An import confirms a static code dependency. It does not prove timing, runtime execution, or network traffic."
        : "No matching relationship was found in the indexed source. That does not prove no runtime relationship exists.",
      firstRelationship?.evidence?.slice(0, 2).map((item) => makeEvidence(analysis, item.path, item.line)) || [],
      3
    ),
    createKnowledgeCheck(
      testCommand ? `The manifest declares ${testCommand}.` : "The scan did not confirm a test command; check project docs and CI before drawing a conclusion.",
      ["A test-like filename proves all tests pass.", "A deployment file is the same as a test run."],
      workflow.stages.find((stage) => stage.id === "verify")?.detail || "Check the declared test command and CI result before claiming validation.",
      [findScriptEvidence(analysis, "test"), workflow.stages.find((stage) => stage.id === "verify")?.evidence?.[0]],
      4
    )
  ];

  const phaseByStep = ["Orient", "Orient", "Trace", "Trace", "Present"];
  return checks.map((check, index) => ({ ...check, phase: phaseByStep[index] }));
}

function buildChangeImpact(analysis) {
  const modules = (analysis.modules || [])
    .filter((module) => module?.name)
    .slice()
    .sort((a, b) => (b.fileCount || 0) - (a.fileCount || 0) || a.name.localeCompare(b.name))
    .slice(0, 24);
  const moduleNames = new Set(modules.map((module) => module.name));
  const importersByDependency = new Map();

  // Import edges point from importer to dependency; likely impact travels back to importers.
  for (const relationship of analysis.relationships || []) {
    if (!moduleNames.has(relationship.to) || !moduleNames.has(relationship.from)) continue;
    const evidence = (relationship.evidence || [])
      .map((item) => makeEvidence(analysis, item.path, item.line))
      .filter(Boolean);
    if (!evidence.length) continue;
    const importers = importersByDependency.get(relationship.to) || [];
    importers.push({ module: relationship.from, evidence });
    importersByDependency.set(relationship.to, importers);
  }

  return {
    note: "The picker covers up to the 24 largest indexed code areas. This is a static reverse-import estimate: an importer may need review, but the path does not prove runtime impact, call frequency, or that every listed module will require a code change.",
    modules: modules.map((module) => {
      const visited = new Set([module.name]);
      const queue = [{ name: module.name, distance: 0, path: [module.name], evidence: [] }];
      const affected = [];

      while (queue.length) {
        const current = queue.shift();
        for (const importer of importersByDependency.get(current.name) || []) {
          if (visited.has(importer.module)) continue;
          visited.add(importer.module);
          const entry = {
            name: importer.module,
            distance: current.distance + 1,
            path: [importer.module, ...current.path],
            evidence: [...current.evidence, ...importer.evidence]
          };
          affected.push(entry);
          queue.push(entry);
        }
      }

      return { name: module.name, fileCount: module.fileCount || 0, affected };
    })
  };
}

function buildEvidenceCoverage(analysis, description, infrastructure) {
  const files = indexedFiles(analysis);
  const entrypoint = (analysis.summary?.entrypoints || []).find((filePath) => findFile(analysis, filePath));
  const relationship = (analysis.relationships || []).find((item) => item.evidence?.length);
  const testCommand = findTestCommand(analysis);
  const testFile = files.find((file) => /(^|\/)(test|tests|spec|specs)(\/|\.)/i.test(file.path));
  const delivery = infrastructure.find((card) => card.category === "Delivery");
  const deployment = infrastructure.find((card) => card.category === "Deployment" && !card.id.startsWith("signal-"));
  const rationaleTechnology = (analysis.summary?.frameworks || [])[0];
  const technologyRationale = rationaleTechnology ? findDocumentedRationale(analysis, rationaleTechnology) : null;
  const rows = [
    {
      id: "purpose",
      label: "Project purpose",
      status: description?.evidence ? "observed" : "not-found",
      detail: description?.evidence
        ? "Purpose text appears in an indexed README or project manifest."
        : "No clear purpose statement was found in the indexed documentation or manifest; confirm it with the project owner.",
      evidence: [description?.evidence].filter(Boolean)
    },
    {
      id: "stack",
      label: "Primary language",
      status: analysis.summary?.primaryLanguage && analysis.summary.primaryLanguage !== "Unknown" ? "observed" : "not-found",
      detail: analysis.summary?.primaryLanguage && analysis.summary.primaryLanguage !== "Unknown"
        ? `Detected as ${analysis.summary.primaryLanguage} from indexed code files.`
        : "No supported source-language signal was detected.",
      evidence: [makeEvidence(analysis, files.find((file) => file.language === analysis.summary?.primaryLanguage)?.path)].filter(Boolean)
    },
    {
      id: "entrypoint",
      label: "Application entrypoint",
      status: entrypoint ? "inferred" : "not-found",
      detail: entrypoint
        ? "Likely entrypoint inferred from filename and source patterns; verify against the documented start command."
        : "No likely entrypoint was identified in the indexed files.",
      evidence: entrypoint ? [makeEvidence(analysis, entrypoint)] : []
    },
    {
      id: "imports",
      label: "Local module connections",
      status: relationship ? "observed" : "not-found",
      detail: relationship
        ? "At least one local source import was found. It proves a static dependency, not runtime order or network traffic."
        : "No cross-area source import was confirmed; this does not rule out runtime or configuration relationships.",
      evidence: relationship?.evidence?.slice(0, 2).map((item) => makeEvidence(analysis, item.path, item.line)).filter(Boolean) || []
    },
    {
      id: "verification",
      label: "Test signal",
      status: testCommand || testFile ? "observed" : "not-found",
      detail: testCommand
        ? `A test command is declared (${testCommand}); this scan did not run it.`
        : testFile
          ? "Test-like files were found; their existence does not confirm coverage or passing results."
          : "No test command or test-like file was confirmed in the indexed files.",
      evidence: [
        testCommand ? findScriptEvidence(analysis, "test") : null,
        testFile ? makeEvidence(analysis, testFile.path) : null
      ].filter(Boolean)
    },
    {
      id: "delivery",
      label: "CI / delivery configuration",
      status: delivery ? "observed" : "not-found",
      detail: delivery
        ? `${delivery.title} configuration is indexed; it does not confirm a successful or recent run.`
        : "No supported CI or delivery configuration was detected.",
      evidence: delivery?.evidence || []
    },
    {
      id: "deployment",
      label: "Deployment configuration",
      status: deployment ? "observed" : "not-found",
      detail: deployment
        ? `${deployment.title} configuration is indexed; it does not prove this is the active production deployment.`
        : "No supported deployment blueprint was detected.",
      evidence: deployment?.evidence || []
    },
    {
      id: "technology-rationale",
      label: "Documented technology rationale",
      status: technologyRationale ? "observed" : "not-found",
      detail: technologyRationale
        ? "A repository document connects a technology to a selection or trade-off explanation."
        : "The repository does not document a clear reason for the primary framework choice; explain general fit as your reasoning, not historical fact.",
      evidence: [technologyRationale].filter(Boolean)
    },
    {
      id: "runtime",
      label: "Runtime behavior and test results",
      status: "not-verified",
      detail: "This is static analysis: the application was not executed and tests or deployment health were not checked."
    }
  ];
  const counts = rows.reduce((result, row) => {
    result[row.status] += 1;
    return result;
  }, { observed: 0, inferred: 0, "not-found": 0, "not-verified": 0 });

  return {
    note: "Evidence labels describe what this static scan could support. ‘Not found’ means not detected in indexed files, not proof that a capability is absent.",
    counts,
    rows
  };
}

function buildLearningGuide(analysis) {
  const summary = analysis.summary || {};
  const files = indexedFiles(analysis);
  const description = findProjectDescription(analysis);
  const entrypoint = (summary.entrypoints || []).find((filePath) => findFile(analysis, filePath));
  const firstEntryEvidence = entrypoint
    ? makeEvidence(analysis, entrypoint, null, /\b(require|import|export|main|app\.|router|listen)\b/i)
    : null;
  const moduleGroups = (analysis.modules || []).slice(0, 5).map((module) => ({
    name: module.name,
    fileCount: module.fileCount,
    evidence: (module.examples || [])
      .slice(0, 2)
      .map((filePath) => makeEvidence(analysis, filePath))
      .filter(Boolean)
  }));
  const flows = (analysis.relationships || [])
    .filter((relationship) => relationship.evidence?.length)
    .slice(0, 4)
    .map((relationship) => ({
      from: relationship.from,
      to: relationship.to,
      evidence: relationship.evidence
        .slice(0, 2)
        .map((item) => makeEvidence(analysis, item.path, item.line))
        .filter(Boolean)
    }));
  const primaryLanguage = summary.primaryLanguage || "an unidentified language";
  const frameworks = (summary.frameworks || []).slice(0, 3);
  const stack = [frameworks.join(", "), primaryLanguage].filter(Boolean).join(" with ");
  const verificationFile = files.find((file) => /(^|\/)(test|tests|spec|specs)(\/|\.)/i.test(file.path));
  const testEvidence = verificationFile ? makeEvidence(analysis, verificationFile.path) : null;
  const infrastructure = buildInfrastructure(analysis);
  const technologyChoices = buildTechnologyChoices(analysis);
  const workflow = buildWorkflow(analysis, infrastructure);
  const interviewQuestions = buildInterviewQuestions(analysis, description, workflow, technologyChoices, infrastructure);
  const knowledgeChecks = buildKnowledgeChecks(analysis, description, entrypoint, moduleGroups, workflow);
  const changeImpact = buildChangeImpact(analysis);
  const evidenceCoverage = buildEvidenceCoverage(analysis, description, infrastructure);

  const steps = [
    {
      id: "purpose",
      phase: knowledgeChecks[0].phase,
      knowledgeCheck: knowledgeChecks[0],
      title: "Start with the purpose",
      body: description?.text
        ? `The repository describes itself as: “${description.text}” The scan also found ${summary.codeFiles || 0} code files, primarily written in ${primaryLanguage}.`
        : `The scan found ${summary.codeFiles || 0} code files, primarily written in ${primaryLanguage}${frameworks.length ? `, with ${frameworks.join(", ")} detected` : ""}. That tells you what it is built with, not what problem it solves; check the README before presenting its purpose.`,
      basis: description ? "Purpose quoted from repository documentation or manifest" : "Stack and file counts observed; purpose not confirmed",
      evidence: [description?.evidence || (entrypoint ? makeEvidence(analysis, entrypoint) : null)].filter(Boolean)
    },
    {
      id: "entrypoint",
      phase: knowledgeChecks[1].phase,
      knowledgeCheck: knowledgeChecks[1],
      title: "Find where it starts",
      body: entrypoint
        ? `${entrypoint} is a likely starting file based on its name and detected code patterns. In plain terms, this is the first place to inspect to learn how work begins; confirm it against the documented run command.`
        : "No reliable starting file was identified. Look for a documented command in the README or a package manifest before deciding how this project runs.",
      basis: entrypoint ? "Likely entrypoint inferred from file name and source patterns" : "No entrypoint detected",
      evidence: firstEntryEvidence ? [firstEntryEvidence] : []
    },
    {
      id: "modules",
      phase: knowledgeChecks[2].phase,
      knowledgeCheck: knowledgeChecks[2],
      title: "Meet the main parts",
      body: moduleGroups.length
        ? `The analyzer grouped files by directory-based code areas: ${moduleGroups.map((module) => `${module.name} (${module.fileCount} files)`).join(", ")}. These are useful places to explore, but folder names alone do not prove formal architecture boundaries.`
        : "No clear top-level code groups were detected. Use the directory tree to explore the project one folder at a time.",
      basis: "Directory-based grouping observed; architectural meaning is inferred",
      groups: moduleGroups,
      evidence: moduleGroups.flatMap((module) => module.evidence).slice(0, 8)
    },
    {
      id: "flow",
      phase: knowledgeChecks[3].phase,
      knowledgeCheck: knowledgeChecks[3],
      title: "Follow a real connection",
      body: flows.length
        ? `A source import provides a concrete link between ${flows.slice(0, 3).map((flow) => `${flow.from} and ${flow.to}`).join("; ")}. Open the cited line, then follow the imported code to see how work moves through the project.`
        : "The scan could not confirm a cross-folder import. Choose a real feature in the Explorer and follow its imports rather than assuming a flow from the diagram alone.",
      basis: flows.length ? "Direct local import statements observed in indexed source" : "No cross-folder import evidence found",
      flows,
      evidence: flows.flatMap((flow) => flow.evidence).slice(0, 8)
    },
    {
      id: "verify",
      phase: knowledgeChecks[4].phase,
      knowledgeCheck: knowledgeChecks[4],
      title: "Check how the project is verified",
      body: findTestCommand(analysis)
        ? `The package manifest declares “${findTestCommand(analysis)}”. Running the documented test command is the next step before relying on behavioral claims.`
        : analysis.quality?.hasTests
          ? "Test-like files were found, but the exact command is not confirmed by the scan. Check the README or CI configuration before presenting test coverage."
          : "No test suite was confirmed by the scan. This is not proof that tests do not exist; check the project instructions and CI configuration.",
      basis: findTestCommand(analysis) ? "Test command read from package manifest" : "Test coverage not confirmed",
      evidence: [testEvidence, findTestCommand(analysis) ? makeEvidence(analysis, files.find((file) => file.path.toLowerCase().endsWith("package.json"))?.path, null, /"test"\s*:/) : null].filter(Boolean)
    }
  ];

  return {
    stack,
    steps,
    workflow,
    infrastructure,
    technologyChoices,
    interviewQuestions,
    changeImpact,
    evidenceCoverage,
    interviewNote: "Use these as practice prompts, not memorized claims. Be clear about what you personally built, what you learned from the code, and which explanations are hypotheses.",
    presentationScript: buildPresentationScript(analysis, description, technologyChoices, infrastructure),
    certaintyNote: "Direct file and manifest evidence is linked. Entry points and folder responsibilities are analyzer inferences, not guarantees of runtime behavior.",
    scopeNote: "This is a static scan of indexed files. It does not execute the project or prove that a feature works."
  };
}

module.exports = {
  buildLearningGuide,
  makeEvidence
};
