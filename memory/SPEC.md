# Queue-Less Printer — Living Spec

## What the app does
Self-service printing kiosk. A customer scans a QR code, uploads a PDF, chooses pages /
copies / colour / sides, sees a live price, confirms a **simulated (demo) payment**, and
downloads a print-ready PDF with a pickup token. Uploaded and generated files are deleted
automatically 10 minutes after the customer's last action. No real payment gateway, no
physical printer.

## Hard constraint: the Flask backend is frozen
`/app/app.py` must stay **byte-for-byte unchanged** (its sha256 is verified against git HEAD
before finishing). Six routes, all server-rendered HTML, no JSON API:
`/` (GET home) → `/upload` (POST multipart) → `/configure` (POST) → `/payment` (POST) →
`/print` (POST) → `/download/<job_id>` (GET, attachment), plus a 413 handler.

- State: in-memory `JOBS` dict + `JOBS_LOCK`. **No database** → jobs die on restart, single
  worker only.
- Files: `uploads/<job_id>.pdf`, `print_output/<job_id>_output.pdf` (relative to CWD).
- Cleanup: daemon thread, every 15 s, deletes files idle 600 s, marks the job `EXPIRED`.
- Pricing: ₹2/printed page B&W, ₹10/printed page colour, copies 1–20, double-sided changes
  only the sheet count (`ceil(selected/2) × copies`) — price stays per printed page.
- No authentication. Job ids are UUID4; download protection is unguessability only.
- No CSRF tokens: the redesigned UI posts the same urlencoded/multipart forms the HTML
  pages used.

## Serving topology
- **Backend** (`/app/backend/server.py`, new file, transport only): `os.chdir('/app')`, adds
  `/app` to `sys.path`, imports the untouched Flask `app`, exposes it as ASGI through
  `a2wsgi.WSGIMiddleware`. The platform's fixed supervisor program runs
  `uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1 --reload` with CWD `/app/backend`.
  - Why the `chdir`: `app.py` uses the relative folder `print_output`, and Werkzeug's
    `send_file` resolves a relative path against `current_app.root_path` (`/app`), not the
    CWD. With CWD `/app/backend`, `/download/<job_id>` raised `FileNotFoundError` (500).
    CWD == root_path reproduces the original `python app.py` run mode.
- **Frontend** (`/app/frontend`): Vite + React 19 + TS + Tailwind v4, port 3000. `vite.config.ts`
  injects `__PUBLIC_APP_URL__` from `PUBLIC_APP_URL` (frontend/.env) and proxies the Flask
  routes at their **original paths**: `/flask` → `/`, plus `/upload`, `/configure`, `/payment`,
  `/print`, `/download` → `http://127.0.0.1:8001`. Same-origin, so cookies/redirects/attachments
  behave normally.

## The compatibility seam — `src/lib/flaskBridge.ts`
There is no API, so the UI posts to the existing HTML routes and reads the few values it needs
out of the returned markup (**all** parsing lives in this one file):

| Call | Route | Values read from the HTML |
|---|---|---|
| `uploadPdf(file)` | POST `/upload` (multipart, field `pdf_file`) | `input[name=job_id]`, `Total pages: <b>N</b>` |
| `configureJob(...)` | POST `/configure` | `.price` ₹ amount, `Selected pages / Copies / Estimated sheets / Printing type / Printing sides` |
| `openPayment(jobId)` | POST `/payment` | `.price` ₹ amount |
| `confirmDemoPayment(jobId)` | POST `/print` | `a.button[href^="/download/"]` |
| any error | — | `.error` div text (also catches the flashed "Please select a PDF file." after Flask's `redirect("/")`) |

If `app.py`'s markup ever changes, this is the only frontend file to update.

## Frontend structure (redesigned)
Single view at `/`, wizard state in `src/hooks/useJourney.ts` (plain React state — these are
sequential non-idempotent form posts, not cacheable reads, so TanStack Query is not used).
Client-side navigation only, deliberately: the SPA has no route named `/upload`, `/print` … so
it cannot shadow the proxied Flask paths.

- Landing = step 1 (`UploadStep`): hero split — step rail + QR kiosk card on the left,
  drag & drop dropzone + rate tiles on the right.
- `PagesStep` (all / 1-3 / 1,3,5 + custom input, instant validation, `1 of N pages selected`)
- `SettingsStep` (B&W ₹2 vs Colour ₹10 cards, copies stepper 1–20, single/double sided,
  live **estimate** price card)
- `ReviewStep` (**printer-priced** breakdown from `/configure`, print token, proceed to pay)
- `PaymentStep` (TEST MODE notice, cosmetic UPI/Card choice, amount, confirm)
- `CompleteStep` (success, pickup token, `Download output PDF` → real `/download/<job_id>`,
  10-minute countdown, start a new job)
- Header: glass bar, live cleanup countdown badge, and a **Kiosk display mode** toggle that
  switches to a counter-tablet view with a giant QR code.
- Footer: demo notice + discreet "Classic printer view" link to `/flask/` as an escape hatch
  if the HTML parsing ever breaks.

Typography/colour follow `/app/design_guidelines.json` (Outfit / Plus Jakarta Sans /
JetBrains Mono via @fontsource-variable, dark navy performance-pro palette, custom keyframes).

### Declared deviations from the design guideline file
- The guideline's generated instruction list mentions `/calculate`, `/pay`, `/status` routes;
  those do not exist in `app.py` and must not be added, so the UI uses the real routes only.
- The guideline merged price review and payment into one "Pay & Confirm" step; the owner's
  approved journey asks for a price review *and* a demo payment screen, so they are two steps.
- Payment method selection (UPI/Card) is **cosmetic** — Flask's demo payment takes no method.
- Live estimates on the settings screen are computed client-side (the preview formula mirrors
  app.py); the amount on the review/payment/complete screens is the backend's own number.

## Data model (frontend state only)
`stage`, `jobId`, `fileName`, `fileSize`, `pageCount`, `pageSelection`, `copies`, `printMode`,
`sidedness`, `price` (from /configure), `payment` (from /payment), `output` (download path),
`deadline` (client mirror of the 600 s cleanup).

## Credentials / auth
None. No login, PIN or account anywhere — nothing is gated.

## Verification log
Phase 1: curl chain through the public URL (all 200s, ₹60 = 3×2×₹10, download
`application/pdf`), non-PDF → 400, unknown job → 404; typecheck clean; browser journey clean.
Phase 2 (redesign): same curl chain + negative cases (bad range → 400 "Invalid page
selection. Select pages between 1 and 3."), typecheck clean, and a full 6-step browser
journey on the public URL: upload 3-page PDF → pages 1-3 → colour ×2 copies double-sided →
live estimate ₹60/4 sheets → printer-priced ₹60 → demo payment → token + download
(`application/pdf`, 3373 bytes). No console errors, no 4xx/5xx.
