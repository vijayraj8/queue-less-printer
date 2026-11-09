import type { ReactNode } from "react";

type PanelProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  testId?: string;
};

export default function Panel({
  eyebrow,
  title,
  description,
  children,
  className = "",
  testId,
}: PanelProps) {
  const hasHeader = Boolean(eyebrow || title || description);

  return (
    <section
      data-testid={testId}
      className={`rise-in rounded-2xl border border-white/10 bg-[var(--color-panel)] p-5 shadow-[0_30px_70px_-50px_#000] sm:p-7 ${className}`}
    >
      {eyebrow ? <p className="eyebrow text-[#60a5fa]">{eyebrow}</p> : null}
      {title ? (
        <h2 className="mt-2 text-2xl font-semibold text-white sm:text-[1.65rem]">{title}</h2>
      ) : null}
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
      ) : null}
      <div className={hasHeader ? "mt-6" : ""}>{children}</div>
    </section>
  );
}
