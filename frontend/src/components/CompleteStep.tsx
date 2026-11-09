import Button from "./ui/Button";
import Panel from "./ui/Panel";
import type { PrintResult } from "../lib/flaskBridge";
import { formatDuration } from "../hooks/useCountdown";

type CompleteStepProps = {
  output: PrintResult;
  jobId: string | null;
  pagesSummary: string;
  amount: number;
  remaining: number;
  onReset: () => void;
};

export default function CompleteStep({
  output,
  jobId,
  pagesSummary,
  amount,
  remaining,
  onReset,
}: CompleteStepProps) {
  return (
    <Panel
      eyebrow="Print ready"
      title="Your document is prepared"
      description="Simulated printing completed. Download the prepared PDF now — the token below is your pickup reference."
      testId="complete-step"
    >
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-lg text-emerald-300">
            ✓
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-200">Simulated printing completed</p>
            <p className="mt-0.5 text-xs text-emerald-300/80">{pagesSummary}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
          <span className="text-xs text-slate-300">Pickup token</span>
          <span className="font-mono text-lg font-semibold text-white" data-testid="pickup-token">
            {(jobId ?? "").slice(0, 8).toUpperCase()}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
          <span className="text-xs text-slate-300">Amount paid (demo)</span>
          <span className="font-mono text-lg font-semibold text-white">₹{amount}</span>
        </div>
      </div>

      <a
        href={output.downloadPath}
        download
        className="press mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-[var(--color-emerald-accent)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_38px_-24px_#059669] transition-all duration-200 ease-out hover:bg-emerald-600"
        data-testid="download-output-pdf-button"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5M5 19h14"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Download output PDF
      </a>

      <p className="mt-4 text-center text-xs text-slate-400" aria-live="polite">
        Your uploaded and generated files are deleted automatically in{" "}
        <span className="font-mono text-slate-200">{formatDuration(remaining)}</span> — collect
        your print before then.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onReset} data-testid="start-new-print-job-button">
          Start a new print job
        </Button>
      </div>
    </Panel>
  );
}
