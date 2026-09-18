"use client";

import type { ReactNode } from "react";
import { AI_CONCEPT_NOTICE, AI_RECOMMENDATION_NOTICE, type Provenance, type Severity } from "@/lib/types";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx("rounded-lg border border-industrial-200 bg-white shadow-sm print-block", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-industrial-200 bg-industrial-50/70 px-5 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-industrial-800">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-industrial-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  type = "button",
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-industrial-400 focus-visible:ring-offset-1";
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-industrial-700 text-white hover:bg-industrial-800",
    secondary: "border border-industrial-300 bg-white text-industrial-800 hover:bg-industrial-50",
    ghost: "text-industrial-600 hover:bg-industrial-100",
    danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={cx(base, styles[variant], className)}>
      {children}
    </button>
  );
}

const PROVENANCE_STYLE: Record<Provenance, { label: string; className: string; hint: string }> = {
  drawing: {
    label: "From drawing",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    hint: "Read directly from the drawing.",
  },
  ai: {
    label: "AI derived",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    hint: AI_RECOMMENDATION_NOTICE,
  },
  user: {
    label: "User edited",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    hint: "Entered or corrected by a user in this session — not yet engineering-validated.",
  },
  validated: {
    label: "Engineering validated",
    className: "bg-industrial-700 text-white border-industrial-700",
    hint: "Signed off by an authorised engineer.",
  },
  unavailable: {
    label: "Not in drawing",
    className: "bg-slate-100 text-slate-600 border-slate-300",
    hint: "Information Not Available in Drawing.",
  },
};

export function ProvenanceBadge({ provenance, className }: { provenance: Provenance; className?: string }) {
  const s = PROVENANCE_STYLE[provenance];
  return (
    <span
      title={s.hint}
      className={cx(
        "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}

export function ConfidenceBar({ value }: { value?: number }) {
  if (typeof value !== "number") return <span className="text-xs text-industrial-400">—</span>;
  const pct = Math.round(value * 100);
  const tone = pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="inline-flex items-center gap-2" title={`Model confidence ${pct}%`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-industrial-200">
        <span className={cx("block h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-[11px] text-industrial-600">{pct}%</span>
    </span>
  );
}

const SEVERITY_STYLE: Record<Severity, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-sky-50 text-sky-700 border-sky-200",
  info: "bg-slate-100 text-slate-600 border-slate-300",
};

export function SeverityBadge({ severity, label }: { severity: Severity; label?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        SEVERITY_STYLE[severity],
      )}
    >
      {label ?? severity}
    </span>
  );
}

/** The mandatory "this is not approved engineering data" banner. */
export function AiNotice({
  kind = "recommendation",
  className,
}: {
  kind?: "recommendation" | "concept";
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900",
        className,
      )}
      role="note"
    >
      <span aria-hidden className="mt-px text-sm leading-none">⚠</span>
      <span>{kind === "concept" ? AI_CONCEPT_NOTICE : AI_RECOMMENDATION_NOTICE}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-industrial-300 bg-white/60 px-6 py-14 text-center">
      <h3 className="text-sm font-semibold text-industrial-800">{title}</h3>
      <p className="max-w-md text-sm text-industrial-500">{description}</p>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "warn" | "good" | "alert";
}) {
  const tones = {
    default: "border-industrial-200",
    good: "border-emerald-300",
    warn: "border-amber-300",
    alert: "border-red-300",
  } as const;
  const valueTone = {
    default: "text-industrial-900",
    good: "text-emerald-700",
    warn: "text-amber-700",
    alert: "text-red-700",
  } as const;
  return (
    <div className={cx("rounded-lg border bg-white px-4 py-3 shadow-sm", tones[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-industrial-500">{label}</p>
      <p className={cx("mt-1 text-2xl font-semibold tabular-nums", valueTone[tone])}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-industrial-500">{hint}</p>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-industrial-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-industrial-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-industrial-300 bg-white px-3 py-2 text-sm text-industrial-900 shadow-sm outline-none focus:border-industrial-500 focus:ring-2 focus:ring-industrial-200";

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-industrial-600">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-industrial-300 border-t-industrial-700" />
      {label}
    </span>
  );
}

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto rounded-md border border-industrial-200", className)}>
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cx(
        "border-b border-industrial-200 bg-industrial-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-industrial-600",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cx("border-b border-industrial-100 px-3 py-2 align-top text-industrial-800", className)}>{children}</td>;
}
