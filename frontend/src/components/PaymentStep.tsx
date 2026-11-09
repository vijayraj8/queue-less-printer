import { useState } from "react";
import Button from "./ui/Button";
import Panel from "./ui/Panel";
import { formatInr } from "../lib/pricing";

type PaymentStepProps = {
  amount: number;
  busy: string | null;
  onConfirm: () => void;
  onBack: () => void;
};

type Method = "upi" | "card";

export default function PaymentStep({ amount, busy, onConfirm, onBack }: PaymentStepProps) {
  const [method, setMethod] = useState<Method>("upi");

  return (
    <Panel
      eyebrow="Step 5"
      title="Demo payment"
      description="Prototype mode: no real money is deducted and no payment gateway is contacted. The choice below is cosmetic."
      testId="payment-step"
    >
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
        <b className="font-semibold">TEST MODE ONLY</b> — no UPI, card or wallet is actually
        charged. Confirming simulates a successful payment and prepares your PDF.
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMethod("upi")}
          aria-pressed={method === "upi"}
          data-testid="payment-method-upi-option"
          className={`press lift rounded-xl border p-4 text-left transition-colors duration-200 ${
            method === "upi"
              ? "border-[#60a5fa] bg-[#2563eb]/15"
              : "border-white/12 bg-white/[0.03] hover:border-white/25"
          }`}
        >
          <span className="text-sm font-semibold text-white">UPI (simulated)</span>
          <span className="mt-1 block font-mono text-xs text-[#93c5fd]">GPay · PhonePe · Paytm style</span>
        </button>
        <button
          type="button"
          onClick={() => setMethod("card")}
          aria-pressed={method === "card"}
          data-testid="payment-method-card-option"
          className={`press lift rounded-xl border p-4 text-left transition-colors duration-200 ${
            method === "card"
              ? "border-[#60a5fa] bg-[#2563eb]/15"
              : "border-white/12 bg-white/[0.03] hover:border-white/25"
          }`}
        >
          <span className="text-sm font-semibold text-white">Card (simulated)</span>
          <span className="mt-1 block font-mono text-xs text-[#93c5fd]">Instant zero-friction demo</span>
        </button>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3 rounded-2xl border border-[#60a5fa]/25 bg-[var(--color-price-card)] px-4 py-4">
        <span className="text-sm text-[#93c5fd]">Amount payable</span>
        <span
          className="price-pop font-mono text-3xl font-bold text-white sm:text-4xl"
          data-testid="payment-amount-display"
          aria-live="polite"
        >
          {formatInr(amount)}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onBack} data-testid="payment-back-button">
          Back
        </Button>
        <Button
          variant="success"
          disabled={Boolean(busy)}
          onClick={onConfirm}
          data-testid="pay-demo-submit-button"
        >
          {busy ?? "Confirm demo payment"}
        </Button>
      </div>
    </Panel>
  );
}
