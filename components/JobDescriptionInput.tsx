"use client";

import { useState } from "react";
import { Loader2, Link as LinkIcon, AlertCircle, CheckCircle2 } from "lucide-react";

type JobDescriptionInputProps = {
  value: string;
  onChange: (val: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const MIN_LENGTH = 100;

/** True if the trimmed input is a single http/https URL (and nothing else). */
function looksLikeSingleUrl(value: string): boolean {
  const trimmed = value.trim();
  return /^https?:\/\/\S+$/i.test(trimmed) && trimmed.includes(".");
}

type Notice = { kind: "error" | "success"; text: string };

export default function JobDescriptionInput({
  value,
  onChange,
  onBack,
  onNext,
}: JobDescriptionInputProps) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const length = value.length;
  const isUrl = looksLikeSingleUrl(value);
  // A bare URL is not a usable job description — keep "Next" disabled until the
  // textbox holds real description text (either pasted, or loaded from a link).
  const valid = value.trim().length >= MIN_LENGTH && !isUrl;

  async function handleLoadUrl() {
    const url = value.trim();
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/fetch-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: { text?: string; error?: string } | null = await res
        .json()
        .catch(() => null);

      // Hard failures (rate limit, server error) come back as 4xx/5xx.
      if (!res.ok) {
        setNotice({
          kind: "error",
          text:
            data?.error ||
            `We couldn't load that link (status ${res.status}). Please paste the description instead.`,
        });
        return;
      }
      // A 200 with an { error } body means the route was reached but
      // extraction didn't work — a soft failure.
      if (data?.error) {
        setNotice({ kind: "error", text: data.error });
        return;
      }
      if (typeof data?.text === "string" && data.text.trim().length > 0) {
        onChange(data.text);
        setNotice({
          kind: "success",
          text: "Job description loaded from the link. Review and trim it below, then continue.",
        });
        return;
      }
      setNotice({
        kind: "error",
        text: "We couldn't read a job description from that link. Please paste the description instead.",
      });
    } catch {
      setNotice({
        kind: "error",
        text: "We couldn't reach that link. Check your connection, or paste the job description instead.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="jd-heading">
      <h2 id="jd-heading" className="text-2xl font-semibold text-gray-900 mb-2">
        Target Job Description
      </h2>
      <p className="text-gray-600 mb-6">
        Paste the full job description — title, requirements, and
        responsibilities — or paste a link to the posting and we&apos;ll pull it
        in for you. The more complete it is, the sharper your match score.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !loading) onNext();
        }}
      >
        <label
          htmlFor="job_description"
          className="block text-sm font-medium text-gray-800 mb-1.5"
        >
          Paste the target job description — or a link to the posting
        </label>
        <textarea
          id="job_description"
          name="job_description"
          rows={8}
          required
          value={value}
          disabled={loading}
          onChange={(e) => {
            onChange(e.target.value);
            if (notice) setNotice(null);
          }}
          placeholder="Paste the job posting here — or paste a link to it (e.g. a Greenhouse or Lever posting URL)..."
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
        />

        {/* Load-from-link action — shown only when the input looks like a URL */}
        {isUrl && (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleLoadUrl}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white font-medium shadow-sm hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <LinkIcon size={16} aria-hidden="true" />
              )}
              {loading ? "Loading job posting…" : "Load job posting from link"}
            </button>
            <p className="mt-1.5 text-xs text-gray-500">
              Works best for company career pages. Some sites (e.g. LinkedIn,
              Indeed) block automated reading — if that happens, paste the text
              instead.
            </p>
          </div>
        )}

        {/* Result notice from a load attempt */}
        {notice && (
          <div
            role={notice.kind === "error" ? "alert" : "status"}
            className={`mt-3 flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
              notice.kind === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-green-200 bg-green-50 text-green-800"
            }`}
          >
            {notice.kind === "error" ? (
              <AlertCircle
                size={18}
                className="mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2
                size={18}
                className="mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-sm">
          <span className={valid ? "text-green-700" : "text-gray-500"}>
            {valid
              ? "Looks good."
              : isUrl
                ? "That looks like a link — load it above, or paste the description text."
                : `Minimum ${MIN_LENGTH} characters (${length}/${MIN_LENGTH}).`}
          </span>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-6">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!valid || loading}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-white font-medium shadow-sm hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Next
          </button>
        </div>
      </form>
    </section>
  );
}
