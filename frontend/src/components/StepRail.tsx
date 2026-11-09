export const JOURNEY_STEPS = [
  { id: "upload", title: "Upload PDF", subtitle: "Max 10 MB", badge: "Step 1" },
  { id: "pages", title: "Select pages", subtitle: "all, 1-3, 1,3,5", badge: "Step 2" },
  { id: "settings", title: "Print settings", subtitle: "B&W ₹2 vs Colour ₹10", badge: "Step 3" },
  { id: "review", title: "Price review", subtitle: "Itemised by the printer", badge: "Step 4" },
  { id: "payment", title: "Demo payment", subtitle: "Simulated, no real money", badge: "Step 5" },
] as const;

type StepRailProps = {
  current: string;
  completed: string[];
  onSelect: (id: string) => void;
};

export default function StepRail({ current, completed, onSelect }: StepRailProps) {
  return (
    <ol
      className="rounded-2xl border border-white/10 bg-[var(--color-panel)] p-4 sm:p-5"
      data-testid="step-rail"
    >
      {JOURNEY_STEPS.map((step, index) => {
        const isActive = step.id === current;
        const isDone = completed.includes(step.id);

        return (
          <li key={step.id} className="flex gap-3 py-2.5">
            <div className="flex flex-col items-center">
              <span
                className={`press flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-200 ${
                  isActive
                    ? "border-transparent bg-[var(--color-accent)] text-white ring-pulse"
                    : isDone
                      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                      : "border-white/15 bg-white/5 text-slate-400"
                }`}
              >
                {isDone ? "✓" : index + 1}
              </span>
              {index < JOURNEY_STEPS.length - 1 ? (
                <span
                  className={`mt-1 w-px flex-1 ${isDone ? "bg-emerald-400/30" : "bg-white/10"}`}
                  aria-hidden
                />
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => onSelect(step.id)}
              disabled={!isDone && !isActive}
              className="flex-1 text-left disabled:cursor-default"
              data-testid={`step-rail-${step.id}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={`block text-sm font-semibold transition-colors duration-200 ${
                  isActive ? "text-white" : "text-slate-300"
                }`}
              >
                {step.title}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">{step.subtitle}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
