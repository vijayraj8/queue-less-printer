/**
 * Pricing rules mirrored from app.py for INSTANT client-side previews only.
 * The backend stays the single source of truth: every figure shown as final on
 * the price-review screen comes from the /configure response (flaskBridge).
 *
 * app.py rules: ₹2 per printed page (bw), ₹10 per printed page (colour),
 * copies 1..20, double-sided only halves the SHEET count
 * (ceil(selected / 2) * copies) — the price stays per printed page.
 */

export const RATES: Record<"bw" | "colour", number> = { bw: 2, colour: 10 };
export const MAX_COPIES = 20;
export const MIN_COPIES = 1;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** app.py's CLEANUP_AFTER_SECONDS — shown to the customer as a privacy timer. */
export const CLEANUP_SECONDS = 10 * 60;

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export type SelectionParse = {
  /** 0-based page indexes, sorted — same shape app.py builds. */
  pages: number[];
  error: string | null;
};

/** Rejects what app.py rejects, before a round trip: PDF only, 10 MB cap. */
export function validatePdfFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "Only PDF files are accepted.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File too large. Maximum allowed size is 10 MB.";
  }
  return null;
}

/** Mirror of app.py's parse_page_selection(), for instant feedback. */
export function parsePageSelection(selection: string, totalPages: number): SelectionParse {
  const cleaned = (selection ?? "").trim().toLowerCase();

  if (cleaned === "" || cleaned === "all") {
    return { pages: Array.from({ length: totalPages }, (_, index) => index), error: null };
  }

  const selected = new Set<number>();

  for (const rawPart of cleaned.split(",")) {
    const part = rawPart.trim();
    if (!part) {
      return { pages: [], error: rangeError(totalPages) };
    }

    if (part.includes("-")) {
      const bounds = part.split("-");
      if (bounds.length !== 2) {
        return { pages: [], error: rangeError(totalPages) };
      }

      const start = Number(bounds[0].trim());
      const end = Number(bounds[1].trim());

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 1 ||
        end < start ||
        end > totalPages
      ) {
        return { pages: [], error: rangeError(totalPages) };
      }

      for (let page = start; page <= end; page += 1) {
        selected.add(page - 1);
      }
    } else {
      const page = Number(part);
      if (!Number.isInteger(page) || page < 1 || page > totalPages) {
        return { pages: [], error: rangeError(totalPages) };
      }
      selected.add(page - 1);
    }
  }

  return { pages: [...selected].sort((a, b) => a - b), error: null };
}

function rangeError(totalPages: number): string {
  return `Invalid page selection. Select pages between 1 and ${totalPages}.`;
}

export type PriceEstimate = {
  printedPages: number;
  sheets: number;
  amount: number;
};

/** Preview maths; identical formula to app.py's /configure handler. */
export function estimatePrice(input: {
  selectedPages: number;
  copies: number;
  printMode: "bw" | "colour";
  sidedness: "single" | "double";
}): PriceEstimate {
  const printedPages = input.selectedPages * input.copies;
  const sheets =
    input.sidedness === "double" ? Math.ceil(input.selectedPages / 2) * input.copies : printedPages;

  return { printedPages, sheets, amount: printedPages * RATES[input.printMode] };
}
