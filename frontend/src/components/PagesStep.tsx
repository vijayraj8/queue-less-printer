import Button from "./ui/Button";
import Panel from "./ui/Panel";
import { parsePageSelection } from "../lib/pricing";

type PagesStepProps = {
  pageCount: number;
  fileName: string | null;
  selection: string;
  busy: string | null;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
};

const PRESETS = ["all", "1-3", "1,3,5"];

export default function PagesStep({
  pageCount,
  fileName,
  selection,
  busy,
  onChange,
  onContinue,
  onBack,
}: PagesStepProps) {
  const { pages, error } = parsePageSelection(selection, pageCount);
  const canContinue = error === null && pages.length > 0;

  return (
    <Panel
      eyebrow="Step 2"
      title="Choose the pages to print"
      description={`${fileName ?? "Your document"} has ${pageCount} page${
        pageCount === 1 ? "" : "s"
      }. Use "all", a range like 1-3, a list like 1,3,5, or a mix like 1-3,5.`}
      testId="pages-step"
    >
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset, index) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`press rounded-full border px-4 py-2 font-mono text-xs font-semibold transition-colors duration-200 ${
              selection.trim().toLowerCase() === preset
                ? "border-transparent bg-[var(--color-accent)] text-white"
                : "border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:text-white"
            }`}
            data-testid={`page-preset-option-${index + 1}`}
          >
            {preset}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange("all")}
          className="press rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors duration-200 hover:border-white/30 hover:text-white"
          data-testid="page-selection-all-btn"
        >
          All pages
        </button>
      </div>

      <label
        htmlFor="page-selection"
        className="eyebrow mt-6 block text-slate-400"
      >
        Page selection
      </label>
      <input
        id="page-selection"
        type="text"
        value={selection}
        onChange={(event) => onChange(event.target.value)}
        placeholder="all"
        className={`mt-2 w-full rounded-xl border bg-white/5 px-4 py-3 font-mono text-base text-white placeholder:text-slate-500 focus:border-[#60a5fa] focus:outline-none ${
          error ? "border-[#f87171]/60" : "border-white/15"
        }`}
        data-testid="page-selection-custom-input"
        aria-describedby="page-selection-status"
      />

      <p
        id="page-selection-status"
        className="mt-3 font-mono text-xs"
        aria-live="polite"
        data-testid="page-selection-status"
      >
        {error ? (
          <span className="text-[#f87171]">{error}</span>
        ) : (
          <span className="text-emerald-300">
            {pages.length} of {pageCount} pages selected
          </span>
        )}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="ghost" onClick={onBack} data-testid="pages-back-button">
          Back
        </Button>
        <Button
          disabled={!canContinue || Boolean(busy)}
          onClick={onContinue}
          data-testid="pages-continue-button"
        >
          Continue to settings
        </Button>
      </div>
    </Panel>
  );
}
