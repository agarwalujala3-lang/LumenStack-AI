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

  const scoreDelta = candidateAnalysis.quality.score - baseAnalysis.quality.score;
  const codeFilesDelta = candidateAnalysis.summary.codeFiles - baseAnalysis.summary.codeFiles;
  const relationshipDelta = candidateAnalysis.relationships.length - baseAnalysis.relationships.length;
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
    ...riskFindings.map((finding) => `- [${finding.priority}] ${finding.title}: ${finding.detail}`)
  ].join("\n");

  return {
    summary,
    stats: {
      scoreDelta,
      codeFilesDelta,
      moduleDelta: candidateAnalysis.modules.length - baseAnalysis.modules.length,
      dependencyDelta: dependencyDiff.added.length - dependencyDiff.removed.length,
      relationshipDelta
    },
    frameworkDiff,
    dependencyDiff,
    moduleDiff,
    riskFindings,
    reviewMarkdown
  };
}

module.exports = {
  compareAnalyses
};
