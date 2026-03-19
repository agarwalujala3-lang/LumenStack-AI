const path = require("path");

const { analyzeCodebase } = require("../src/services/analyzerService");
const { generateInsights } = require("../src/services/aiService");

async function main() {
  const analysis = await analyzeCodebase(process.cwd(), {
    sourceName: path.basename(process.cwd()),
    sourceType: "workspace"
  });

  const insights = await generateInsights(analysis);

  console.log("Summary:", analysis.summary);
  console.log("Top modules:", analysis.modules.slice(0, 5));
  console.log("AI status:", insights.aiStatus);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
