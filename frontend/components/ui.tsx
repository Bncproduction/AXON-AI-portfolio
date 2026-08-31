"use client";

import { titleCase } from "@/lib/format";

/* ------------------------------------------------------------------ badges */
const TONES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-1 ring-red-200",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  blue: "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
  slate: "bg-ink-100 text-ink-600 ring-1 ring-ink-200",
  purple: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
};

export function Badge({
  tone = "slate",
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return <span className={`badge ${TONES[tone]}`}>{children}</span>;
}

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  PASS: "green",
  FAIL: "red",
  PENDING: "amber",
  NA: "slate",
  ACCEPTED: "green",
  ACCEPTED_WITH_DEVIATION: "amber",
  REJECTED: "red",
  approved: "green",
  rejected: "red",
  submitted: "blue",
  draft: "slate",
  analyzed: "green",
  analyzing: "blue",
  uploaded: "slate",
  failed: "red",
  archived: "slate",
  critical: "red",
  major: "amber",
  minor: "slate",
};

export function StatusBadge({ value }: { value: string }) {
  return <Badge tone={STATUS_TONE[value] ?? "slate"}>{titleCase(value)}</Badge>;
}

/* -------------------------------------------------------------------- misc */
export function Card({
  title,
  actions,
  children,
  className = "",
  bodyClassName = "p-5",
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          <h2 className="card-title">{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: keyof typeof TONES;
}) {
  const accent: Record<string, string> = {
    green: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-brand-600",
    slate: "text-ink-900",
    purple: "text-violet-600",
  };
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${accent[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-14 text-center">
      <p className="text-sm font-medium text-ink-600">{title}</p>
      {hint && <p className="max-w-md text-sm text-ink-400">{hint}</p>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-ink-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600" />
      {label}
    </div>
  );
}

export function Alert({
  tone = "red",
  children,
}: {
  tone?: "red" | "amber" | "green" | "blue";
  children: React.ReactNode;
}) {
  const tones = {
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    blue: "border-brand-100 bg-brand-50 text-brand-700",
  };
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${tones[tone]}`} role="alert">
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="field">{label}</span>
      {children}
    </label>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:p-8">
      <div className={`card w-full ${wide ? "max-w-4xl" : "max-w-lg"}`}>
        <header className="card-header">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <button className="btn-ghost px-2 py-1" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
