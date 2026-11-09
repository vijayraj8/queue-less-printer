import { formatInr } from "../lib/pricing";

type PriceSummaryProps = {
  modeLabel: string;
  sidednessLabel: string;
  rate: number;
  selectedPages: number;
  copies: number;
  sheets: number;
  amount: number;
  source: "estimate" | "printer";
};

export default function PriceSummary({
  modeLabel,
  sidednessLabel,
  rate,
  selectedPages,
  copies,
  sheets,
  amount,
  source,
}: PriceSummaryProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-[#60a5fa]/25 bg-[var(--color-price-card)]"
      data-testid="price-summary-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <p className="eyebrow text-[#93c5fd]">
          {source === "printer" ? "Priced by the printer" : "Live estimate"}
        </p>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[0.65rem] text-[#93c5fd]">
          {modeLabel} · {sidednessLabel}
        </span>
      </div>

      <dl className="divide-y divide-white/5 px-4">
        <Row label="Rate per printed page" value={formatInr(rate)} />
        <Row label="Selected pages" value={String(selectedPages)} />
        <Row label="Copies" value={`× ${copies}`} />
        <Row label="Sheets used" value={String(sheets)} />
        <Row label="Printed pages" value={String(selectedPages * copies)} />
      </dl>

      <div className="flex items-end justify-between gap-3 bg-black/25 px-4 py-4">
        <span className="text-sm text-slate-300">Total payable</span>
        <span
          className="price-pop font-mono text-3xl font-bold text-white sm:text-4xl"
          data-testid="price-total-display"
          aria-live="polite"
        >
          {formatInr(amount)}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-sm text-[#93c5fd]">{label}</dt>
      <dd className="font-mono text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}
