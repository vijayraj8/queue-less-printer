import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  KioskError,
  confirmDemoPayment,
  configureJob,
  openPayment,
  uploadPdf,
  type PaymentResult,
  type PriceResult,
  type PrintMode,
  type PrintResult,
  type Sidedness,
} from "../lib/flaskBridge";
import { CLEANUP_SECONDS, MAX_COPIES, MIN_COPIES } from "../lib/pricing";

export type Stage = "upload" | "pages" | "settings" | "review" | "payment" | "complete";

export type JourneyState = {
  stage: Stage;
  jobId: string | null;
  fileName: string | null;
  fileSize: number;
  pageCount: number;
  pageSelection: string;
  copies: number;
  printMode: PrintMode;
  sidedness: Sidedness;
  price: PriceResult | null;
  payment: PaymentResult | null;
  output: PrintResult | null;
  /** Client mirror of app.py's 10-minute inactivity deletion deadline. */
  deadline: number | null;
};

const INITIAL: JourneyState = {
  stage: "upload",
  jobId: null,
  fileName: null,
  fileSize: 0,
  pageCount: 0,
  pageSelection: "all",
  copies: 1,
  printMode: "bw",
  sidedness: "single",
  price: null,
  payment: null,
  output: null,
  deadline: null,
};

function nextDeadline(): number {
  return Date.now() + CLEANUP_SECONDS * 1000;
}

/**
 * The 6-step journey, driven entirely by the existing Flask endpoints.
 * Every network call goes through flaskBridge; state is plain React state because
 * these are sequential, non-idempotent form posts rather than cacheable reads.
 */
export function useJourney() {
  const [state, setState] = useState<JourneyState>(INITIAL);
  const [busy, setBusy] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(async (label: string, action: () => Promise<void>) => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setBusy(label);

    try {
      await action();
    } catch (error) {
      const message =
        error instanceof KioskError
          ? error.message
          : "Cannot reach the printer right now. Check your connection and try again.";
      toast.error(message);

      // A job that the backend no longer knows about (expired or restarted)
      // cannot be recovered — send the customer back to the upload step.
      if (/job not found|expired|unavailable/i.test(message)) {
        setState({ ...INITIAL });
      }
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }, []);

  const startUpload = useCallback(
    (file: File) =>
      run("Scanning your PDF", async () => {
        const result = await uploadPdf(file);
        setState((previous) => ({
          ...previous,
          stage: "pages",
          jobId: result.jobId,
          fileName: file.name,
          fileSize: file.size,
          pageCount: result.pageCount,
          pageSelection: "all",
          price: null,
          payment: null,
          output: null,
          deadline: nextDeadline(),
        }));
      }),
    [run],
  );

  const submitSettings = useCallback(
    () =>
      run("Calculating your price", async () => {
        if (!state.jobId) {
          return;
        }
        const price = await configureJob({
          jobId: state.jobId,
          printMode: state.printMode,
          copies: state.copies,
          pageSelection: state.pageSelection,
          sidedness: state.sidedness,
        });
        setState((previous) => ({ ...previous, price, stage: "review", deadline: nextDeadline() }));
      }),
    [run, state.copies, state.jobId, state.pageSelection, state.printMode, state.sidedness],
  );

  const proceedToPayment = useCallback(
    () =>
      run("Opening demo payment", async () => {
        if (!state.jobId) {
          return;
        }
        const payment = await openPayment(state.jobId);
        setState((previous) => ({
          ...previous,
          payment,
          stage: "payment",
          deadline: nextDeadline(),
        }));
      }),
    [run, state.jobId],
  );

  const payAndPrint = useCallback(
    () =>
      run("Preparing your PDF", async () => {
        if (!state.jobId) {
          return;
        }
        const output = await confirmDemoPayment(state.jobId);
        setState((previous) => ({
          ...previous,
          output,
          stage: "complete",
          deadline: nextDeadline(),
        }));
      }),
    [run, state.jobId],
  );

  const reset = useCallback(() => setState({ ...INITIAL }), []);

  const goTo = useCallback((stage: Stage) => {
    setState((previous) => ({ ...previous, stage }));
  }, []);

  const setPageSelection = useCallback((pageSelection: string) => {
    setState((previous) => ({ ...previous, pageSelection, price: null }));
  }, []);

  const setPrintMode = useCallback((printMode: PrintMode) => {
    setState((previous) => ({ ...previous, printMode, price: null }));
  }, []);

  const setSidedness = useCallback((sidedness: Sidedness) => {
    setState((previous) => ({ ...previous, sidedness, price: null }));
  }, []);

  const setCopies = useCallback((copies: number) => {
    setState((previous) => ({
      ...previous,
      copies: Math.min(MAX_COPIES, Math.max(MIN_COPIES, copies)),
      price: null,
    }));
  }, []);

  return {
    state,
    busy,
    startUpload,
    submitSettings,
    proceedToPayment,
    payAndPrint,
    reset,
    goTo,
    setPageSelection,
    setPrintMode,
    setSidedness,
    setCopies,
  };
}
