"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X, ShieldCheck, Loader2 } from "lucide-react";

type ResumeUploadProps = {
  file: File | null;
  onChange: (file: File | null) => void;
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED = [".pdf", ".docx"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED.some((ext) => name.endsWith(ext))) {
    return "Only .pdf and .docx files are accepted.";
  }
  if (file.size > MAX_BYTES) {
    return "File exceeds the 10 MB limit.";
  }
  return null;
}

export default function ResumeUpload({
  file,
  onChange,
  onBack,
  onSubmit,
  loading,
}: ResumeUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        setError(err);
        onChange(null);
        return;
      }
      setError(null);
      onChange(f);
    },
    [onChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  return (
    <section aria-labelledby="upload-heading">
      <h2
        id="upload-heading"
        className="text-2xl font-semibold text-gray-900 mb-2"
      >
        Upload Your Resume
      </h2>
      <p className="text-gray-600 mb-6">
        Drop your resume below. We accept <strong>.pdf</strong> and{" "}
        <strong>.docx</strong> up to 10 MB.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload resume"
        className={[
          "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
          dragOver
            ? "border-brand-500 bg-brand-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            // reset input value so re-uploading same file fires change
            e.target.value = "";
          }}
        />

        {!file ? (
          <div className="flex flex-col items-center gap-3 text-gray-600">
            <UploadCloud size={40} className="text-brand-600" aria-hidden="true" />
            <p className="font-medium text-gray-800">
              Drag and drop your resume here
            </p>
            <p className="text-sm">or click to browse files</p>
            <p className="text-xs text-gray-500">PDF or DOCX, max 10 MB</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <FileText size={28} className="text-brand-600" aria-hidden="true" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                setError(null);
              }}
              className="ml-2 rounded-full p-1.5 text-gray-500 hover:bg-gray-200"
              aria-label="Remove file"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
        <ShieldCheck
          size={18}
          className="mt-0.5 flex-shrink-0 text-blue-700"
          aria-hidden="true"
        />
        <p>
          <strong>Privacy notice:</strong> Your resume is processed privately.
          All personal information (name, phone, address, email) is removed
          before AI analysis.
        </p>
      </div>

      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!file || loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-white font-medium shadow-sm hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Analyzing...
            </>
          ) : (
            "Analyze My Resume"
          )}
        </button>
      </div>

      {loading && (
        <p
          className="mt-3 text-center text-sm text-gray-600"
          role="status"
          aria-live="polite"
        >
          Analyzing your resume... This takes about 15–20 seconds.
        </p>
      )}
    </section>
  );
}
