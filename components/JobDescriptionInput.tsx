"use client";

type JobDescriptionInputProps = {
  value: string;
  onChange: (val: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const MIN_LENGTH = 100;

export default function JobDescriptionInput({
  value,
  onChange,
  onBack,
  onNext,
}: JobDescriptionInputProps) {
  const length = value.length;
  const valid = length >= MIN_LENGTH;

  return (
    <section aria-labelledby="jd-heading">
      <h2 id="jd-heading" className="text-2xl font-semibold text-gray-900 mb-2">
        Target Job Description
      </h2>
      <p className="text-gray-600 mb-6">
        Paste the full job description — title, requirements, and
        responsibilities. The more complete it is, the sharper your match score.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onNext();
        }}
      >
        <label
          htmlFor="job_description"
          className="block text-sm font-medium text-gray-800 mb-1.5"
        >
          Paste the target job description below
        </label>
        <textarea
          id="job_description"
          name="job_description"
          rows={8}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste the job posting here..."
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className={valid ? "text-green-700" : "text-gray-500"}>
            {valid
              ? "Looks good."
              : `Minimum ${MIN_LENGTH} characters (${length}/${MIN_LENGTH}).`}
          </span>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-white font-medium shadow-sm hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Next
          </button>
        </div>
      </form>
    </section>
  );
}
