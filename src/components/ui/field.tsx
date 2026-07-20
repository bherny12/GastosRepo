import { clsx } from "clsx";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="mt-2">{children}</div>
      {error ? <span className="mt-2 block text-sm text-coral">{error}</span> : hint ? <span className="mt-2 block text-sm text-ink/60">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx("min-h-12 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus:border-gold", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx("min-h-12 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base text-ink shadow-sm outline-none transition focus:border-gold", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx("min-h-28 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-base text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus:border-gold", className)} {...props} />;
}
