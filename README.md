# LumenStack AI

LumenStack AI is a full-stack Node.js and Express application that turns a repository into an interactive architecture intelligence workspace.

It supports:

- repository analysis from a public GitHub URL or ZIP upload
- compare mode for baseline-vs-current structural review
- dependency and module detection
- quality scoring, hotspot detection, and review findings
- multiple Mermaid diagram types
- retrieval-backed codebase chat
- markdown and JSON exports
- webhook-ready GitHub ingestion

## Stack

- Node.js
- Express
- Vanilla JavaScript frontend
- Mermaid.js
- OpenAI API with local fallback mode

## Features

- Analyze uploaded ZIP archives or public GitHub repositories
- Detect languages, entrypoints, framework hints, and dependency manifests
- Infer modules, cross-module relationships, and hotspot files
- Generate Mermaid architecture, sequence, class, and dependency diagrams
- Run compare mode against a baseline repo or ZIP for review-style summaries
- Ask follow-up questions against the analyzed codebase
- Export markdown and JSON reports
- Accept GitHub webhook events and store the latest analyzed report per repository

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Fill in environment variables if you want live AI output or webhook signature verification:

   ```bash
   copy .env.example .env
   ```

3. Start the server:

   ```bash
   npm start
   ```

4. Open `http://localhost:3000`.

## Environment Variables

- `OPENAI_API_KEY`: optional, enables live AI explanation and chat answers
- `OPENAI_MODEL`: optional, defaults to `gpt-5-mini`
- `PORT`: optional, defaults to `3000`
- `GITHUB_WEBHOOK_SECRET`: optional, verifies GitHub webhook signatures

## Scripts

- `npm start`: start the app
- `npm run dev`: start the app in watch mode
- `npm run smoke`: run a local analysis against the current workspace
- `npm run openai:check`: confirm that your OpenAI key and model work

## Main Endpoints

- `POST /api/analyze`: analyze a repo or ZIP, optionally with a comparison baseline
- `POST /api/chat`: ask questions against a stored analysis session
- `GET /api/export/:analysisId?format=markdown|json`: export the current report
- `POST /api/github/webhook`: accept webhook-triggered analyses
- `GET /api/github/reports/:owner/:repo`: fetch the latest stored webhook report

## Project Structure

- `server.js`: server entrypoint
- `src/app.js`: Express routes and orchestration
- `src/services/sourceService.js`: GitHub clone and ZIP extraction
- `src/services/analyzerService.js`: static analysis, quality scoring, and Mermaid generation
- `src/services/aiService.js`: AI explanation and documentation generation
- `src/services/chatService.js`: retrieval-backed codebase chat
- `src/services/comparisonService.js`: compare mode and review findings
- `src/services/sessionStore.js`: in-memory analysis session storage
- `public/`: frontend files
- `.github/workflows/smoke.yml`: GitHub Actions smoke test

## Verification

Smoke-test the local analysis path:

```bash
npm run smoke
```

Verify OpenAI connectivity:

```bash
npm run openai:check
```
