import { useEffect, useState } from "react";

/**
 * Counts down to the backend's automatic file-deletion deadline
 * (app.py deletes a job's PDFs 10 minutes after its last activity).
 * This is a visual mirror of that rule — the deletion itself is server-side.
 */
export function useCountdown(deadline: number | null): { remaining: number; expired: boolean } {
  const [remaining, setRemaining] = useState(() => secondsLeft(deadline));

  useEffect(() => {
    setRemaining(secondsLeft(deadline));

    if (deadline === null) {
      return;
    }

    const timer = setInterval(() => setRemaining(secondsLeft(deadline)), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  return { remaining, expired: deadline !== null && remaining <= 0 };
}

function secondsLeft(deadline: number | null): number {
  if (deadline === null) {
    return 0;
  }
  return Math.max(0, Math.round((deadline - Date.now()) / 1000));
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
