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
1. Keyword Gap Analysis: List 3-5 keywords in the job description but missing from the resume
2. Score each component (0-100):
   - Summary Score
   - Experience Score
   - Education Score
3. Calculate Overall Score using career-stage weights:
   - New Grad: Summary 20%, Experience 50%, Education 30%
   - Mid-Career: Summary 20%, Experience 60%, Education 20%
   - Late-Career: Summary 20%, Experience 70%, Education 10%
4. Score label rules:
   - 80 or above: "High interview probability"
   - 61 to 79: "50/50 chance — improvements needed"
   - 60 or below: "High risk of rejection"
5. Provide 3-5 specific actionable steps to reach 90%+
6. Generate one job search coaching tip based on the stretch goal

## OUTPUT
Respond ONLY in valid JSON. No markdown. No explanation. No backticks.
{
  "career_lens": {
    "north_star": "string",
    "success_indicators": ["string", "string", "string"]
  },
  "structural_audit": {
    "summary_statement": { "status": "present|missing|weak", "note": "string" },
    "work_experience": { "status": "present|missing|weak", "note": "string" },
    "education": { "status": "present|missing|weak", "note": "string" },
    "action_verbs": { "status": "strong|weak", "note": "string" },
    "quantified_achievements": { "status": "present|missing", "note": "string" },
    "date_formatting": { "status": "pass|fail", "note": "string" },
    "contact_info": { "status": "pass|fail", "note": "string" }
  },
  "impact_score": {
    "keyword_gaps": ["string", "string", "string"],
    "summary_score": number,
    "experience_score": number,
    "education_score": number,
    "overall_score": number,
    "score_label": "string",
    "action_steps": ["string", "string", "string"],
    "coaching_tip": "string",
    "ai_voice_warning": "49% of hiring managers reject AI-sounding resumes. Rewrite all suggestions in your own voice before submitting."
  }
}`;
}
