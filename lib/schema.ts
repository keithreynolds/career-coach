/**
 * Structured-output tool schema + response normalizer.
 *
 * Instead of asking Claude to emit free-text JSON (brittle — truncation or
 * stray prose breaks parsing), we expose a tool. With a forced tool_choice,
 * Claude must return data shaped to this schema, and the SDK hands it back
 * already parsed. The normalizer is a final safety net: it coerces, clamps,
 * and fills defaults so a slightly-off response still renders.
 */

import type {
  AnalysisResult,
  AuditItem,
  AuditStatus,
  CareerStage,
} from "./types";

/** Fixed warning text — injected server-side so it is always exact. */
export const AI_VOICE_WARNING =
  "49% of hiring managers reject AI-sounding resumes. Rewrite all suggestions in your own voice before submitting.";

export const ANALYSIS_TOOL_NAME = "submit_career_analysis";

function auditItemSchema(statuses: string[]) {
  return {
    type: "object",
    properties: {
      status: { type: "string", enum: statuses },
      note: {
        type: "string",
        description: "A brief note (one or two sentences) explaining the status.",
      },
    },
    required: ["status", "note"],
  };
}

/**
 * Anthropic tool definition. Note that overall_score, score_label, and the
 * AI voice warning are intentionally NOT model-supplied — they are computed
 * deterministically server-side in normalizeAnalysis().
 */
export const ANALYSIS_TOOL = {
  name: ANALYSIS_TOOL_NAME,
  description:
    "Submit the structured career-coaching analysis for the candidate. Every field is required.",
  input_schema: {
    type: "object" as const,
    properties: {
      career_lens: {
        type: "object",
        properties: {
          north_star: {
            type: "string",
            description:
              "A 2-3 sentence professional 'North Star' summary for the candidate.",
          },
          success_indicators: {
            type: "array",
            items: { type: "string" },
            description:
              "Exactly 3 success indicators tailored to the career stage.",
          },
        },
        required: ["north_star", "success_indicators"],
      },
      structural_audit: {
        type: "object",
        properties: {
          summary_statement: auditItemSchema(["present", "missing", "weak"]),
          work_experience: auditItemSchema(["present", "missing", "weak"]),
          education: auditItemSchema(["present", "missing", "weak"]),
          action_verbs: auditItemSchema(["strong", "weak"]),
          quantified_achievements: auditItemSchema(["present", "missing"]),
          date_formatting: auditItemSchema(["pass", "fail"]),
          contact_info: auditItemSchema(["pass", "fail"]),
        },
        required: [
          "summary_statement",
          "work_experience",
          "education",
          "action_verbs",
          "quantified_achievements",
          "date_formatting",
          "contact_info",
        ],
      },
      impact_score: {
        type: "object",
        properties: {
          keyword_gaps: {
            type: "array",
            items: { type: "string" },
            description:
              "3-5 important keywords in the job description but missing from the resume.",
          },
          summary_score: {
            type: "integer",
            minimum: 0,
            maximum: 100,
          },
          experience_score: {
            type: "integer",
            minimum: 0,
            maximum: 100,
          },
          education_score: {
            type: "integer",
            minimum: 0,
            maximum: 100,
          },
          action_steps: {
            type: "array",
            items: { type: "string" },
            description:
              "3-5 specific, actionable steps to reach a 90%+ resume.",
          },
          coaching_tip: {
            type: "string",
            description:
              "One job-search coaching tip grounded in the candidate's stretch goal.",
          },
        },
        required: [
          "keyword_gaps",
          "summary_score",
          "experience_score",
          "education_score",
          "action_steps",
          "coaching_tip",
        ],
      },
    },
    required: ["career_lens", "structural_audit", "impact_score"],
  },
};

/** Career-stage weights used to compute the overall score. */
const STAGE_WEIGHTS: Record<
  CareerStage,
  { summary: number; experience: number; education: number }
