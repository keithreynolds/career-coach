# Project Notes — AI Career Coach

Context and handoff notes for picking this project back up. If you're an AI
assistant starting a fresh session: read this file first, then `README.md`.

_Last updated: 2026-05-20_

## What this app is

A Next.js 14 (App Router) web app that gives job seekers an AI-powered
analysis of how well their resume matches a specific job posting. The user
picks a career stage, answers a few profile questions, uploads a resume, and
pastes a job description; the app calls Claude and returns a scored results
dashboard with coaching feedback.

It's a single-page flow driven by React state, with one backend API route.

## Tech stack

- Next.js 14, App Router, TypeScript
- Tailwind CSS for styling; `lucide-react` for icons (no UI component library)
- `pdf-parse` and `mammoth` for resume text extraction
- `@anthropic-ai/sdk` for the Claude call
- Deployed on Vercel, source hosted on GitHub

## Project structure

- `app/page.tsx` — the whole client-side flow and step state
- `app/layout.tsx`, `app/globals.css` — shell and global styles
- `app/api/analyze/route.ts` — the only backend route; validates input,
  parses the resume, scrubs PII, calls Claude, returns the result
- `components/` — UI pieces: `StepIndicator`, `JourneySelector`,
  `DiscoveryForm`, `ResumeUpload`, `JobDescriptionInput`,
  `ResultsDashboard`, `ScoreGauge`, `ScoreBar`
- `lib/parser.ts` — resume extraction (PDF/DOCX)
- `lib/pii.ts` — regex-based PII scrubbing before text is sent to Claude
- `lib/prompt.ts` — builds the analysis prompt
- `lib/schema.ts` — the Anthropic tool-use schema + response normalizer
- `lib/types.ts` — shared TypeScript types

## Environment variables

Set in `.env.local` for local dev (this file is git-ignored — never commit
it) and in the Vercel project's Settings -> Environment Variables for
production. Changing them in Vercel requires a redeploy to take effect.

- `ANTHROPIC_API_KEY` — required. Anthropic API key (separate product from a
  Claude Pro subscription; billed via console.anthropic.com).
- `ANTHROPIC_MODEL` — optional. The Claude model ID. Defaults to
  `claude-sonnet-4-6` in code if unset.

## Deployment

- GitHub: `https://github.com/keithreynolds/career-coach.git` (remote `origin`)
- Vercel: connected to that repo; auto-deploys on push to `main`
- Workflow: commit locally, then `git push origin main`. Vercel builds
  automatically. A manual "Redeploy" in the Vercel dashboard only rebuilds an
  existing commit (useful after changing an env var, not for new code).

## Key decisions made

- **Model ID is an env var** (`ANTHROPIC_MODEL`) so it can be swapped without
  touching code. The original spec's `claude-sonnet-4-20250514` was retired;
  current default is `claude-sonnet-4-6`.
- **Forced tool use for structured output.** Earlier the route parsed Claude's
  free-text JSON, which intermittently failed when output was truncated. It now
  uses `tool_choice` with a fixed schema (`lib/schema.ts`), `max_tokens` 4096,
  one automatic retry on transient/degraded responses, and a defensive
  normalizer that clamps scores and recomputes the weighted overall score
  server-side.
- **Token usage logging.** Every analysis call logs `[analyze] usage ...`
  (input/output/total tokens, stop_reason) to the Vercel Logs tab.
- **Scope kept tight.** Hardening so far covered AI response reliability only.

## Backlog — ideas discussed but not yet built

- **Abuse / rate-limit protection** — the API route has no rate limiting, so a
  shared link could run up API cost. Consider per-IP throttling.
- **File-parsing robustness** — better handling of scanned/image-only PDFs and
  unusual resume formats; clearer guidance when extraction yields no text.
- **Error-UX polish** — friendlier in-app messaging and retry affordances for
  the error states the API already returns.

## How to resume work

Open this folder in Cowork and say something like:
"Read PROJECT_NOTES.md and let's continue — I want to work on [X]."
