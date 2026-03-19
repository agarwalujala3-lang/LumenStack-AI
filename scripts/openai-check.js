const OpenAI = require("openai");

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing in .env.");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model,
    input: "Reply with exactly: OPENAI_CONNECTION_OK"
  });

  console.log("Model:", model);
  console.log("Output:", response.output_text);
}

main().catch((error) => {
  const status = error?.status ? `HTTP ${error.status}` : "";
  const code = error?.code ? `(${error.code})` : "";
  const message = error?.message || String(error);
  console.error([status, code, message].filter(Boolean).join(" "));
  process.exitCode = 1;
});
