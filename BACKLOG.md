# Project Backlog: AI Career Coach

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
**Description:** Provide an affordance for users to re-upload their resume without re-entering their career goals or the target job description.
**Sub-tasks:**
- [ ] Add a "Re-upload & Re-evaluate" button to the Results Dashboard.
- [ ] Preserve the session state for the "Career Lens" (goals) and "Context Input" (job description).
- [ ] Reset the **Scoring Engine** state to process the new file while maintaining the previous evaluation criteria.
**Acceptance Criteria:**
- The user can upload a new version of their resume from the dashboard.
- The system generates a new score and feedback instantly based on the original goals and job requirements.

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

---

## [ ] Feature: URL Support for Job Descriptions
**Description:** Enable the existing "Context Input" text area to accept a job posting URL instead of requiring manual text pasting.
**Sub-tasks:**
- [ ] Implement Regex logic to identify URL inputs.
- [ ] Add server-side scraper to fetch and sanitize job requirements from the URL.
**Acceptance Criteria:**
- The system successfully extracts job context from LinkedIn or Indeed URLs.

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
**Description:** Make the in-app error states friendlier, with clearer messaging and retry affordances for the failure cases the API already returns.
**Sub-tasks:**
- [ ] Map each API error response (validation, rate limit, parse failure, Claude/transient errors) to a friendly user-facing message.
- [ ] Add a "Try Again" affordance where retrying is sensible (e.g. transient errors, rate-limit cooldown).
- [ ] Ensure rate-limit responses communicate the wait time clearly to the user.
**Acceptance Criteria:**
- Every error path shows a human-readable message rather than a raw error or generic failure.
- Users can recover from transient failures without restarting the whole flow.
