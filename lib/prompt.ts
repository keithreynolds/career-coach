/**
 * Super Prompt builder for the AI Career Coach.
 * Interpolates discovery answers + job description + resume text into the
 * structured analysis prompt.
 */

export type PromptInputs = {
  career_stage: string;
  strengths: string;
  dislikes: string;
  differentiator: string;
  dream_job: string;
  stretch_goal: string;
  job_description: string;
  resume_text: string;
};

export function buildPrompt(inputs: PromptInputs): string {
  const {
    career_stage,
    strengths,
    dislikes,
    differentiator,
    dream_job,
    stretch_goal,
    job_description,
    resume_text,
  } = inputs;

  return `You are an expert career coach and ATS specialist. Analyze the following inputs and return a structured JSON response only.

## INPUTS
- Career Stage: ${career_stage}
- Strengths: ${strengths}
- Dislikes: ${dislikes}
- Differentiator: ${differentiator}
- Dream Job: ${dream_job}
- Stretch Goal (5-7 yrs): ${stretch_goal}
- Target Job Description: ${job_description}
- Resume Text (PII removed): ${resume_text}

## TASK A — Career Lens
Synthesize the discovery answers into:
1. A 2-3 sentence professional "North Star" summary for this candidate
2. Three specific success indicators tailored to their career stage

## TASK B — Structural Audit
Check the resume for the presence and quality of:
1. Summary Statement (present / missing / weak)
2. Work Experience (present / missing / weak)
3. Education (present / missing / weak)
4. Action verbs usage (strong / weak)
5. Quantified achievements (present / missing)
6. Consistent date formatting (pass / fail)
7. Contact information completeness (pass / fail)
Assign each a status and a brief note.

## TASK C — Impact Score
1. Keyword Gap Analysis: List 3-5 important keywords found in the job description but missing from the resume.
2. Score each component from 0 to 100 based on quality and fit for the target job:
   - Summary Score
   - Experience Score
   - Education Score
3. Provide 3-5 specific, actionable steps the candidate can take to reach a 90%+ resume.
4. Generate one job-search coaching tip grounded in the candidate's stretch goal.

Note: the overall weighted score, its label, and the AI-voice warning are
computed automatically by the application — you do not need to provide them.

## OUTPUT
Return your complete analysis by calling the \`submit_career_analysis\` tool.
Populate every field the tool requires. Scores must be integers from 0 to 100.
Do not write any prose outside of the tool call.`;
}
