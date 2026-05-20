# AI Career Coach

A production-ready Next.js 14 app that analyzes a candidate's resume against a target job description using Anthropic's Claude. It returns a synthesized career "North Star," a structural audit, keyword gap analysis, and an overall impact score.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Icons:** lucide-react
- **File Parsing:** pdf-parse (PDF), mammoth (DOCX)
- **AI:** Anthropic SDK (`@anthropic-ai/sdk`), model `claude-sonnet-4-6`
- **Deployment Target:** Vercel

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# then edit .env.local and set ANTHROPIC_API_KEY

# 3. Start dev server
npm run dev
```

Open http://localhost:3000.

## How It Works

1. **Step 1 — Journey Selection.** User picks New Grad, Mid-Career, or Late-Career.
2. **Step 2 — Guided Discovery.** Five required prompts capture strengths, dislikes, differentiator, dream job, and stretch goal.
3. **Step 3 — Job Description.** User pastes the full target JD (minimum 100 characters).
4. **Step 4 — Resume Upload.** Drag-and-drop accepts `.pdf` or `.docx` up to 10 MB.

On submit, `POST /api/analyze` runs:

1. Parse resume text with `pdf-parse` or `mammoth`.
2. Scrub PII (email, phone, address, URLs, LinkedIn, and likely names in the first 3 lines) via `lib/pii.ts`.
3. Build the Super Prompt via `lib/prompt.ts`.
4. Call Claude (`claude-sonnet-4-6`) with forced tool use, so the response is
   constrained to the schema in `lib/schema.ts` — no brittle JSON parsing.
   Transient failures are retried once automatically.
5. Normalize the response (clamp scores, recompute the weighted overall score
   server-side, fill defaults) and return it to the client.

The results dashboard renders inline on the same page (no routing).

## Project Structure

```
app/
  page.tsx               Main single-page app
  layout.tsx             Root layout + metadata
  globals.css            Tailwind entry
  api/analyze/route.ts   POST endpoint that calls Claude
lib/
  pii.ts                 Regex-based PII scrubber
  parser.ts              PDF/DOCX text extraction
  prompt.ts              Super Prompt builder
  schema.ts              Tool-use schema + response normalizer
  types.ts               Shared TS types
components/
  StepIndicator.tsx
  JourneySelector.tsx
  DiscoveryForm.tsx
  JobDescriptionInput.tsx
  ResumeUpload.tsx
  ResultsDashboard.tsx
  ScoreGauge.tsx
  ScoreBar.tsx
```

## Environment Variables

| Name | Required | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Read on the server only inside `app/api/analyze/route.ts`. Never exposed to the client. |
| `ANTHROPIC_MODEL` | No | Overrides the Claude model ID. Defaults to `claude-sonnet-4-6` if unset. |

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel and add `ANTHROPIC_API_KEY` under Project Settings → Environment Variables.
3. The included `vercel.json` raises the API route timeout to 60 seconds.
4. Do **not** commit `.env.local` — it's already excluded in `.gitignore`.

## Privacy

Resumes are processed in-memory in the API route. Before the model call, PII is removed: emails, phone numbers, addresses, URLs, LinkedIn handles, and likely names on the first three lines. No resume content is persisted anywhere.

## Quality Bars

- Mobile responsive from 375px width.
- Loading state during the API call.
- Graceful error UI if the API fails.
- No external UI component libraries — Tailwind + lucide-react only.
