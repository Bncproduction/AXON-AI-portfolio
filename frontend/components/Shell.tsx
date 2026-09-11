"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { titleCase } from "@/lib/format";
import { Spinner } from "./ui";
import type { Role } from "@/lib/types";

const NAV: { href: string; label: string; icon: string; min: Role }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "▦", min: "viewer" },
  { href: "/drawings", label: "Drawings", icon: "◳", min: "viewer" },
  { href: "/standards", label: "Inspection Standards", icon: "☰", min: "viewer" },
  { href: "/reports", label: "Inspection Reports", icon: "✓", min: "viewer" },
  { href: "/analytics", label: "Analytics", icon: "◔", min: "viewer" },
  { href: "/admin", label: "Administration", icon: "⚙", min: "admin" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, can } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => setOpen(false), [pathname]);

  if (loading) return <Spinner label="Loading workspace…" />;
  if (!user) return null;

  const items = NAV.filter((item) => can(item.min));

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    if (search.trim()) router.push(`/reports?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 shrink-0 transform bg-brand-900 text-brand-100 transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <span className="grid h-8 w-8 place-items-center rounded bg-white/10 font-bold text-white">
            Q
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Inspection Portal</p>
            <p className="text-[11px] text-brand-100/70">Quality Management</p>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-white/15 font-medium text-white" : "hover:bg-white/10"
                }`}
              >
                <span aria-hidden className="w-4 text-center">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium text-white">{user.full_name}</p>
          <p className="text-xs text-brand-100/70">{titleCase(user.role)}</p>
          <button onClick={logout} className="mt-3 w-full rounded-md bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20">
            Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="no-print fixed inset-0 z-30 bg-ink-900/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-white px-4 sm:px-6">
          <button
            className="btn-ghost px-2 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <form onSubmit={onSearch} className="min-w-0 flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports by number, batch, PO or invoice…"
              className="w-full max-w-lg rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </form>
          <span className="hidden text-xs text-ink-400 sm:block">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </header>

        <main className="print-full mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
