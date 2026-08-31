"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Alert } from "@/components/ui";

const DEMO_ACCOUNTS = [
  ["admin@qip.local", "Admin"],
  ["qm@qip.local", "Quality Manager"],
  ["inspector@qip.local", "Inspector"],
  ["viewer@qip.local", "Viewer"],
];

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("qm@qip.local");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-white/10 text-lg font-bold">
            Q
          </span>
          <span className="text-lg font-semibold">Quality Inspection Portal</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">
            From engineering drawing to signed inspection report.
          </h1>
          <p className="mt-4 text-brand-100">
            Upload a drawing, let the AI vision pipeline read its dimensions, tolerances and GD&amp;T,
            review what it found, and generate a controlled inspection standard your inspectors work
            against — with automatic PASS/FAIL evaluation and QA sign-off.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-brand-100">
            <li>• Nothing is invented — unreadable callouts are flagged for manual verification.</li>
            <li>• Every approval and edit is recorded in the audit log.</li>
            <li>• Export any report to PDF or Excel.</li>
          </ul>
        </div>
        <p className="text-xs text-brand-100/70">ISO 9001 / IATF 16949 aligned workflow</p>
      </section>

      <section className="flex items-center justify-center bg-white p-6 sm:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-ink-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink-500">Use your company quality-system account.</p>

          {error && (
            <div className="mt-5">
              <Alert>{error}</Alert>
            </div>
          )}

          <label className="mt-6 block">
            <span className="field">Email</span>
            <input
              className="input"
              type="email"
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="mt-4 block">
            <span className="field">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button className="btn-primary mt-6 w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <div className="mt-8 rounded-md border border-ink-200 bg-ink-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Demo accounts
            </p>
            <div className="mt-2 grid gap-1">
              {DEMO_ACCOUNTS.map(([addr, role]) => (
                <button
                  key={addr}
                  type="button"
                  onClick={() => setEmail(addr)}
                  className="flex items-center justify-between rounded px-2 py-1 text-left text-xs text-ink-600 hover:bg-white"
                >
                  <span className="font-mono">{addr}</span>
                  <span className="text-ink-400">{role}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-400">Password: Password123!</p>
          </div>
        </form>
      </section>
    </main>
  );
}
