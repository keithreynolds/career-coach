/**
 * Shared TypeScript types for the AI Career Coach app.
 */

export type CareerStage = "New Grad" | "Mid-Career" | "Late-Career";

export type DiscoveryAnswers = {
  strengths: string;
  dislikes: string;
  differentiator: string;
  dream_job: string;
  stretch_goal: string;
};

export type AuditStatus =
  | "present"
  | "missing"
  | "weak"
  | "strong"
  | "pass"
  | "fail";

export type AuditItem = {
  status: AuditStatus;
  note: string;
};

export type AnalysisResult = {
  career_lens: {
    north_star: string;
    success_indicators: string[];
  };
  structural_audit: {
    summary_statement: AuditItem;
    work_experience: AuditItem;
    education: AuditItem;
    action_verbs: AuditItem;
    quantified_achievements: AuditItem;
    date_formatting: AuditItem;
    contact_info: AuditItem;
  };
  impact_score: {
    keyword_gaps: string[];
    summary_score: number;
    experience_score: number;
    education_score: number;
    overall_score: number;
    score_label: string;
    action_steps: string[];
    coaching_tip: string;
    ai_voice_warning: string;
  };
};
