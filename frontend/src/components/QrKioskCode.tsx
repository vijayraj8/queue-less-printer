import { QRCodeSVG } from "qrcode.react";

type QrKioskCardProps = {
  url: string;
  large?: boolean;
};

/**
 * The kiosk QR code. Injected at build time from PUBLIC_APP_URL, so scanning it
 * always opens the live, publicly reachable app — never a hardcoded LAN address.
 */
export default function QrKioskCard({ url, large = false }: QrKioskCardProps) {
  const qrSize = large ? 320 : 168;

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[var(--color-kiosk-dock)] p-5 sm:p-6 ${
        large ? "shadow-[0_40px_80px_-40px_#2563eb]" : ""
      }`}
      data-testid="qr-kiosk-display-card"
    >
      <p className="eyebrow text-[#60a5fa]">Kiosk access</p>
      <h3 className={`mt-2 font-semibold text-white ${large ? "text-3xl sm:text-4xl" : "text-lg"}`}>
        Scan to print from your phone
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Point a phone camera at this code — no app, no queue, no counter.
      </p>

      <div className="mt-5 flex flex-col items-center gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-[0_20px_50px_-30px_#000]">
          <QRCodeSVG
            value={url}
            size={qrSize}
            level="M"
            bgColor="#ffffff"
            fgColor="#0b0f19"
            title="Queue-Less Printer kiosk link"
          />
        </div>
        <p
          className="break-all text-center font-mono text-[0.7rem] leading-relaxed text-slate-400"
          data-testid="public-url-text"
        >
          {url}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <dt className="text-slate-400">Black &amp; white</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-white">₹2 / page</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <dt className="text-slate-400">Colour</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-white">₹10 / page</dd>
        </div>
      </dl>
    </div>
  );
}
