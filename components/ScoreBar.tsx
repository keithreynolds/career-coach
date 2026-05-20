"use client";

type ScoreBarProps = {
  label: string;
  score: number; // 0..100
};

function colorClassFor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 61) return "bg-yellow-500";
  return "bg-red-500";
}

function textClassFor(score: number) {
  if (score >= 80) return "text-green-700";
  if (score >= 61) return "text-yellow-700";
  return "text-red-700";
}

export default function ScoreBar({ label, score }: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <span className={`text-sm font-semibold ${textClassFor(clamped)}`}>
          {clamped}/100
        </span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} score`}
      >
        <div
          className={`h-full ${colorClassFor(clamped)} transition-[width] duration-700 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
