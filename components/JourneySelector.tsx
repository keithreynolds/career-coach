"use client";

import { GraduationCap, Briefcase, Award } from "lucide-react";
import type { CareerStage } from "@/lib/types";

type JourneySelectorProps = {
  value: CareerStage | null;
  onChange: (stage: CareerStage) => void;
  onNext: () => void;
};

const OPTIONS: {
  stage: CareerStage;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    stage: "New Grad",
    title: "New Grad / Internship",
    description: "Just starting out or seeking your first role.",
    icon: <GraduationCap size={32} aria-hidden="true" />,
  },
  {
    stage: "Mid-Career",
    title: "Mid-Career",
    description: "Building expertise and looking to level up.",
    icon: <Briefcase size={32} aria-hidden="true" />,
  },
  {
    stage: "Late-Career",
    title: "Late-Career",
    description: "Senior professional aiming at leadership roles.",
    icon: <Award size={32} aria-hidden="true" />,
  },
];

export default function JourneySelector({
  value,
  onChange,
  onNext,
}: JourneySelectorProps) {
  return (
    <section aria-labelledby="journey-heading">
      <h2
        id="journey-heading"
        className="text-2xl font-semibold text-gray-900 mb-2"
      >
        Where are you in your career?
      </h2>
      <p className="text-gray-600 mb-6">
        Choose the stage that best describes you. We&apos;ll tune the analysis
        to match.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {OPTIONS.map((opt) => {
          const selected = value === opt.stage;
          return (
            <button
              key={opt.stage}
              type="button"
              onClick={() => onChange(opt.stage)}
              className={[
                "text-left rounded-xl border-2 p-5 transition-all bg-white",
                "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
                selected
                  ? "border-brand-600 shadow-md ring-2 ring-brand-100"
                  : "border-gray-200 hover:border-brand-300 hover:shadow-sm",
              ].join(" ")}
              aria-pressed={selected}
            >
              <div
                className={[
                  "mb-3 inline-flex items-center justify-center rounded-lg p-2",
                  selected
                    ? "bg-brand-100 text-brand-700"
                    : "bg-gray-100 text-gray-600",
                ].join(" ")}
              >
                {opt.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {opt.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{opt.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!value}
          className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-white font-medium shadow-sm hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          Next
        </button>
      </div>
    </section>
  );
}
