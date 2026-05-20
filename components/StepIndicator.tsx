"use client";

import { Check } from "lucide-react";

type StepIndicatorProps = {
  currentStep: number; // 1..4
  totalSteps?: number;
  labels?: string[];
};

const DEFAULT_LABELS = [
  "Journey",
  "Discovery",
  "Job Description",
  "Resume",
];

export default function StepIndicator({
  currentStep,
  totalSteps = 4,
  labels = DEFAULT_LABELS,
}: StepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="w-full">
      <ol className="flex items-center w-full">
        {steps.map((step, idx) => {
          const isCompleted = step < currentStep;
          const isActive = step === currentStep;
          const isLast = idx === steps.length - 1;

          return (
            <li
              key={step}
              className={`flex items-center ${isLast ? "" : "flex-1"}`}
            >
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "flex items-center justify-center rounded-full w-9 h-9 text-sm font-semibold transition-colors",
                    isCompleted
                      ? "bg-brand-600 text-white"
                      : isActive
                      ? "bg-brand-600 text-white ring-4 ring-brand-100"
                      : "bg-gray-200 text-gray-600",
                  ].join(" ")}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check size={18} aria-hidden="true" />
                  ) : (
                    step
                  )}
                </div>
                <span
                  className={[
                    "mt-2 text-xs font-medium hidden sm:block",
                    isActive
                      ? "text-brand-700"
                      : isCompleted
                      ? "text-gray-700"
                      : "text-gray-500",
                  ].join(" ")}
                >
                  {labels[idx]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={[
                    "flex-1 h-0.5 mx-2 sm:mx-3",
                    step < currentStep ? "bg-brand-600" : "bg-gray-200",
                  ].join(" ")}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
