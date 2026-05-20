"use client";

type ScoreGaugeProps = {
  score: number; // 0..100
  label?: string;
  size?: number; // px
};

function colorForScore(score: number) {
  if (score >= 80) return { stroke: "#16a34a", text: "text-green-700" }; // green-600
  if (score >= 61) return { stroke: "#ca8a04", text: "text-yellow-700" }; // yellow-600
  return { stroke: "#dc2626", text: "text-red-700" }; // red-600
}

export default function ScoreGauge({
  score,
  label,
  size = 200,
}: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const colors = colorForScore(clamped);
  const center = size / 2;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Overall score: ${clamped} out of 100`}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={14}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 800ms ease-out" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className={`font-bold ${colors.text}`}
          style={{ fontSize: size * 0.28 }}
        >
          {clamped}
        </text>
        <text
          x="50%"
          y={center + size * 0.18}
          textAnchor="middle"
          className="fill-gray-500"
          style={{ fontSize: size * 0.08 }}
        >
          / 100
        </text>
      </svg>
      {label && (
        <p className={`mt-3 text-base font-semibold ${colors.text}`}>{label}</p>
      )}
    </div>
  );
}
