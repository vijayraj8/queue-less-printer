import { useEffect, useState } from "react";
import Button from "./ui/Button";
import Panel from "./ui/Panel";
import PriceSummary from "./PriceSummary";
import { MAX_COPIES, MIN_COPIES, RATES, estimatePrice } from "../lib/pricing";
import type { PrintMode, Sidedness } from "../lib/flaskBridge";

type SettingsStepProps = {
  copies: number;
  printMode: PrintMode;
  sidedness: Sidedness;
  selectedPages: number;
  busy: string | null;
  onCopies: (value: number) => void;
  onPrintMode: (value: PrintMode) => void;
  onSidedness: (value: Sidedness) => void;
  onContinue: () => void;
  onBack: () => void;
};

export default function SettingsStep({
  copies,
  printMode,
  sidedness,
  selectedPages,
  busy,
  onCopies,
  onPrintMode,
  onSidedness,
  onContinue,
  onBack,
}: SettingsStepProps) {
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    setFlip(true);
    const timer = setTimeout(() => setFlip(false), 420);
    return () => clearTimeout(timer);
  }, [sidedness]);

  const estimate = estimatePrice({ selectedPages, copies, printMode, sidedness });

  return (
    <Panel
      eyebrow="Step 3"
      title="Print settings"
      description="Colour costs five times black & white, so check the live total before you continue."
      testId="settings-step"
    >
      <fieldset>
        <legend className="eyebrow text-slate-400">Print type</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={printMode === "bw"}
            title="Black & white"
            rate={RATES.bw}
            hint="Assignments, notes, drafts"
            onClick={() => onPrintMode("bw")}
            testId="print-mode-bw-option"
          />
          <ModeCard
            active={printMode === "colour"}
            title="Colour"
            rate={RATES.colour}
            hint="Photos, charts, presentations"
            onClick={() => onPrintMode("colour")}
            testId="print-mode-color-option"
          />
        </div>
      </fieldset>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="eyebrow text-slate-400">Copies</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onCopies(copies - 1)}
              disabled={copies <= MIN_COPIES}
              aria-label="Decrease copies"
              className="press flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-lg font-semibold text-white transition-colors duration-200 hover:border-white/30 disabled:opacity-40"
              data-testid="copies-decrement-button"
            >
              −
            </button>
            <input
              type="number"
              min={MIN_COPIES}
              max={MAX_COPIES}
              value={copies}
              onChange={(event) => onCopies(Number(event.target.value))}
              className="h-11 w-20 rounded-xl border border-white/15 bg-white/5 text-center font-mono text-base text-white focus:border-[#60a5fa] focus:outline-none"
              data-testid="copies-number-input"
              aria-label="Number of copies"
            />
            <button
              type="button"
              onClick={() => onCopies(copies + 1)}
              disabled={copies >= MAX_COPIES}
              aria-label="Increase copies"
              className="press flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-lg font-semibold text-white transition-colors duration-200 hover:border-white/30 disabled:opacity-40"
              data-testid="copies-increment-button"
            >
              +
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Between {MIN_COPIES} and {MAX_COPIES}</p>
        </div>

        <div>
          <p className="eyebrow text-slate-400">Printing sides</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <SideButton
              active={sidedness === "single"}
              label="Single-sided"
              onClick={() => onSidedness("single")}
              testId="sidedness-single-option"
            />
            <SideButton
              active={sidedness === "double"}
              label="Double-sided"
              onClick={() => onSidedness("double")}
              testId="sidedness-double-option"
            />
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className={flip ? "sheet-flip inline-block" : "inline-block"} aria-hidden>
              ▤
            </span>
            Double-sided halves the sheets, not the price
          </p>
        </div>
      </div>

      <div className="mt-6">
        <PriceSummary
          modeLabel={printMode === "bw" ? "Black & white" : "Colour"}
          sidednessLabel={sidedness === "single" ? "Single-sided" : "Double-sided"}
          rate={RATES[printMode]}
          selectedPages={selectedPages}
          copies={copies}
          sheets={estimate.sheets}
          amount={estimate.amount}
          source="estimate"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onBack} data-testid="settings-back-button">
          Back
        </Button>
        <Button
          disabled={Boolean(busy)}
          onClick={onContinue}
          data-testid="settings-continue-button"
        >
          {busy ?? "Calculate price"}
        </Button>
      </div>
    </Panel>
  );
}

function ModeCard({
  active,
  title,
  rate,
  hint,
  onClick,
  testId,
}: {
  active: boolean;
  title: string;
  rate: number;
  hint: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={`press lift rounded-xl border p-4 text-left transition-colors duration-200 ${
        active
          ? "border-[#60a5fa] bg-[#2563eb]/15"
          : "border-white/12 bg-white/[0.03] hover:border-white/25"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="font-mono text-sm font-semibold text-[#93c5fd]">₹{rate}/page</span>
      </div>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </button>
  );
}

function SideButton({
  active,
  label,
  onClick,
  testId,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={`press rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors duration-200 ${
        active
          ? "border-[#60a5fa] bg-[#2563eb]/15 text-white"
          : "border-white/12 bg-white/[0.03] text-slate-300 hover:border-white/25"
      }`}
    >
      {label}
    </button>
  );
}
