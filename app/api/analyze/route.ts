import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseResume } from "@/lib/parser";
import { scrubPII } from "@/lib/pii";
import { buildPrompt } from "@/lib/prompt";
import {
  ANALYSIS_TOOL,
  ANALYSIS_TOOL_NAME,
  AnalysisValidationError,
  normalizeAnalysis,
} from "@/lib/schema";
import type { AnalysisResult, CareerStage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MIN_JOB_DESCRIPTION_LENGTH = 100;
const MAX_OUTPUT_TOKENS = 4096; // headroom so structured output is never truncated
const MAX_ATTEMPTS = 2; // one automatic retry on a transient/degraded response

// Model ID is configurable via the ANTHROPIC_MODEL env var so it can be
// swapped without code changes. Falls back to the current Claude Sonnet 4.6.
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MODEL = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

/**
 * Run a single analysis call against Claude using forced tool use.
 * The model is constrained to the ANALYSIS_TOOL schema, so the SDK returns
 * an already-parsed object — no brittle free-text JSON parsing required.
 */
async function runAnalysis(
  anthropic: Anthropic,
  prompt: string,
  careerStage: CareerStage
): Promise<AnalysisResult> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0.2,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: ANALYSIS_TOOL_NAME },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new AnalysisValidationError(
      "Model did not return a structured tool response."
    );
  }

  // normalizeAnalysis coerces, clamps, and fills defaults; it throws an
  // AnalysisValidationError only when the response is too degraded to show.
  return normalizeAnalysis(toolUse.input, careerStage);
}

/** Decide whether a failed attempt is worth retrying. */
function isRetryable(err: unknown): boolean {
  // Degraded/empty model responses are worth one more try.
  if (err instanceof AnalysisValidationError) return true;
  // Transient API errors: rate limits, overload, and 5xx.
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? 0;
    return status === 429 || status >= 500;
  }
  return false;
}

/** Map a final failure to a user-facing message and HTTP status. */
function describeFailure(err: unknown): { message: string; status: number } {
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? 0;
    if (status === 401) {
      return {
        message: "The server's API key was rejected. Please contact the site owner.",
        status: 502,
      };
    }
    if (status === 429) {
      return {
        message: "The service is busy right now. Please wait a moment and try again.",
        status: 503,
      };
    }
    if (status >= 500) {
      return {
        message: "The AI service is temporarily overloaded. Please try again shortly.",
        status: 503,
      };
    }
  }
  return {
    message: "We couldn't complete the analysis. Please try again.",
    status: 502,
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is missing ANTHROPIC_API_KEY." },
        { status: 500 }
      );
    }

    const formData = await req.formData();

    const career_stage = String(formData.get("career_stage") ?? "").trim();
    const strengths = String(formData.get("strengths") ?? "").trim();
    const dislikes = String(formData.get("dislikes") ?? "").trim();
    const differentiator = String(formData.get("differentiator") ?? "").trim();
    const dream_job = String(formData.get("dream_job") ?? "").trim();
    const stretch_goal = String(formData.get("stretch_goal") ?? "").trim();
    const job_description = String(
      formData.get("job_description") ?? ""
    ).trim();
    const resume = formData.get("resume");

    // Validate text fields
    const missing: string[] = [];
    if (!career_stage) missing.push("career_stage");
    if (!strengths) missing.push("strengths");
    if (!dislikes) missing.push("dislikes");
    if (!differentiator) missing.push("differentiator");
    if (!dream_job) missing.push("dream_job");
    if (!stretch_goal) missing.push("stretch_goal");
    if (!job_description) missing.push("job_description");
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    if (job_description.length < MIN_JOB_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        {
          error: `Job description must be at least ${MIN_JOB_DESCRIPTION_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    // Validate resume file
    if (!(resume instanceof File)) {
      return NextResponse.json(
        { error: "Resume file is required." },
        { status: 400 }
      );
    }
    if (resume.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Resume file exceeds the 10 MB limit." },
        { status: 400 }
      );
    }
    const filename = resume.name || "resume";
    const lowerName = filename.toLowerCase();
    if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Only .pdf and .docx files are accepted." },
        { status: 400 }
      );
    }

    // Read into Node Buffer
    const arrayBuffer = await resume.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse resume text
    let resumeText = "";
    try {
      const parsed = await parseResume(buffer, filename);
      resumeText = parsed.text;
    } catch (err) {
      console.error("Resume parse failed:", err);
      return NextResponse.json(
        { error: "Failed to read the resume file. Please re-export it and try again." },
        { status: 400 }
      );
    }

    if (!resumeText.trim()) {
      return NextResponse.json(
        {
          error:
            "We couldn't extract any text from your resume. If it's a scanned PDF, please upload a text-based version.",
        },
        { status: 400 }
      );
    }

    // PII scrub
    const scrubbedResume = scrubPII(resumeText);

    // Build prompt
    const prompt = buildPrompt({
      career_stage,
      strengths,
      dislikes,
      differentiator,
      dream_job,
      stretch_goal,
      job_description,
      resume_text: scrubbedResume,
    });

    // Call Claude with forced structured output, retrying once on a
    // transient API error or a degraded response.
    const anthropic = new Anthropic({ apiKey, maxRetries: 2 });

    let result: AnalysisResult | null = null;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        result = await runAnalysis(
          anthropic,
          prompt,
          career_stage as CareerStage
        );
        break;
      } catch (err) {
        lastError = err;
        console.error(`Analysis attempt ${attempt} failed:`, err);
        if (attempt < MAX_ATTEMPTS && isRetryable(err)) {
          // Brief backoff before the retry.
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        break;
      }
    }

    if (!result) {
      const { message, status } = describeFailure(lastError);
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    console.error("Analyze route error:", err);
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
