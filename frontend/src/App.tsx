import { useMemo, useState } from "react";
import CompleteStep from "./components/CompleteStep";
import CountdownBadge from "./components/CountdownBadge";
import PagesStep from "./components/PagesStep";
import PaymentStep from "./components/PaymentStep";
import QrKioskCard from "./components/QrKioskCode";
import ReviewStep from "./components/ReviewStep";
import SettingsStep from "./components/SettingsStep";
import StepRail from "./components/StepRail";
import UploadStep from "./components/UploadStep";
import Button from "./components/ui/Button";
import { useCountdown } from "./hooks/useCountdown";
import { useJourney, type Stage } from "./hooks/useJourney";
import { RATES, estimatePrice, parsePageSelection } from "./lib/pricing";

const PUBLIC_APP_URL = __PUBLIC_APP_URL__;
const ORDER: Stage[] = ["upload", "pages", "settings", "review", "payment"];

export default function App() {
  const journey = useJourney();
  const { state, busy } = journey;
  const [kioskMode, setKioskMode] = useState(false);
  const { remaining, expired } = useCountdown(state.deadline);

  const parsed = useMemo(
    () => parsePageSelection(state.pageSelection, state.pageCount),
    [state.pageSelection, state.pageCount],
  );
  const selectedPages = parsed.error ? 0 : parsed.pages.length;

  const currentStage: Stage = state.stage === "complete" ? "payment" : state.stage;
  const currentIndex = Math.max(0, ORDER.indexOf(currentStage));
  const completed = ORDER.slice(0, currentIndex);

  // Guard each screen against missing backend data (e.g. after the 10-minute
  // cleanup removed the job) by falling back to the step that produces it.
  const activeStage: Stage =
    state.stage === "review" && !state.price
      ? "settings"
      : state.stage === "payment" && !state.payment
        ? state.price
          ? "review"
          : "upload"
        : state.stage === "complete" && !state.output
          ? "upload"
          : state.stage;

  const estimate = estimatePrice({
    selectedPages: selectedPages || 0,
    copies: state.copies,
    printMode: state.printMode,
    sidedness: state.sidedness,
  });

  const pagesSummary = `${selectedPages} page${selectedPages === 1 ? "" : "s"} · ${state.copies} cop${
    state.copies === 1 ? "y" : "ies"
  } · ${state.printMode === "bw" ? "black & white" : "colour"}`;

  const wizard = (
    <div className="space-y-6">
      {expired ? (
        <div
          className="rise-in rounded-2xl border border-[#f87171]/30 bg-[var(--color-timer-bg)] p-5"
          data-testid="session-expired-banner"
          role="alert"
        >
          <p className="text-sm font-semibold text-[#fca5a5]">
            Session expired — your files were deleted
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#fca5a5]/80">
            For your privacy, uploaded and generated PDFs are removed 10 minutes after your last
            action. Start again to print.
          </p>
          <Button variant="secondary" className="mt-4" onClick={journey.reset} data-testid="expired-start-over-button">
            Start over
          </Button>
        </div>
      ) : (
        <>
          {activeStage === "upload" ? (
            <UploadStep busy={busy} onSubmit={journey.startUpload} />
          ) : null}

          {activeStage === "pages" ? (
            <PagesStep
              pageCount={state.pageCount}
              fileName={state.fileName}
              selection={state.pageSelection}
              busy={busy}
              onChange={journey.setPageSelection}
              onContinue={() => journey.goTo("settings")}
              onBack={() => journey.goTo("upload")}
            />
          ) : null}

          {activeStage === "settings" ? (
            <SettingsStep
              copies={state.copies}
              printMode={state.printMode}
              sidedness={state.sidedness}
              selectedPages={selectedPages}
              busy={busy}
              onCopies={journey.setCopies}
              onPrintMode={journey.setPrintMode}
              onSidedness={journey.setSidedness}
              onContinue={journey.submitSettings}
              onBack={() => journey.goTo("pages")}
            />
          ) : null}

          {activeStage === "review" && state.price ? (
            <ReviewStep
              price={state.price}
              rate={RATES[state.printMode]}
              selectedPages={selectedPages}
              fileName={state.fileName}
              jobId={state.jobId}
              busy={busy}
              onProceed={journey.proceedToPayment}
              onBack={() => journey.goTo("settings")}
            />
          ) : null}

          {activeStage === "payment" ? (
            <PaymentStep
              amount={state.payment?.amount ?? state.price?.amount ?? estimate.amount}
              busy={busy}
              onConfirm={journey.payAndPrint}
              onBack={() => journey.goTo("review")}
            />
          ) : null}

          {activeStage === "complete" && state.output ? (
            <CompleteStep
              output={state.output}
              jobId={state.jobId}
              pagesSummary={pagesSummary}
              amount={state.price?.amount ?? 0}
              remaining={remaining}
              onReset={journey.reset}
            />
          ) : null}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-page)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 hero-mesh" />
      <div aria-hidden className="pointer-events-none absolute inset-0 dock-grid" />

      <header
        className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl"
        data-testid="kiosk-header"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-emerald-accent)] text-xs font-bold text-white"
              aria-hidden
            >
              QL
            </span>
            <div>
              <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-[#60a5fa]">
                QUEUE-LESS
              </p>
              <p className="text-xs text-slate-400">Self-service printing kiosk</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <CountdownBadge remaining={remaining} active={Boolean(state.deadline) && !expired} />
            <button
              type="button"
              onClick={() => setKioskMode((previous) => !previous)}
              aria-pressed={kioskMode}
              className="press rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors duration-200 hover:border-[#60a5fa]/50 hover:text-white"
              data-testid="kiosk-mode-toggle-button"
            >
              {kioskMode ? "Exit kiosk display" : "Kiosk display mode"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {kioskMode ? (
          <section className="rise-in grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="eyebrow text-[#60a5fa]">Station display</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight text-white sm:text-5xl">
                Scan the code,
                <br />
                print without queueing.
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
                This screen stays on the counter. Customers scan it, upload in the browser and
                collect their prints — nobody waits in line.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                <li className="font-mono text-xs">B&amp;W ₹2/page · Colour ₹10/page</li>
                <li className="font-mono text-xs">Max 10 MB per PDF · copies 1–20</li>
                <li className="font-mono text-xs">Files auto-delete 10 minutes after use</li>
              </ul>
            </div>
            <QrKioskCard url={PUBLIC_APP_URL} large />
          </section>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <aside className="space-y-6 lg:col-span-4">
              <StepRail
                current={currentStage}
                completed={completed}
                onSelect={(id) => journey.goTo(id as Stage)}
              />
              <QrKioskCard url={PUBLIC_APP_URL} />
            </aside>

            <div className="space-y-6 lg:col-span-8">
              {wizard}
            </div>
          </div>
        )}
      </main>

      <footer className="relative border-t border-white/10 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p data-testid="footer-notice">
            Demo payment only — no real money is deducted. Output is a PDF, not physical paper.
          </p>
          <p className="flex items-center gap-3">
            <a
              href="/flask/"
              className="text-slate-400 underline decoration-dotted transition-colors hover:text-white"
              data-testid="flask-fallback-link"
            >
              Classic printer view
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
