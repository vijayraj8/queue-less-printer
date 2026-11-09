/**
 * flaskBridge — the single compatibility seam between this redesigned UI and the
 * pre-existing, unmodifiable Flask application (/app/app.py).
 *
 * The Flask app has no JSON API: /upload, /configure, /payment and /print each
 * render an HTML page. This module posts to those exact routes (through the Vite
 * proxy, same origin) and reads the few values the UI needs out of that markup.
 *
 * Everything that depends on the backend's HTML lives HERE and nowhere else, so
 * if app.py's markup ever changes, this is the only file to update.
 *
 * Response shapes mirrored from app.py (keep in sync manually):
 *   POST /upload    -> CONFIGURE_HTML : <input name="job_id">, "Total pages: <b>N</b>"
 *   POST /configure -> PRICE_HTML     : .price (₹amount), "Selected pages/copies/sheets"
 *   POST /payment   -> PAYMENT_HTML   : .price (₹amount)
 *   POST /print     -> COMPLETE_HTML  : a.button[href^="/download/"]
 *   errors          -> .error div in ERROR_HTML, or a flashed message on HOME_HTML
 */

export type PrintMode = "bw" | "colour";
export type Sidedness = "single" | "double";

export type UploadResult = {
  jobId: string;
  pageCount: number;
};

export type PriceResult = {
  /** Authoritative amount printed by the backend (parsed from the ₹ figure). */
  amount: number;
  selectedPages: number;
  copies: number;
  printModeLabel: string;
  sidednessLabel: string;
  sheets: number;
};

export type PaymentResult = {
  amount: number;
};

export type PrintResult = {
  /** Path of the generated PDF, exactly as app.py links it: /download/<job_id> */
  downloadPath: string;
};

/** Raised for any response the backend marks as an error (`.error` div). */
export class KioskError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KioskError";
  }
}

const UNEXPECTED = "The printer returned an unexpected response. Please try again.";

function parseDocument(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function textOf(doc: Document, selector: string): string {
  return (doc.querySelector(selector)?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function numberFrom(source: string): number | null {
  const digits = source.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

/** Collects "<p>Label: value</p>" pairs from the price summary page. */
function labelledValues(doc: Document): Record<string, string> {
  const values: Record<string, string> = {};
  doc.querySelectorAll(".container p").forEach((element) => {
    const raw = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    const separator = raw.indexOf(":");
    if (separator > 0) {
      values[raw.slice(0, separator).trim()] = raw.slice(separator + 1).trim();
    }
  });
  return values;
}

type RawResponse = {
  doc: Document;
  ok: boolean;
  status: number;
};

async function postForm(path: string, body: FormData | URLSearchParams): Promise<RawResponse> {
  const response = await fetch(path, {
    method: "POST",
    body,
    credentials: "same-origin",
  });

  const doc = parseDocument(await response.text());

  // app.py reports every problem (including flashed "no file selected" messages
  // rendered after a redirect back to "/") inside a .error block.
  const errorText = textOf(doc, ".error");

  if (errorText) {
    throw new KioskError(errorText);
  }

  if (!response.ok) {
    throw new KioskError(UNEXPECTED);
  }

  return { doc, ok: response.ok, status: response.status };
}

/** POST /upload — attaches the PDF the customer picked. Field name is app.py's. */
export async function uploadPdf(file: File): Promise<UploadResult> {
  const body = new FormData();
  body.append("pdf_file", file);

  const { doc } = await postForm("/upload", body);

  const jobId = (doc.querySelector<HTMLInputElement>('input[name="job_id"]')?.value ?? "").trim();
  const pageCount = numberFrom(textOf(doc, ".success").split("Total pages:")[1] ?? "");

  if (!jobId || pageCount === null) {
    throw new KioskError(UNEXPECTED);
  }

  return { jobId, pageCount };
}

/** POST /configure — sends the print settings, returns the backend's own price. */
export async function configureJob(input: {
  jobId: string;
  printMode: PrintMode;
  copies: number;
  pageSelection: string;
  sidedness: Sidedness;
}): Promise<PriceResult> {
  const body = new URLSearchParams({
    job_id: input.jobId,
    print_type: input.printMode,
    copies: String(input.copies),
    page_selection: input.pageSelection,
    sides: input.sidedness,
  });

  const { doc } = await postForm("/configure", body);

  const amount = numberFrom(textOf(doc, ".price"));
  const labelled = labelledValues(doc);
  const selectedPages = numberFrom(labelled["Selected pages"] ?? "");
  const copies = numberFrom(labelled["Copies"] ?? "");
  const sheets = numberFrom(labelled["Estimated sheets"] ?? "");

  if (amount === null || selectedPages === null || copies === null || sheets === null) {
    throw new KioskError(UNEXPECTED);
  }

  return {
    amount,
    selectedPages,
    copies,
    sheets,
    printModeLabel: labelled["Printing type"] ?? "",
    sidednessLabel: labelled["Printing sides"] ?? "",
  };
}

/** POST /payment — opens the demo-payment screen; returns the amount it shows. */
export async function openPayment(jobId: string): Promise<PaymentResult> {
  const { doc } = await postForm("/payment", new URLSearchParams({ job_id: jobId }));
  const amount = numberFrom(textOf(doc, ".price"));

  if (amount === null) {
    throw new KioskError(UNEXPECTED);
  }

  return { amount };
}

/** POST /print — confirms the demo payment and builds the output PDF. */
export async function confirmDemoPayment(jobId: string): Promise<PrintResult> {
  const { doc } = await postForm("/print", new URLSearchParams({ job_id: jobId }));

  const href = doc.querySelector<HTMLAnchorElement>('a.button[href^="/download/"]')?.getAttribute("href");

  if (!href) {
    throw new KioskError(UNEXPECTED);
  }

  return { downloadPath: href };
}
