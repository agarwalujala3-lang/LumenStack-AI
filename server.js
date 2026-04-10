const { createApp } = require("./src/app");

const port = Number(process.env.PORT || 3000);
const app = createApp();

app.listen(port, "0.0.0.0", () => {
  console.log(`AI Codebase Explainer listening on http://0.0.0.0:${port}`);
});
