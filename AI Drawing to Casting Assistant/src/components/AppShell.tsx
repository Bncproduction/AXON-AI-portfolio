"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { fieldValue } from "@/lib/engine";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload Drawing" },
  { href: "/analysis", label: "AI Analysis" },
  { href: "/casting", label: "Casting" },
  { href: "/inspection", label: "Inspection" },
  { href: "/reports", label: "Reports" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

/** Shows which drawing every page is currently operating on. */
function ActiveDrawingBar() {
  const { records, active, activeId, setActiveId, hydrated } = useStore();
  if (!hydrated) return null;

  return (
    <div className="no-print border-b border-industrial-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-2 text-xs">
        <span className="font-semibold uppercase tracking-wide text-industrial-500">Active drawing</span>
        {records.length === 0 ? (
          <span className="text-industrial-500">No drawings uploaded yet.</span>
        ) : (
          <>
            <select
              value={activeId ?? ""}
              onChange={(e) => setActiveId(e.target.value)}
              className="max-w-[420px] rounded border border-industrial-300 bg-white px-2 py-1 text-xs text-industrial-800"
            >
              {records.map((r) => (
                <option key={r.drawing.id} value={r.drawing.id}>
                  {r.drawing.fileName}
                </option>
              ))}
            </select>
            {active?.analysis && (
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-industrial-600">
                <span>{fieldValue(active.analysis, "partNumber")}</span>
                <span>Rev {fieldValue(active.analysis, "revision")}</span>
                <span>{fieldValue(active.analysis, "partName")}</span>
              </span>
            )}
            <span className="ml-auto flex items-center gap-2">
              <StageDot done={!!active} label="Uploaded" />
              <StageDot done={!!active?.analysis} label="Analysed" />
              <StageDot done={!!active?.casting} label="Casting" />
              <StageDot done={!!active?.inspection} label="Inspection" />
              <StageDot done={!!active?.report} label="Report" />
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function StageDot({ done, label }: { done: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx("h-2 w-2 rounded-full", done ? "bg-emerald-500" : "bg-industrial-300")} />
      <span className={cx("text-[11px]", done ? "text-industrial-700" : "text-industrial-400")}>{label}</span>
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-industrial-800 bg-industrial-900 text-white">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded bg-white/10 font-mono text-sm font-bold">DC</span>
            <span>
              <span className="block text-sm font-semibold leading-tight">AI Drawing to Casting Assistant</span>
              <span className="block text-[11px] leading-tight text-industrial-300">
                Drawing → Casting Concept → Inspection Standard → Quality Report
              </span>
            </span>
          </Link>
          <nav className="ml-auto flex flex-wrap items-center gap-1">
            {NAV.map((item) => {
              const activeLink = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "rounded px-3 py-1.5 text-sm transition-colors",
                    activeLink ? "bg-white text-industrial-900 font-semibold" : "text-industrial-200 hover:bg-white/10",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <ActiveDrawingBar />
      <main className="mx-auto max-w-[1600px] px-6 py-6">{children}</main>
      <footer className="no-print mx-auto max-w-[1600px] px-6 pb-10 pt-2 text-[11px] leading-relaxed text-industrial-500">
        All AI-derived casting geometry, process selections, allowances and inspection content in this application are
        engineering proposals generated from the uploaded drawing. Nothing shown here is an approved manufacturing
        instruction unless it is explicitly stated on the drawing or signed off by an authorised engineer.
      </footer>
    </div>
  );
}
