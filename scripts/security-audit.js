const { createApp } = require("../src/app");

const requiredHeaders = [
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy"
];

async function main() {
  const app = createApp();
  const server = app.listen(0);

  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const failures = [];

  try {
    const home = await fetch(`${base}/`);
    for (const header of requiredHeaders) {
      if (!home.headers.get(header)) {
        failures.push(`Missing security header: ${header}`);
      }
    }

    const badUpload = new FormData();
    badUpload.append("codebase", new Blob(["not a zip"], { type: "text/plain" }), "bad.txt");
    const uploadResponse = await fetch(`${base}/api/analyze`, {
      method: "POST",
      body: badUpload
    });

    if (uploadResponse.status !== 400) {
      failures.push(`Expected invalid upload to return 400, got ${uploadResponse.status}`);
    }

    const authResponse = await fetch(`${base}/api/auth/demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "<script>bad</script>" })
    });
    const authPayload = await authResponse.json();

    if (authPayload.user.name.includes("<") || authPayload.user.name.includes(">")) {
      failures.push("Demo auth name was not sanitized.");
    }
  } finally {
    server.close();
  }

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log("Security audit passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
