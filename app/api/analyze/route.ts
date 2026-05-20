import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseResume } from "@/lib/parser";
import { scrubPII } from "@/lib/pii";
import { buildPrompt } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MIN_JOB_DESCRIPTION_LENGTH = 100;

// Model ID is configurable via the ANTHROPIC_MODEL env var so it can be
// swapped without code changes. Falls back to the current Claude Sonnet 4.6.
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MODEL = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

/**
 * Extract JSON content from a model response that may include
 * surrounding whitespace or accidental code fences.
 */
function extractJSON(raw: string): unknown {
  if (!raw) throw new Error("Empty response from model");
  let trimmed = raw.trim();

  // Strip code fences if the model produced them despite instructions.
  if (trimmed.startsWith("```")) {
    trimmed = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/g, "");
    trimmed = trimmed.trim();
  }

  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall back to extracting the first balanced JSON object
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const slice = trimmed.slice(start, end + 1);
      return JSON.parse(slice);
    }
    throw new Error("Model did not return valid JSON.");
  }
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

    // Call Claude
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    // Aggregate text blocks
    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    let parsed: unknown;
    try {
      parsed = extractJSON(rawText);
    } catch (err) {
      console.error("JSON parse failed. Raw:", rawText);
      return NextResponse.json(
        { error: "The AI returned an unexpected response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed, { status: 200 });
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
