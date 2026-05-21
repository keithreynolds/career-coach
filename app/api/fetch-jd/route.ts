import { NextRequest, NextResponse } from "next/server";
import { fetchAndExtractJD } from "@/lib/jobUrl";

// The Node runtime is required: lib/jobUrl.ts uses the `dns` module for its
// SSRF guard, which is unavailable on the Edge runtime.
export const runtime = "nodejs";
export const maxDuration = 30;

// --- In-memory per-IP rate limiting -----------------------------------------
// Mirrors the pattern in app/api/analyze/route.ts, but with its own bucket
// Map and a more lenient cap: fetching a page costs no Claude tokens, so it
// gets a separate, generous quota and never consumes the analysis limit.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20; // URL fetches per IP per hour

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

/** Identify the client by IP, using the headers Vercel populates. */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Record one fetch request against the client's hourly quota.
 * Returns whether it is allowed and, when not, the seconds until reset.
 */
function consumeRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();

  // Drop expired buckets so memory stays bounded.
  rateBuckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  });

  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export async function POST(req: NextRequest) {
  try {
    // Parse the JSON body.
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const url =
      body && typeof body === "object"
        ? (body as Record<string, unknown>).url
        : undefined;
    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        { error: "A 'url' string is required." },
        { status: 400 }
      );
    }

    // Enforce the per-IP hourly quota.
    const rate = consumeRateLimit(getClientIp(req));
    if (!rate.allowed) {
      const minutes = Math.max(1, Math.ceil(rate.retryAfterSec / 60));
      return NextResponse.json(
        {
          error:
            `You've loaded too many links in the last hour. ` +
            `Please try again in about ${minutes} minute${
              minutes === 1 ? "" : "s"
            }, or paste the job description text instead.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        }
      );
    }

    const result = await fetchAndExtractJD(url.trim());

    if (result.ok) {
      console.log(
        `[fetch-jd] success source=${result.source} chars=${result.text.length}`
      );
      return NextResponse.json(
        { text: result.text, source: result.source },
        { status: 200 }
      );
    }

    // Extraction failed gracefully. Returned as HTTP 200 with an { error }
    // body so the client can distinguish "reached the route, couldn't
    // extract" (show paste-instead guidance) from a genuine 4xx/5xx.
    console.log(`[fetch-jd] extraction failed`);
    return NextResponse.json({ error: result.message }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    console.error("fetch-jd route error:", err);
    return NextResponse.json(
      {
        error:
          "Something went wrong reading that link. " +
          "Please paste the job description text instead.",
      },
      { status: 500 }
    );
  }
}
