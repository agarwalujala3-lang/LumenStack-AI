# Contributing To LumenStack AI

Thanks for helping improve LumenStack AI. This repository is maintained as a professional portfolio project, so changes should be clear, scoped, tested, and easy for reviewers to understand.

## Local Setup

```bash
npm install
cp .env.example .env
npm start
```

Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm start
```

The app runs without `OPENAI_API_KEY` by using fallback summaries.

## Branches

Use concise branch names:

```text
feature/recruiter-proof
fix/upload-validation
chore/readme-polish
```

## Quality Checks

Run the relevant checks before opening a pull request:

```bash
npm run smoke
npm run security:audit
```

When frontend structure, page content, or navigation changes, also run:

```bash
npm run site:audit
```

## Pull Request Expectations

A strong PR includes:

- A short summary of user-facing impact.
- The reason the change matters.
- Screenshots for visible UI changes.
- Commands used for validation.
- Notes about any known limitation or follow-up.

Keep unrelated changes out of the same PR. This makes the project easier to review and preserves a professional repository history.
