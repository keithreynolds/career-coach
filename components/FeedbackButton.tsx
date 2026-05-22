"use client";

import { useState } from "react";
import {
  MessageSquare,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xwvzodbb";

type Props = {
  /** Human-readable label for the current step, shown to the user and
   *  submitted as a hidden field so you can see context in Formspree. */
  contextLabel: string;
};

type Status = "idle" | "submitting" | "success" | "error";

export default function FeedbackButton({ contextLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message,
          email: email.trim() || "(not provided)",
          context: contextLabel,
        }),
      });
      if (res.ok) {
        trackEvent("feedback_submitted", { context: contextLabel });
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    setOpen(false);
    setMessage("");
    setEmail("");
    setStatus("idle");
  }

  return (
    <>
      {/* Floating trigger button — hidden in print/PDF */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 print:hidden"
        aria-label="Share feedback"
      >
        <MessageSquare size={16} aria-hidden="true" />
        Feedback
      </button>

      {/* Modal — hidden in print/PDF */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Card */}
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2
                id="feedback-title"
                className="text-lg font-semibold text-gray-900"
              >
                Share Feedback
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Close feedback form"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {status === "success" ? (
              /* Success state */
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle2
                  size={40}
                  className="text-green-500"
                  aria-hidden="true"
                />
                <p className="font-medium text-gray-900">
                  Thanks for your feedback!
                </p>
                <p className="text-sm text-gray-500">We'll take a look.</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Step context — shown to user, submitted as a field */}
                <p className="text-sm text-gray-500">
                  You&apos;re at:{" "}
                  <span className="font-medium text-gray-700">
                    {contextLabel}
                  </span>
                </p>

                {/* Message field */}
                <div>
                  <label
                    htmlFor="feedback-message"
                    className="block text-sm font-medium text-gray-800 mb-1.5"
                  >
                    Message{" "}
                    <span className="text-red-500" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <textarea
                    id="feedback-message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe a bug you ran into, or share a feature you'd like to see…"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  />
                </div>

                {/* Email field */}
                <div>
                  <label
                    htmlFor="feedback-email"
                    className="block text-sm font-medium text-gray-800 mb-1.5"
                  >
                    Email address{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Only needed if you&apos;d like a reply — we won&apos;t use
                    it for anything else.
                  </p>
                </div>

                {/* Error state */}
                {status === "error" && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                  >
                    <AlertCircle size={16} aria-hidden="true" />
                    Something went wrong sending your feedback. Please try again.
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                  >
                    {status === "submitting" ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Send size={15} aria-hidden="true" />
                    )}
                    {status === "submitting" ? "Sending…" : "Send Feedback"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
