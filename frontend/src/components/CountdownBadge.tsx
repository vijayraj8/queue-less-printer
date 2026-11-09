import { formatDuration } from "../hooks/useCountdown";

type CountdownBadgeProps = {
  remaining: number;
  active: boolean;
};

/** Privacy timer: mirrors app.py's 10-minute automatic file deletion. */
export default function CountdownBadge({ remaining, active }: CountdownBadgeProps) {
  if (!active) {
    return null;
  }

  const urgent = remaining <= 60;

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-300 ${
        urgent
          ? "border-[#f87171]/40 bg-[var(--color-timer-bg)] text-[var(--color-timer-fg)]"
          : "border-amber-400/30 bg-amber-400/10 text-amber-200"
      }`}
      data-testid="cleanup-countdown-timer-badge"
      aria-live="polite"
    >
      <span aria-hidden>🛡</span>
      <span className="hidden sm:inline">Files auto-delete in</span>
      <span className="font-mono tabular-nums">{formatDuration(remaining)}</span>
    </div>
  );
}
