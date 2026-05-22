# CLAUDE.md — AI Career Coach

Briefing file for Claude. Read this at the start of every session before touching any code.
Then read `BACKLOG.md` to find the current build priorities.

---

## What this app is

A Next.js 14 (App Router) web app that analyses a job-seeker's resume against a specific job
posting. The user picks a career stage, optionally answers up to five discovery questions, uploads
a resume, and provides a job description (pasted text or a URL). The app calls Claude via the
Anthropic SDK and returns a scored results dashboard with coaching feedback.

It is a single-page flow driven entirely by React state (`app/page.tsx`). There are two backend
API routes and no database.

---

## Tech stack

- **Framework:** Next.js 14, App Router, TypeScript
- **Styling:** Tailwind CSS — no external UI component library; `lucide-react` for icons only
- **File parsing:** `pdf-parse` (PDF), `mammoth` (DOCX)
- **AI:** `@anthropic-ai/sdk`, model `claude-sonnet-4-6` (overrideable via env var)
- **Deployment:** Vercel, auto-deploy on push to `main`; `vercel.json` sets a 60 s API timeout

---

## Project structure

```
app/
  page.tsx                  Entire client-side flow and all step state
  layout.tsx / globals.css  Shell, global styles, print stylesheet
  api/analyze/route.ts      POST endpoint — parses resume, scrubs PII, calls Claude
  api/fetch-jd/route.ts     POST endpoint — server-side fetch of a job-posting URL
lib/
  types.ts                  Shared TypeScript types (AnalysisResult, CareerStage, etc.)
  parser.ts                 PDF/DOCX text extraction
  pii.ts                    Regex-based PII scrubber (runs before text reaches Claude)
  prompt.ts                 Builds the Super Prompt
  schema.ts                 Anthropic tool-use schema + server-side response normaliser
  jobUrl.ts                 Job-posting URL fetch + extraction (SSRF-guarded)
components/
  StepIndicator, JourneySelector, DiscoveryForm
  JobDescriptionInput, ResumeUpload
  ResultsDashboard, ScoreGauge, ScoreBar
  FeedbackButton
```

---

## Key architectural decisions

**Forced tool use for structured output.** `app/api/analyze/route.ts` uses `tool_choice` with the
schema in `lib/schema.ts`, `max_tokens: 4096`, and one automatic retry on transient/degraded
responses. A defensive normaliser clamps scores and recomputes the weighted overall score
server-side. This replaced brittle free-text JSON parsing.

**In-memory rate limiting.** Per-IP, per-hour cap (`RATE_LIMIT_PER_HOUR`, default 10). Enforced
in module memory — no external store. Resets per warm serverless instance. Chosen over Upstash
Redis to avoid extra infrastructure at MVP scale.

**Print-to-PDF export.** "Save as PDF" calls `window.print()` against a print stylesheet. No
server-side PDF generation or extra route.

**URL support for job descriptions.** `JobDescriptionInput.tsx` detects a single-URL input via
regex. `app/api/fetch-jd/route.ts` fetches it server-side (SSRF-guarded), extracts text, and
populates the textbox for user review. LinkedIn and Indeed often return a login wall; clear
"paste instead" guidance is shown in that case.

**sessionStorage for iterative resume comparison.** When a user clicks "Upload Revised Resume",
the current `AnalysisResult` is serialised to `sessionStorage` (key:
`career_coach_previous_result`) before clearing the resume and result state. On mount,
`page.tsx` hydrates `previousResult` from sessionStorage so the comparison survives a same-tab
refresh. Full reset ("Analyze Another Resume") clears sessionStorage. Tab-close loses the
snapshot — this is acceptable because comparison is a single-session activity.

**Token usage logging.** Every analysis call logs `[analyze] usage ...` (input/output/total
tokens, stop_reason) to Vercel Logs.

**Discovery revisit flow.** When a user skips discovery and lands on results, nudge banners
appear in the "Your North Star" and "Career Coaching Insight" sections (hidden if discovery
was answered). Clicking "Answer questions" calls `goToDiscovery`, which keeps `resumeFile`
and `jobDescription` in state, sets `returningToResults = true`, clears the result, and jumps
to step 2. When the user completes step 2 and clicks Next, `submit()` is called directly —
no upload step. A loading overlay replaces the step content during analysis; results replace
it when done. Going back from step 2 to step 1 clears `returningToResults`. This flow does
not update `previousResult` (no delta chip — that is for revised resumes only).

**Loading overlay.** When `loading` is true, a centered `Loader2` spinner replaces all step
content in the card and the step indicator is hidden. This applies to all submit paths
(normal step 4 submit and returning-to-results). Implemented in `app/page.tsx`.

**Feedback form.** `FeedbackButton.tsx` renders a fixed pill button (bottom-right, `print:hidden`)
visible from step 2 onwards. Opens a modal with a required message field, optional email, and
step context. Submits to Formspree (`https://formspree.io/f/xwvzodbb`) as JSON. Fires
`trackEvent("feedback_submitted")` on success.

---

## Environment variables

| Name | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Server-only; never exposed to client |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Override the Claude model ID |
| `RATE_LIMIT_PER_HOUR` | No | `10` | Analyses per client IP per hour |
| `NEXT_PUBLIC_DISCOVERY_REVISIT` | No | `false` | Enable discovery revisit flow (nudge banners + auto-submit). Baked into client bundle at build time — requires redeploy to toggle. Not yet implemented; see BACKLOG.md. |

Set in `.env.local` for local dev (git-ignored). Set in Vercel → Project Settings →
Environment Variables for production; a redeploy is required after changes.

---

## Deployment workflow

- GitHub remote: `https://github.com/keithreynolds/career-coach.git` (remote `origin`)
- Vercel is connected to that repo and auto-deploys on push to `main`
- Workflow: commit locally → `git push origin main` → Vercel builds automatically
- "Redeploy" in the Vercel dashboard only rebuilds an existing commit (useful after env var
  changes, not for new code)

---

## UX conventions

- Mobile responsive from 375 px width
- No external UI component libraries — Tailwind utilities + `lucide-react` icons only
- Discovery questions are optional (XP Polish item); the flow must work whether or not they
  were answered
- The results dashboard is the same page as the flow (no routing); it renders when `result`
  state is non-null
- Before/after score delta is top-level only (no per-section comparison) — keep the UX clean
- Delta display format: `Previously X% [+N pts chip]` directly below ScoreGauge; chip is
  green for improvement, red for regression, grey for no change; hidden when no prior result
- During analysis, a centered spinner replaces the entire step card content; step indicator
  is hidden. No per-step loading states — the overlay handles all submit paths uniformly.
- The AI Voice Warning banner has been removed from the results dashboard (was cluttering the page)

---

## Current build cycle

See `BACKLOG.md` for full details, sub-tasks, and acceptance criteria. Current cycle:

1. ~~**Google Analytics**~~ — ✅ shipped
2. ~~**Feedback Form**~~ — ✅ shipped
3. ~~**XP Polish**~~ — ✅ shipped (includes discovery nudge banners, returning-to-results flow, loading overlay, AI voice warning removal)
4. **Test Coverage** — pending
5. **Discovery Revisit Feature Flag** — pending decision (see BACKLOG.md)

---

## Starting a session

1. Read this file.
2. Read `BACKLOG.md` — it is the single source of truth for planned work.
3. Ask Keefer what he wants to focus on, or propose the next backlog item if the context
   is clear.

You have direct read/write access to this folder. Prefer editing existing files over creating
new ones. When introducing a new component or lib file, add it to the structure section above.
