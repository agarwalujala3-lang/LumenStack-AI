# LumenStack AI

LumenStack AI is an AI-powered codebase architecture analyzer built with Node.js, Express, and vanilla JavaScript. It turns a GitHub repository or ZIP upload into an interactive architecture brief with diagrams, quality signals, compare-mode review, exports, and codebase chat.

## Live App

- Live deployment: [https://lumenstack-ai.onrender.com](https://lumenstack-ai.onrender.com)
- Health check: [https://lumenstack-ai.onrender.com/health](https://lumenstack-ai.onrender.com/health)

## Highlights

- Analyze a public GitHub repository or uploaded ZIP archive
- Detect languages, entrypoints, manifests, frameworks, dependencies, modules, and relationships
- Generate architecture, sequence, class, and dependency diagrams with Mermaid
- Run compare mode against a baseline repo or ZIP for review-style structural diffs
- Ask follow-up questions with retrieval-backed codebase chat
- Export markdown and JSON architecture reports
- Accept GitHub webhook events and store repository analysis snapshots
- Present results in a cinematic AI-style interface with dark mode, custom cursor effects, and mobile touch interactions

## Frontend Experience

- Desktop: glowing cursor, motion reveal, parallax, spotlight hover effects, cinematic loading overlay
- Mobile: tap ripple, swipe wake trail, and touch press glow instead of a fake cursor
- Theme system: light mode and dark mode toggle with persisted preference

## Stack

- Node.js
- Express
- Vanilla JavaScript
- Mermaid.js
- OpenAI API with fallback mode
- Render Blueprint deployment

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local env file:

   ```bash
   copy .env.example .env
   ```

3. Add variables to `.env` if you want live AI output:

   ```env
   OPENAI_API_KEY=your_key_here
   OPENAI_MODEL=gpt-5-mini
   PORT=3000
   GITHUB_WEBHOOK_SECRET=your_secret_here
   ```

4. Start the app:

   ```bash
   npm start
   ```

5. Open `http://localhost:3000`

## Scripts

- `npm start`: start the production server
- `npm run dev`: run the server in watch mode
- `npm run smoke`: run the local smoke test
- `npm run openai:check`: verify OpenAI connectivity and model access

## API Endpoints

- `POST /api/analyze`: analyze a repo or ZIP, with optional comparison baseline
- `POST /api/chat`: ask questions against a saved analysis session
- `GET /api/export/:analysisId?format=markdown|json`: export the report
- `POST /api/github/webhook`: receive GitHub webhook-triggered analysis requests
- `GET /api/github/reports/:owner/:repo`: fetch the latest stored webhook report
- `GET /health`: service health check

## Render Deployment

This repo includes a [render.yaml](render.yaml) Blueprint for Render.

1. Push the repo to GitHub
2. Create a new Render Blueprint
3. Connect the `LumenStack-AI` repository
4. Leave Blueprint Path empty
5. Add `OPENAI_API_KEY` in Render service settings
6. Deploy

Render uses:

- `npm install` as the build command
- `npm start` as the start command
- `/health` as the health check path

## Environment Variables

- `OPENAI_API_KEY`: enables live AI explanation and chat
- `OPENAI_MODEL`: defaults to `gpt-5-mini`
- `PORT`: local server port, defaults to `3000`
- `GITHUB_WEBHOOK_SECRET`: verifies webhook signatures

## Project Structure

- `server.js`: app entrypoint
- `src/app.js`: Express app and routes
- `src/services/sourceService.js`: GitHub clone and ZIP extraction
- `src/services/analyzerService.js`: architecture analysis and Mermaid generation
- `src/services/aiService.js`: explanation and documentation generation
- `src/services/chatService.js`: retrieval-backed chat
- `src/services/comparisonService.js`: compare-mode review logic
- `src/services/sessionStore.js`: analysis session and webhook report storage
- `public/`: UI, motion system, diagrams, and interactions
- `render.yaml`: Render Blueprint definition
- `.github/workflows/smoke.yml`: smoke workflow

## Verification

Run the local smoke test:

```bash
npm run smoke
```

Check OpenAI access:

```bash
npm run openai:check
```
