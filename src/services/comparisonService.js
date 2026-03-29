function listDiff(baseItems, nextItems, selector) {
  const baseSet = new Set(baseItems.map(selector));
  const nextSet = new Set(nextItems.map(selector));

  return {
    added: [...nextSet].filter((item) => !baseSet.has(item)),
    removed: [...baseSet].filter((item) => !nextSet.has(item))
  };
}

function createFinding(priority, title, detail) {
  return {
    priority,
    title,
    detail
  };
}

function normalizeSampleContent(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function compareSearchIndex(baseItems = [], nextItems = []) {
  const baseMap = new Map(baseItems.map((item) => [item.path, item]));
  const nextMap = new Map(nextItems.map((item) => [item.path, item]));
  const added = [];
  const removed = [];
  const changed = [];

  for (const [path, item] of nextMap.entries()) {
    if (!baseMap.has(path)) {
      added.push(path);
      continue;
    }

    const baseItem = baseMap.get(path);
    const contentChanged = normalizeSampleContent(baseItem.content) !== normalizeSampleContent(item.content);
    const shapeChanged =
      baseItem.module !== item.module ||
      baseItem.language !== item.language ||
      baseItem.role !== item.role;

    if (contentChanged || shapeChanged) {
      changed.push(path);
    }
  }

  for (const path of baseMap.keys()) {
    if (!nextMap.has(path)) {
      removed.push(path);
    }
  }

  return {
    added,
    removed,
    changed
  };
}

function compareAnalyses(baseAnalysis, candidateAnalysis) {
  const dependencyDiff = listDiff(
    baseAnalysis.dependencies,
    candidateAnalysis.dependencies,
    (item) => item.name
  );
  const moduleDiff = listDiff(
    baseAnalysis.modules,
    candidateAnalysis.modules,
    (item) => item.name
  );
  const frameworkDiff = listDiff(
    baseAnalysis.summary.frameworks.map((name) => ({ name })),
    candidateAnalysis.summary.frameworks.map((name) => ({ name })),
    (item) => item.name
  );
  const fileDiff = compareSearchIndex(baseAnalysis.searchIndex, candidateAnalysis.searchIndex);

  const scoreDelta = candidateAnalysis.quality.score - baseAnalysis.quality.score;
  const totalFilesDelta = candidateAnalysis.summary.totalFiles - baseAnalysis.summary.totalFiles;
  const codeFilesDelta = candidateAnalysis.summary.codeFiles - baseAnalysis.summary.codeFiles;
  const relationshipDelta = candidateAnalysis.relationships.length - baseAnalysis.relationships.length;
  const changedCodeFiles = fileDiff.added.length + fileDiff.removed.length + fileDiff.changed.length;
  const riskFindings = [];

  if (dependencyDiff.added.length) {
    riskFindings.push(
      createFinding(
        "high",
        "New dependencies introduced",
        `Added: ${dependencyDiff.added.slice(0, 6).join(", ")}`
      )
    );
  }

  if (moduleDiff.added.length) {
    riskFindings.push(
      createFinding(
        "medium",
        "New modules detected",
        `Added: ${moduleDiff.added.slice(0, 6).join(", ")}`
      )
    );
  }

  if (changedCodeFiles) {
    const preview = [
      ...fileDiff.changed,
      ...fileDiff.added.map((file) => `${file} (new)`),
      ...fileDiff.removed.map((file) => `${file} (removed)`)
    ]
      .slice(0, 6)
      .join(", ");

    riskFindings.push(
      createFinding(
        changedCodeFiles > 3 ? "medium" : "low",
        "Code files changed",
        `${changedCodeFiles} code file path(s) changed between the baseline and current version. ${preview}`
      )
    );
  }

  if (scoreDelta < 0) {
    riskFindings.push(
      createFinding(
        "medium",
        "Quality score dropped",
        `Score changed from ${baseAnalysis.quality.score} to ${candidateAnalysis.quality.score}.`
      )
    );
  }

  if (relationshipDelta > 5) {
    riskFindings.push(
      createFinding(
        "medium",
        "System complexity increased",
        `Cross-module links increased by ${relationshipDelta}.`
      )
    );
  }

  if (!riskFindings.length) {
    riskFindings.push(
      createFinding(
        "low",
        "No major structural risk detected",
        "The comparison did not surface sharp jumps in dependencies, score, or topology."
      )
    );
  }

  const summary = [
    `${candidateAnalysis.summary.sourceName} compared against baseline ${baseAnalysis.summary.sourceName}.`,
    `Changed code files: ${changedCodeFiles}.`,
    `Total files changed by ${totalFilesDelta >= 0 ? "+" : ""}${totalFilesDelta}.`,
    `Code files changed by ${codeFilesDelta >= 0 ? "+" : ""}${codeFilesDelta}.`,
    `Module count changed by ${candidateAnalysis.modules.length - baseAnalysis.modules.length >= 0 ? "+" : ""}${candidateAnalysis.modules.length - baseAnalysis.modules.length}.`,
    `Quality score changed by ${scoreDelta >= 0 ? "+" : ""}${scoreDelta}.`
  ].join(" ");

  const reviewMarkdown = [
    "## Comparison Summary",
    summary,
    "",
    "## Added Dependencies",
    dependencyDiff.added.length ? dependencyDiff.added.join(", ") : "None",
    "",
    "## Removed Dependencies",
    dependencyDiff.removed.length ? dependencyDiff.removed.join(", ") : "None",
    "",
    "## Added Modules",
    moduleDiff.added.length ? moduleDiff.added.join(", ") : "None",
    "",
    "## Removed Modules",
    moduleDiff.removed.length ? moduleDiff.removed.join(", ") : "None",
    "",
    "## Review Findings",
    ...riskFindings.map((finding) => `- [${finding.priority}] ${finding.title}: ${finding.detail}`),
    "",
    "## Changed Code Files",
    fileDiff.changed.length ? fileDiff.changed.join(", ") : "None",
    "",
    "## Added Code Files",
    fileDiff.added.length ? fileDiff.added.join(", ") : "None",
    "",
    "## Removed Code Files",
    fileDiff.removed.length ? fileDiff.removed.join(", ") : "None"
  ].join("\n");

  return {
    summary,
    stats: {
      totalFilesDelta,
      scoreDelta,
      codeFilesDelta,
      changedCodeFiles,
      moduleDelta: candidateAnalysis.modules.length - baseAnalysis.modules.length,
      dependencyDelta: dependencyDiff.added.length - dependencyDiff.removed.length,
      relationshipDelta
    },
    frameworkDiff,
    dependencyDiff,
    fileDiff,
    moduleDiff,
    riskFindings,
    reviewMarkdown
  };
}

module.exports = {
  compareAnalyses
};
