import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "success";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-[0_18px_38px_-22px_#2563eb] border border-transparent",
  secondary:
    "bg-[var(--color-panel-highlight)] text-slate-100 hover:bg-slate-700 border border-white/10",
  ghost: "bg-transparent text-slate-300 hover:text-white hover:bg-white/5 border border-transparent",
  success:
    "bg-[var(--color-emerald-accent)] text-white hover:bg-emerald-600 shadow-[0_18px_38px_-24px_#059669] border border-transparent",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  full?: boolean;
  children: ReactNode;
};

export default function Button({
  variant = "primary",
  full = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`press inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-45 ${
        full ? "w-full" : ""
      } ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
