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
    line: lineIndex + 1
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

function buildPresentationScript(analysis, description) {
  const summary = analysis.summary || {};
  const sourceName = summary.sourceName || "This repository";
  const stack = [summary.frameworks?.[0], summary.primaryLanguage]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(" with ") || "a software project";
  const modules = (analysis.modules || []).slice(0, 3).map((module) => module.name);
  const entrypoint = summary.entrypoints?.[0];
  const firstRelationship = analysis.relationships?.find((item) => item.evidence?.length);
  const testCommand = findTestCommand(analysis);

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
    firstRelationship
      ? `A direct source import connects ${firstRelationship.from} to ${firstRelationship.to}, which gives me a concrete path to explain how parts of the code work together.`
      : "The scan did not find a clear local module connection, so I would trace a real feature from its entrypoint before presenting the architecture.",
    testCommand
      ? `The project declares ${testCommand} as a test command; I would run it before making claims about behavior.`
      : analysis.quality?.hasTests
        ? "Test-like files were detected, but the scan could not confirm the exact command for running them."
        : "The scan did not confirm a test suite, so I would check the repository instructions before claiming test coverage."
  ].join(" ");
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

  const steps = [
    {
      id: "purpose",
      title: "Start with the purpose",
      body: description?.text
        ? `The repository describes itself as: “${description.text}” The scan also found ${summary.codeFiles || 0} code files, primarily written in ${primaryLanguage}.`
        : `The scan found ${summary.codeFiles || 0} code files, primarily written in ${primaryLanguage}${frameworks.length ? `, with ${frameworks.join(", ")} detected` : ""}. That tells you what it is built with, not what problem it solves; check the README before presenting its purpose.`,
      basis: description ? "Purpose quoted from repository documentation or manifest" : "Stack and file counts observed; purpose not confirmed",
      evidence: [description?.evidence || (entrypoint ? makeEvidence(analysis, entrypoint) : null)].filter(Boolean)
    },
    {
      id: "entrypoint",
      title: "Find where it starts",
      body: entrypoint
        ? `${entrypoint} is a likely starting file based on its name and detected code patterns. In plain terms, this is the first place to inspect to learn how work begins; confirm it against the documented run command.`
        : "No reliable starting file was identified. Look for a documented command in the README or a package manifest before deciding how this project runs.",
      basis: entrypoint ? "Likely entrypoint inferred from file name and source patterns" : "No entrypoint detected",
      evidence: firstEntryEvidence ? [firstEntryEvidence] : []
    },
    {
      id: "modules",
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
    presentationScript: buildPresentationScript(analysis, description),
    certaintyNote: "Direct file and manifest evidence is linked. Entry points and folder responsibilities are analyzer inferences, not guarantees of runtime behavior.",
    scopeNote: "This is a static scan of indexed files. It does not execute the project or prove that a feature works."
  };
}

module.exports = {
  buildLearningGuide,
  makeEvidence
};
