# Project Backlog: AI Career Coach

## Current Focus

Three features selected for the current cycle, in build order:

1. **URL Support for Job Descriptions** — shipped
2. **Iterative Resume Upload** — priority (next)
3. **Error-UX Polish**

Design decisions for each are recorded in their sections below.

---

## [x] MVP Launch
**Description:** Deploy the core "vibe-based" workflow to Vercel, including journey selection, guided discovery, basic resume parsing, and initial scoring.
**Sub-tasks:**
- [x] Initialize Next.js repository.
- [x] Create multi-step UI for discovery questions.
- [x] Implement basic PII removal for privacy.
- [x] Deploy to Vercel.
**Acceptance Criteria:**
- User can complete the 5 discovery questions.
- System generates an overall impact score (0-100%).

---

## [ ] Feature: Iterative Resume Upload (Revised Resume)
**Description:** Let users upload a revised resume from the results screen without re-entering their goals or the target job description, and show how their score changed.
**Design decisions:**
- New "Upload a revised resume" action on the Results Dashboard, alongside (and distinct from) the existing full-restart "Analyze Another Resume" button.
- Keep `careerStage`, `discovery`, and `jobDescription` in state; clear only the resume file and result; jump straight to the resume-upload step.
- Show a before/after score comparison (e.g. 62% → 78%) by retaining the previous result.
**Sub-tasks:**
- [ ] Add a revise path in `page.tsx` that keeps goals + job description and clears only the resume + result.
- [ ] Add a clearly-labelled "Upload a revised resume" button to the Results Dashboard, distinct from "Analyze Another Resume".
- [ ] Retain the previous result and pass it to the dashboard for comparison.
- [ ] Add a before/after delta display to the score header.
**Acceptance Criteria:**
- The user can upload a new resume from the dashboard without redoing goals or the job description.
- The new results screen shows the previous score, the new score, and the change.
- "Analyze Another Resume" still performs a full restart.

---

## [ ] Feature: Advanced "Do It For Me" Mode
**Description:** Offer specific AI-generated text snippets for each feedback item that the user can immediately copy and paste into their resume.
**Sub-tasks:**
- [ ] Update the **Logic Engine (Prompt 3)** to generate specific rewrite suggestions or "impact bullet points" for identified gaps.
- [ ] Create a "Copy Snippet" UI component next to each actionable feedback item on the dashboard.
- [ ] **Critical Integration:** Attach a persistent "Humanize this" warning to every snippet to remind users that **49% of hiring managers** reject AI-sounding content.
**Acceptance Criteria:**
- Every suggestion (Summary, Experience, Education) includes a tangible text block for the user to use.
- The user can improve their score by implementing these direct suggestions into their document.
- Suggestions should not be repeated verbatim for multiple sections. We should write a test case for this as well when evaluating builds.

---

## [x] Feature: URL Support for Job Descriptions
**Description:** Let the existing Job Description textbox accept a single job-posting URL instead of pasted text. On a recognised URL, the app fetches the page server-side, extracts the job text, and fills the textbox so the user can review and trim it before continuing.
**Status:** Shipped. Implemented via `lib/jobUrl.ts` (SSRF-guarded fetch + JSON-LD/HTML extraction), `app/api/fetch-jd/route.ts` (Node-runtime endpoint with its own rate limit), and `components/JobDescriptionInput.tsx` (URL detection, load button, loading/error UX).
**Design decisions:**
- Same textbox — no separate URL field. Detect a single URL with a regex.
- Best-effort fetch with graceful fallback. Company career pages (Greenhouse, Lever, Ashby, Workday) usually extract cleanly; LinkedIn and Indeed often return a login wall or JS-rendered shell. If extraction yields too little text, show a clear "paste the description instead" message rather than failing silently.
- Populate the textbox with the extracted text — transparent, so the user sees and can edit exactly what gets analysed.
- Update the hint and placeholder text to mention the link option.
**Sub-tasks:**
- [x] Detect single-URL input in `JobDescriptionInput.tsx` with a regex.
- [x] Add a server-side fetch + HTML-to-text extraction step, with SSRF guards (http/https only, block private/internal addresses).
- [x] Populate the textbox with the extracted text for user review.
- [x] Special-case the `MIN_LENGTH = 100` validation so a short URL does not block the "Next" button before the fetch runs.
- [x] Update the hint and placeholder text to mention pasting a link.
- [x] Show a fallback message when extraction yields too little usable text.
**Acceptance Criteria:**
- Pasting a fetchable job-posting URL fills the textbox with the extracted job description.
- A URL that cannot be read shows a clear prompt to paste the text instead — no silent failure.
- Pasting plain text continues to work exactly as before.

---

## [ ] Advanced 16-Point Structural Audit
**Description:** Expand the completeness check into a deep-dive audit of formatting, date consistency, and contact placement.
**Sub-tasks:**
- [ ] Program logic for 16-point audit (e.g., verifying Summary Statement, Experience, and Education presence).
- [ ] Create detailed formatting warning indicators.
**Acceptance Criteria:**
- Dashboard displays specific structural warnings beyond basic section presence.

---

## [ ] Full docscrubber.app Integration & Fallback
**Description:** Use **docscrubber.app** for primary browser-based PII redaction with multi-tier fallback.
**Sub-tasks:**
- [ ] Integrate docscrubber API for stripping names, addresses, and account numbers.
- [ ] Implement Regex and AI-processing fallbacks for high-level privacy.
**Acceptance Criteria:**
- No PII reaches the LLM scoring engine.

---

## [ ] AI Detection Mitigation Tooling
**Description:** Help users humanize resumes to avoid detection by hiring manager screening tools.
**Sub-tasks:**
- [ ] Add dashboard notifications about AI-rejection risks.
- [ ] Develop prompts that help users rewrite content in their "own voice".
**Acceptance Criteria:**
- Dashboard provides specific "humanization" guidance.

