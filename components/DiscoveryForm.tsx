"use client";

import { useMemo } from "react";
import type { DiscoveryAnswers } from "@/lib/types";

type DiscoveryFormProps = {
  values: DiscoveryAnswers;
  onChange: (next: DiscoveryAnswers) => void;
  onBack: () => void;
  onNext: () => void;
};

type QuestionField = {
  key: keyof DiscoveryAnswers;
  label: string;
  placeholder: string;
};

const QUESTIONS: QuestionField[] = [
  {
    key: "strengths",
    label: "What are you really good at or love to do?",
    placeholder:
      "E.g. I love untangling messy systems and shipping clear product specs...",
  },
  {
    key: "dislikes",
    label: "What do you absolutely hate doing or want to avoid?",
    placeholder:
      "E.g. I avoid roles that are heavy on cold sales calls or repetitive admin...",
  },
  {
    key: "differentiator",
    label: "What is a surprising skill or trait that sets you apart?",
    placeholder:
      "E.g. I speak three languages and use that to bridge global teams...",
  },
  {
    key: "dream_job",
    label: "What is your dream job, regardless of salary or practicality?",
    placeholder:
      "E.g. Leading product strategy for a mission-driven climate startup...",
  },
  {
    key: "stretch_goal",
    label: "Where do you want to be in 5–7 years? (Your stretch goal)",
    placeholder:
      "E.g. VP of Product at a Series C startup, owning the full roadmap...",
  },
];

export default function DiscoveryForm({
  values,
  onChange,
  onBack,
  onNext,
}: DiscoveryFormProps) {
  const allFilled = useMemo(
    () => QUESTIONS.every((q) => values[q.key].trim().length > 0),
    [values]
  );

  const update = (key: keyof DiscoveryAnswers, val: string) => {
    onChange({ ...values, [key]: val });
  };

  return (
    <section aria-labelledby="discovery-heading">
      <h2
        id="discovery-heading"
        className="text-2xl font-semibold text-gray-900 mb-2"
      >
        Guided Discovery
      </h2>
      <p className="text-gray-600 mb-6">
        Answer five quick prompts so the AI understands the career you actually
        want — not just the one your resume currently describes.
      </p>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (allFilled) onNext();
        }}
      >
        {QUESTIONS.map((q, idx) => (
          <div key={q.key}>
            <label
              htmlFor={q.key}
              className="block text-sm font-medium text-gray-800"
            >
              <span className="text-brand-700 mr-1">{idx + 1}.</span>
              {q.label}
            </label>
            <textarea
              id={q.key}
              name={q.key}
              rows={3}
              required
              value={values[q.key]}
              onChange={(e) => update(q.key, e.target.value)}
              placeholder={q.placeholder}
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>
        ))}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!allFilled}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-white font-medium shadow-sm hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Next
          </button>
        </div>
      </form>
    </section>
  );
}
