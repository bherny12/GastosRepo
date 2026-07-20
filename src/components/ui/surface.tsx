import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx("rounded-lg border border-ink/10 bg-white p-4 shadow-sm", className)}>{children}</section>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-ink/65">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-ink/20 bg-white/70 p-6 text-center">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/65">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "danger" | "info" | "gold" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        tone === "neutral" && "bg-linen text-ink",
        tone === "success" && "bg-moss/12 text-moss",
        tone === "danger" && "bg-coral/12 text-coral",
        tone === "info" && "bg-info/12 text-info",
        tone === "gold" && "bg-gold/15 text-ink"
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = "success" }: { value: number; tone?: "success" | "danger" | "gold" | "info" }) {
  const percent = Math.max(0, Math.min(100, value));
  return (
    <div className="h-3 overflow-hidden rounded-full bg-linen" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={clsx("h-full rounded-full", tone === "success" && "bg-moss", tone === "danger" && "bg-coral", tone === "gold" && "bg-gold", tone === "info" && "bg-info")} style={{ width: `${percent}%` }} />
    </div>
  );
}