---

## [ ] ATS-Friendly Template Library
**Description:** Offer a library of pre-formatted templates for users to port improved content into.
**Sub-tasks:**
- [ ] Select high-performing .docx/PDF templates.
- [ ] Add a "Download Template" section.
**Acceptance Criteria:**
- Users can download templates verified for ATS readability.

---

## [ ] File-Parsing Robustness
**Description:** Improve resume text extraction so scanned/image-only PDFs and unusual resume formats are handled gracefully, with clear guidance when extraction yields no usable text.
**Sub-tasks:**
- [ ] Detect when `lib/parser.ts` extracts little or no text and surface a specific, actionable message.
- [ ] Handle scanned/image-only PDFs (e.g. prompt the user to upload a text-based file, or flag OCR as a future option).
- [ ] Test against unusual layouts (multi-column, tables, non-standard DOCX) and document known limitations.
**Acceptance Criteria:**
- A user who uploads an unsupported or empty-text file sees a clear explanation instead of a generic failure.
- Common real-world resume formats parse without silent text loss.

---

## [ ] Error-UX Polish
**Description:** Make the in-app error states friendlier, with clearer messaging and retry affordances for the failure cases the API already returns. Third feature of the current cycle — also supplies the fallback UX that the URL feature depends on.
**Sub-tasks:**
- [ ] Map each API error response (validation, rate limit, parse failure, Claude/transient errors) to a friendly user-facing message.
- [ ] Add a "Try Again" affordance where retrying is sensible (e.g. transient errors, rate-limit cooldown).
- [ ] Ensure rate-limit responses communicate the wait time clearly to the user.
- [ ] Cover the URL-fetch failure case from the URL feature with clear "paste instead" guidance.
**Acceptance Criteria:**
- Every error path shows a human-readable message rather than a raw error or generic failure.
- Users can recover from transient failures without restarting the whole flow.

---

## [ ] Test Coverage
**Description:** Establish a suite of manual and/or automated test cases to verify critical user flows before shipping features. No implementation framework chosen yet — the immediate goal is to capture test cases while they're fresh so they're ready when we prioritise this work.

**Sub-tasks:**
- [ ] **Choose a testing framework.** Options to evaluate: Playwright (end-to-end, closest to real user flows, good Vercel/Next.js support), Cypress (similar to Playwright, larger ecosystem), Jest + React Testing Library (unit/component level, faster but less coverage of real flows). Recommendation: start with Playwright for the iterative and error-UX flows since they involve multi-step navigation and sessionStorage state.

### Test Case: Iterative Resume Upload
Covers the full before/after comparison flow introduced in the Iterative Resume Upload feature.

- [x] **Happy path — improvement.** Complete a full analysis. Confirm the results screen shows three action buttons: Save as PDF, Upload Revised Resume, Analyze Another Resume. Click "Upload Revised Resume" and confirm: (a) the app lands directly on step 4 with no step indicator, (b) the prior job description is preserved in state. Upload a stronger resume and submit. Confirm the new results screen shows "Previously X%" with a green "+N pts" chip below the gauge. ✅ Manually verified 2026-05-21. UX feedback: button treatment clean and distinct; improvement delta readable without distracting from the overall dashboard.
- [ ] **Regression — lower score.** Same flow, but upload a weaker resume second. Confirm the chip is red with a negative delta.
- [ ] **Same-tab refresh survival.** After getting a first result, hard-refresh the page. Click "Upload Revised Resume", submit a new resume, and confirm the delta still renders (previousResult survived in sessionStorage).
- [x] **Full reset clears the comparison.** After seeing a delta, click "Analyze Another Resume". Complete a fresh full flow. Confirm the new results screen has no "Previously" line (sessionStorage cleared on reset). ✅ Manually verified 2026-05-21. No regressions observed.
- [ ] **First-time result has no delta.** Start fresh (or after a full reset) and confirm the score header shows no "Previously" line on the first analysis.
- [ ] **Discovery questions skipped.** Run the iterative flow without answering discovery questions. Confirm "Upload Revised Resume" works correctly and the delta renders as expected.

### Test Case: Error-UX Polish
_Skeleton — fill in acceptance details once the Error-UX Polish feature is built._

- [ ] **Validation error.** Submit with a missing or invalid input (e.g. no resume, job description too short). Confirm a human-readable inline message appears — no raw error string or generic "something went wrong."
- [ ] **Rate limit hit.** Trigger the per-IP hourly cap. Confirm the error message communicates the wait time clearly and does not show a raw 429 response.
- [ ] **Transient / Claude error.** Simulate a transient API failure (e.g. kill the network mid-request or force a 500 from the route). Confirm a "Try Again" affordance appears and retrying resumes the flow without a full restart.
- [ ] **Resume parse failure.** Upload a file that yields no extractable text (e.g. a scanned image-only PDF). Confirm a specific, actionable message is shown rather than a generic failure.
- [ ] **URL fetch failure.** Paste a job posting URL that returns a login wall or too little text. Confirm the "paste the description instead" guidance is shown clearly.
- [ ] **Recovery — no full restart required.** For every error path above, confirm the user can recover (retry or correct input) without losing their career stage, discovery answers, or job description.

---

## [ ] XP Polish
**Description:** Make the in-app user experience smoother, by revising features to make them flow better and more intuitive.
**Sub-tasks:**
- [x] Change the 5 discovery questions from required to optional so that the user can continue with job and resume uploads quickly
- [ ] Update the Your North Star and Career Coaching Insight sections on the dashboard page with hints to remind the user that if they go back and answer the questions you can provide actionable plan for them based on their experience and the job posting