> = {
  "New Grad": { summary: 0.2, experience: 0.5, education: 0.3 },
  "Mid-Career": { summary: 0.2, experience: 0.6, education: 0.2 },
  "Late-Career": { summary: 0.2, experience: 0.7, education: 0.1 },
};

/** Raised when a response is too degraded to display (triggers a retry). */
export class AnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisValidationError";
  }
}

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function scoreLabel(score: number): string {
  if (score >= 80) return "High interview probability";
  if (score >= 61) return "50/50 chance — improvements needed";
  return "High risk of rejection";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function normalizeAudit(
  value: unknown,
  allowed: AuditStatus[],
  fallbackStatus: AuditStatus
): AuditItem {
  const obj =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const status = obj.status as AuditStatus;
  return {
    status: allowed.includes(status) ? status : fallbackStatus,
    note: asString(obj.note, "No details were provided for this item."),
  };
}

/**
 * Coerce a raw tool input into a guaranteed-valid AnalysisResult.
 * Throws AnalysisValidationError only when the response lacks the core
 * narrative content, signalling the caller to retry.
 */
export function normalizeAnalysis(
  raw: unknown,
  careerStage: CareerStage
): AnalysisResult {
  if (!raw || typeof raw !== "object") {
    throw new AnalysisValidationError("Response was not an object.");
  }
  const root = raw as Record<string, any>;
  const lens = (root.career_lens ?? {}) as Record<string, unknown>;
  const audit = (root.structural_audit ?? {}) as Record<string, unknown>;
  const impact = (root.impact_score ?? {}) as Record<string, unknown>;

  // The North Star is the clearest signal of a genuine, complete response.
  const northStar = asString(lens.north_star);
  if (!northStar) {
    throw new AnalysisValidationError("Response is missing the North Star summary.");
  }

  const summaryScore = clampScore(impact.summary_score);
  const experienceScore = clampScore(impact.experience_score);
  const educationScore = clampScore(impact.education_score);

  // Recompute the overall score server-side so the weighting and the label
  // rules are always correct, independent of the model's arithmetic.
  const weights = STAGE_WEIGHTS[careerStage] ?? STAGE_WEIGHTS["Mid-Career"];
  const overallScore = clampScore(
    summaryScore * weights.summary +
      experienceScore * weights.experience +
      educationScore * weights.education
  );

  const successIndicators = asStringArray(lens.success_indicators).slice(0, 3);

  return {
    career_lens: {
      north_star: northStar,
      success_indicators:
        successIndicators.length > 0
          ? successIndicators
          : ["Analysis did not return success indicators."],
    },
    structural_audit: {
      summary_statement: normalizeAudit(
        audit.summary_statement,
        ["present", "missing", "weak"],
        "weak"
      ),
      work_experience: normalizeAudit(
        audit.work_experience,
        ["present", "missing", "weak"],
        "weak"
      ),
      education: normalizeAudit(
        audit.education,
        ["present", "missing", "weak"],
        "weak"
      ),
      action_verbs: normalizeAudit(
        audit.action_verbs,
        ["strong", "weak"],
        "weak"
      ),
      quantified_achievements: normalizeAudit(
        audit.quantified_achievements,
        ["present", "missing"],
        "missing"
      ),
      date_formatting: normalizeAudit(
        audit.date_formatting,
        ["pass", "fail"],
        "fail"
      ),
      contact_info: normalizeAudit(
        audit.contact_info,
        ["pass", "fail"],
        "fail"
      ),
    },
    impact_score: {
      keyword_gaps: asStringArray(impact.keyword_gaps).slice(0, 5),
      summary_score: summaryScore,
      experience_score: experienceScore,
      education_score: educationScore,
      overall_score: overallScore,
      score_label: scoreLabel(overallScore),
      action_steps: asStringArray(impact.action_steps).slice(0, 5),
      coaching_tip: asString(
        impact.coaching_tip,
        "Keep tailoring your resume and outreach to each specific role you pursue."
      ),
      ai_voice_warning: AI_VOICE_WARNING,
    },
  };
}
