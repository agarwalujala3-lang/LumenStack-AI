const { createApp } = require("../src/app");

const requiredHeaders = [
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "x-download-options",
  "x-permitted-cross-domain-policies",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
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

    const contentSecurityPolicy = home.headers.get("content-security-policy") || "";
    for (const directive of ["object-src 'none'", "frame-ancestors 'none'", "upgrade-insecure-requests"]) {
      if (!contentSecurityPolicy.includes(directive)) {
        failures.push(`CSP is missing directive: ${directive}`);
      }
    }

    const securityTxt = await fetch(`${base}/.well-known/security.txt`);
    const securityText = await securityTxt.text();

    if (!securityTxt.ok || !securityText.includes("Contact: mailto:")) {
      failures.push("security.txt disclosure endpoint is missing or incomplete.");
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
