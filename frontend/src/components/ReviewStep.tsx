import Button from "./ui/Button";
import Panel from "./ui/Panel";
import PriceSummary from "./PriceSummary";
import type { PriceResult } from "../lib/flaskBridge";

type ReviewStepProps = {
  price: PriceResult;
  rate: number;
  selectedPages: number;
  fileName: string | null;
  jobId: string | null;
  busy: string | null;
  onProceed: () => void;
  onBack: () => void;
};

export default function ReviewStep({
  price,
  rate,
  selectedPages,
  fileName,
  jobId,
  busy,
  onProceed,
  onBack,
}: ReviewStepProps) {
  return (
    <Panel
      eyebrow="Step 4"
      title="Price review"
      description="These figures come straight from the printer, not from this page — what you see is what you will be charged."
      testId="review-step"
    >
      <PriceSummary
        modeLabel={price.printModeLabel}
        sidednessLabel={price.sidednessLabel}
        rate={rate}
        selectedPages={selectedPages}
        copies={price.copies}
        sheets={price.sheets}
        amount={price.amount}
        source="printer"
      />

      <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <dt className="text-slate-400">Document</dt>
          <dd className="mt-1 truncate font-mono text-slate-200">{fileName ?? "—"}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <dt className="text-slate-400">Print token</dt>
          <dd className="mt-1 truncate font-mono text-slate-200">
            {(jobId ?? "").slice(0, 8).toUpperCase() || "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onBack} data-testid="review-back-button">
          Back
        </Button>
        <Button disabled={Boolean(busy)} onClick={onProceed} data-testid="review-proceed-button">
          {busy ?? `Proceed to pay ₹${price.amount}`}
        </Button>
      </div>
    </Panel>
  );
}
