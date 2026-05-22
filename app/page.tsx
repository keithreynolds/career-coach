"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import JourneySelector from "@/components/JourneySelector";
import DiscoveryForm from "@/components/DiscoveryForm";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import ResumeUpload from "@/components/ResumeUpload";
import ResultsDashboard from "@/components/ResultsDashboard";
import type {
  AnalysisResult,
  CareerStage,
  DiscoveryAnswers,
} from "@/lib/types";

const EMPTY_DISCOVERY: DiscoveryAnswers = {
  strengths: "",
  dislikes: "",
  differentiator: "",
  dream_job: "",
  stretch_goal: "",
};

export default function Page() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [careerStage, setCareerStage] = useState<CareerStage | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryAnswers>(EMPTY_DISCOVERY);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [previousResult, setPreviousResult] = useState<AnalysisResult | null>(null);

  const SESSION_KEY = "career_coach_previous_result";

  // Hydrate previousResult from sessionStorage on mount (survives same-tab refresh)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) setPreviousResult(JSON.parse(stored) as AnalysisResult);
    } catch {
      // Ignore malformed data
    }
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setPreviousResult(null);
    setStep(1);
    setCareerStage(null);
    setDiscovery(EMPTY_DISCOVERY);
    setJobDescription("");
    setResumeFile(null);
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  // Keep goals + job description; clear only resume + result and jump to upload step
  const revise = useCallback(() => {
    if (result) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
      } catch {
        // sessionStorage unavailable; comparison will be skipped
      }
      setPreviousResult(result);
    }
    setResumeFile(null);
    setResult(null);
    setError(null);
    setStep(4);
  }, [result]);

  const submit = useCallback(async () => {
    if (!resumeFile || !careerStage) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("career_stage", careerStage);
      formData.append("strengths", discovery.strengths);
      formData.append("dislikes", discovery.dislikes);
      formData.append("differentiator", discovery.differentiator);
      formData.append("dream_job", discovery.dream_job);
      formData.append("stretch_goal", discovery.stretch_goal);
      formData.append("job_description", jobDescription);
      formData.append("resume", resumeFile);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data?.error || `Request failed with status ${res.status}`;
        // 5xx errors are transient and worth retrying; 4xx are user-fixable.
        const retryable = res.status >= 500;
        setError({ message, retryable });
        return;
      }
      setResult(data as AnalysisResult);
    } catch (err: unknown) {
      // Network-level failure (offline, timeout) — always retryable.
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError({ message, retryable: true });
    } finally {
      setLoading(false);
    }
  }, [careerStage, discovery, jobDescription, resumeFile]);

  return (
    <main className="min-h-screen">
      <header className="bg-white border-b border-gray-200 print:hidden">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-5 flex items-center gap-2">
          <Sparkles
            size={22}
            className="text-brand-600"
            aria-hidden="true"
          />
          <h1 className="text-lg font-semibold text-gray-900">
            RateMyResume
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 print:py-0 print:px-0">
        {!result && (
          <div className="mb-8">
            <StepIndicator currentStep={step} />
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5 sm:p-8 print:border-0 print:shadow-none print:p-0">
          {!result ? (
            <>
              {step === 1 && (
                <JourneySelector
                  value={careerStage}
                  onChange={setCareerStage}
                  onNext={() => setStep(2)}
                />
              )}
              {step === 2 && (
                <DiscoveryForm
                  values={discovery}
                  onChange={setDiscovery}
                  onBack={() => setStep(1)}
                  onNext={() => setStep(3)}
                />
              )}
              {step === 3 && (
                <JobDescriptionInput
                  value={jobDescription}
                  onChange={setJobDescription}
                  onBack={() => setStep(2)}
                  onNext={() => setStep(4)}
                />
              )}
              {step === 4 && (
                <ResumeUpload
                  file={resumeFile}
                  onChange={setResumeFile}
                  onBack={() => setStep(3)}
                  onSubmit={submit}
                  loading={loading}
                />
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                  <AlertCircle
                    size={18}
                    className="mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div className="flex-1">
                    <p className="font-medium">
                      {error.retryable
                        ? "Something went wrong on our end."
                        : "Unable to complete analysis."}
                    </p>
                    <p className="mt-0.5">{error.message}</p>
                    {error.retryable && (
                      <button
                        type="button"
                        onClick={() => { setError(null); submit(); }}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                      >
                        <RefreshCw size={13} aria-hidden="true" />
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <ResultsDashboard
              result={result}
              previousResult={previousResult}
              onReset={reset}
              onRevise={revise}
            />
          )}
        </div>

        <footer className="mt-8 text-center text-xs text-gray-500 print:hidden">
          Built with Next.js + Claude. Your resume is scrubbed of personal
          details before analysis.
        </footer>
      </div>
    </main>
  );
}
