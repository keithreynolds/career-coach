"use client";

import {
  Check,
  AlertTriangle,
  X as XIcon,
  Lightbulb,
  RotateCcw,
  FileDown,
  Upload,
} from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import ScoreBar from "./ScoreBar";
import type { AnalysisResult, AuditItem } from "@/lib/types";

type ResultsDashboardProps = {
  result: AnalysisResult;
  previousResult?: AnalysisResult | null;
  onReset: () => void;
  onRevise: () => void;
};

const AUDIT_LABELS: Record<
  keyof AnalysisResult["structural_audit"],
  string
> = {
  summary_statement: "Summary Statement",
  work_experience: "Work Experience",
  education: "Education",
  action_verbs: "Action Verbs",
  quantified_achievements: "Quantified Achievements",
  date_formatting: "Date Formatting",
  contact_info: "Contact Info",
};

function statusVisual(status: AuditItem["status"]) {
  // Green: present, strong, pass
  if (status === "present" || status === "strong" || status === "pass") {
    return {
      icon: <Check size={18} aria-hidden="true" />,
      ring: "bg-green-100 text-green-700",
      label: "Pass",
    };
  }
  // Yellow: weak
  if (status === "weak") {
    return {
      icon: <AlertTriangle size={18} aria-hidden="true" />,
      ring: "bg-yellow-100 text-yellow-700",
      label: "Weak",
    };
  }
  // Red: missing, fail
  return {
    icon: <XIcon size={18} aria-hidden="true" />,
    ring: "bg-red-100 text-red-700",
    label: "Missing",
  };
}

export default function ResultsDashboard({
  result,
  previousResult,
  onReset,
  onRevise,
}: ResultsDashboardProps) {
  const { career_lens, structural_audit, impact_score } = result;

  const generatedDate = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-10">
      {/* Print-only report header (visible only in the saved PDF) */}
      <div className="hidden print:block border-b border-gray-300 pb-3">
        <p className="text-sm font-semibold text-gray-900">
          RateMyResume — Resume Analysis Report
        </p>
        <p className="text-xs text-gray-500">Generated {generatedDate}</p>
      </div>

      {/* 1. Score Header */}
      <section aria-labelledby="results-heading" className="text-center">
        <h2
          id="results-heading"
          className="text-3xl font-bold text-gray-900 mb-6"
        >
          Your Career Coach Results
        </h2>
        <div className="flex flex-col items-center">
          <ScoreGauge
            score={impact_score.overall_score}
            label={impact_score.score_label}
            size={220}
          />
          {previousResult && (() => {
            const prev = Math.round(previousResult.impact_score.overall_score);
            const curr = Math.round(impact_score.overall_score);
            const delta = curr - prev;
            const deltaLabel = delta > 0 ? `+${delta} pts` : delta < 0 ? `${delta} pts` : "No change";
            const chipClass =
              delta > 0
                ? "bg-green-100 text-green-700"
                : delta < 0
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600";
            return (
              <p className="mt-2 text-sm text-gray-500">
                Previously {prev}%{" "}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${chipClass}`}
                >
                  {deltaLabel}
                </span>
              </p>
            );
          })()}
        </div>
      </section>

      {/* 2. Career Lens */}
      <section aria-labelledby="north-star-heading">
        <h3
          id="north-star-heading"
          className="text-xl font-semibold text-gray-900 mb-3"
        >
          Your North Star
        </h3>
        <p className="rounded-xl bg-brand-50 border border-brand-100 p-4 text-gray-800 leading-relaxed">
          {career_lens.north_star}
        </p>
        <ul className="mt-5 space-y-2.5">
          {career_lens.success_indicators.map((indicator, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                <Check size={14} aria-hidden="true" />
              </span>
              <span className="text-gray-800">{indicator}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Component Scores */}
      <section aria-labelledby="component-scores-heading">
        <h3
          id="component-scores-heading"
          className="text-xl font-semibold text-gray-900 mb-4"
        >
          Resume Section Scores
        </h3>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <ScoreBar label="Summary" score={impact_score.summary_score} />
          <ScoreBar label="Experience" score={impact_score.experience_score} />
          <ScoreBar label="Education" score={impact_score.education_score} />
        </div>
      </section>

      {/* 4. Structural Audit */}
      <section aria-labelledby="audit-heading">
        <h3
          id="audit-heading"
          className="text-xl font-semibold text-gray-900 mb-4"
        >
          Structural Audit
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(
            Object.keys(structural_audit) as Array<
              keyof typeof structural_audit
            >
          ).map((key) => {
            const item = structural_audit[key];
            const vis = statusVisual(item.status);
            return (
              <div
                key={key}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${vis.ring}`}
                    aria-label={vis.label}
                  >
                    {vis.icon}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {AUDIT_LABELS[key]}
                    </p>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-gray-500">
                      {item.status}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                  {item.note}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Keyword Gaps */}
      <section aria-labelledby="keywords-heading">
        <h3
          id="keywords-heading"
          className="text-xl font-semibold text-gray-900 mb-3"
        >
          Missing Keywords
        </h3>
        {impact_score.keyword_gaps.length === 0 ? (
          <p className="text-gray-700">
            No major keyword gaps detected. Nice work.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {impact_score.keyword_gaps.map((kw, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-3 py-1 text-sm font-medium text-red-700"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 6. Action Steps */}
      <section aria-labelledby="action-steps-heading">
        <h3
          id="action-steps-heading"
          className="text-xl font-semibold text-gray-900 mb-3"
        >
          Steps to Reach 90%+
        </h3>
        <ol className="space-y-3 list-decimal list-inside marker:font-semibold marker:text-brand-700">
          {impact_score.action_steps.map((step, i) => (
            <li key={i} className="text-gray-800 leading-relaxed">
              {step}
            </li>
          ))}
        </ol>
      </section>

      {/* 7. Coaching Tip */}
      <section aria-labelledby="coaching-heading">
        <h3
          id="coaching-heading"
          className="text-xl font-semibold text-gray-900 mb-3"
        >
          Career Coaching Insight
        </h3>
        <div className="flex gap-3 rounded-xl bg-brand-50 border border-brand-200 p-4">
          <Lightbulb
            size={22}
            className="mt-0.5 flex-shrink-0 text-brand-700"
            aria-hidden="true"
          />
          <p className="text-gray-800 leading-relaxed">
            {impact_score.coaching_tip}
          </p>
        </div>
      </section>

      {/* 8. AI Voice Warning */}
      <section
        role="note"
        aria-label="AI voice warning"
        className="flex gap-3 rounded-xl bg-yellow-50 border border-yellow-300 p-4"
      >
        <AlertTriangle
          size={22}
          className="mt-0.5 flex-shrink-0 text-yellow-700"
          aria-hidden="true"
        />
        <p className="text-yellow-900 leading-relaxed">
          {impact_score.ai_voice_warning}
        </p>
      </section>

      {/* 9. Actions (hidden in the printed PDF) */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-white font-medium hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <FileDown size={18} aria-hidden="true" />
          Save as PDF
        </button>
        <button
          type="button"
          onClick={onRevise}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-5 py-2.5 text-brand-700 font-medium hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <Upload size={18} aria-hidden="true" />
          Upload Revised Resume
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <RotateCcw size={18} aria-hidden="true" />
          Analyze Another Resume
        </button>
      </div>
    </div>
  );
}
