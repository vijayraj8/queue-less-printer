import { useRef, useState } from "react";
import Button from "./ui/Button";
import Panel from "./ui/Panel";
import { MAX_UPLOAD_BYTES, RATES, formatInr, validatePdfFile } from "../lib/pricing";

type UploadStepProps = {
  busy: string | null;
  onSubmit: (file: File) => void;
};

export default function UploadStep({ busy, onSubmit }: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (candidate: File | null) => {
    if (!candidate) {
      return;
    }
    const problem = validatePdfFile(candidate);
    setError(problem);
    setFile(problem ? null : candidate);
  };

  return (
    <Panel
      eyebrow="Step 1"
      title="Upload your document"
      description="PDF only, up to 10 MB. Encrypted or password-protected files are refused."
      testId="upload-step"
    >
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(event.dataTransfer.files?.[0] ?? null);
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors duration-200 sm:p-10 ${
          dragging
            ? "border-[#60a5fa] bg-[#2563eb]/10"
            : "border-white/15 bg-white/[0.03] hover:border-white/25"
        }`}
        data-testid="pdf-file-dropzone"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)]/15 text-[#60a5fa]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 17v1.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V17"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="mt-4 text-base font-semibold text-white">
          Drag &amp; drop your PDF here
        </p>
        <p className="mt-1 text-sm text-slate-400">or pick it from your device</p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          data-testid="pdf-file-input"
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
        />

        <Button
          variant="secondary"
          className="mt-5"
          onClick={() => inputRef.current?.click()}
          data-testid="choose-pdf-button"
        >
          Choose PDF file
        </Button>

        {file ? (
          <p
            className="mt-4 truncate font-mono text-xs text-emerald-300"
            data-testid="selected-file-summary"
          >
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </p>
        ) : (
          <p className="mt-4 text-xs text-slate-500">
            Limit {(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB per document
          </p>
        )}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[#f87171]" role="alert" data-testid="upload-error-message">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <RateTile label="Black & white" rate={RATES.bw} tone="bw" />
        <RateTile label="Colour" rate={RATES.colour} tone="colour" />
      </div>

      {busy ? (
        <div className="mt-6">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="shimmer h-full w-full" />
          </div>
          <p className="mt-2 text-xs text-slate-400" aria-live="polite">
            {busy}…
          </p>
        </div>
      ) : null}

      <Button
        full
        className="mt-6"
        disabled={!file || Boolean(busy)}
        onClick={() => file && onSubmit(file)}
        data-testid="upload-submit-button"
      >
        Upload &amp; scan PDF
      </Button>
    </Panel>
  );
}

function RateTile({ label, rate, tone }: { label: string; rate: number; tone: "bw" | "colour" }) {
  return (
    <div
      className={`rounded-xl border border-white/10 p-4 ${
        tone === "bw" ? "bg-[var(--color-badge-bw)]" : "bg-[var(--color-badge-color)]"
      }`}
    >
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-white">{formatInr(rate)} / page</p>
    </div>
  );
}
