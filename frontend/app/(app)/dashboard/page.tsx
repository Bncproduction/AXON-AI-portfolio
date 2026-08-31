"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { date } from "@/lib/format";
import { Alert, Card, EmptyState, PageHeader, Spinner, Stat, StatusBadge } from "@/components/ui";
import type {
  DashboardSummary,
  NamedCount,
  ParetoPoint,
  Report,
  TrendPoint,
} from "@/lib/types";

type Granularity = "daily" | "weekly" | "monthly";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [pareto, setPareto] = useState<ParetoPoint[]>([]);
  const [suppliers, setSuppliers] = useState<NamedCount[]>([]);
  const [inspectors, setInspectors] = useState<NamedCount[]>([]);
  const [parts, setParts] = useState<NamedCount[]>([]);
  const [recent, setRecent] = useState<Report[]>([]);
  const [granularity, setGranularity] = useState<Granularity>("weekly");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardSummary>("/dashboard/summary"),
      api.get<ParetoPoint[]>("/dashboard/pareto"),
      api.get<NamedCount[]>("/dashboard/suppliers"),
      api.get<NamedCount[]>("/dashboard/inspectors"),
      api.get<NamedCount[]>("/dashboard/parts"),
      api.get<Report[]>("/reports?limit=8"),
    ])
      .then(([s, p, sup, insp, prt, rep]) => {
        setSummary(s);
        setPareto(p);
        setSuppliers(sup);
        setInspectors(insp);
        setParts(prt);
        setRecent(rep.slice(0, 8));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api
      .get<TrendPoint[]>(`/dashboard/trends?granularity=${granularity}&days=180`)
      .then(setTrends)
      .catch((e) => setError(e.message));
  }, [granularity]);

  if (loading) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;
  if (!summary) return null;

  return (
    <>
      <PageHeader
        title="Quality Dashboard"
        subtitle="Live view of drawing analysis, inspection standards and shop-floor results"
        actions={
          <Link href="/drawings" className="btn-primary">
            Upload drawing
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Drawings Uploaded" value={summary.total_drawings} tone="blue" />
        <Stat label="Standards Generated" value={summary.total_standards} tone="blue" />
        <Stat
          label="Inspections Completed"
          value={summary.completed_reports}
          hint={`${summary.open_reports} open · ${summary.pending_approvals} awaiting QA`}
        />
        <Stat
          label="Critical Defects"
          value={summary.critical_defects}
          tone={summary.critical_defects ? "red" : "green"}
        />
        <Stat
          label="Pass Rate"
          value={`${summary.pass_rate.toFixed(1)}%`}
          tone="green"
          hint={`${summary.parameters_checked.toLocaleString()} characteristics checked`}
        />
        <Stat label="Fail Rate" value={`${summary.fail_rate.toFixed(1)}%`} tone="red" />
        <Stat label="Total Reports" value={summary.total_reports} />
        <Stat label="Awaiting QA Approval" value={summary.pending_approvals} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Inspection Trend"
          actions={
            <div className="flex rounded-md border border-ink-200 p-0.5">
              {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`rounded px-2.5 py-1 text-xs font-medium capitalize ${
                    granularity === g ? "bg-brand-600 text-white" : "text-ink-500 hover:bg-ink-100"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          }
          bodyClassName="p-3"
        >
          {trends.length === 0 ? (
            <EmptyState title="No inspections recorded in this period" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="period" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="passed" name="Accepted" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="failed" name="With failures" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Line
                  dataKey="inspections"
                  name="Inspections"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Pareto — Failing Characteristics" bodyClassName="p-3">
          {pareto.length === 0 ? (
            <EmptyState title="No failures recorded" hint="Every measured characteristic passed." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={pareto} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  fontSize={10}
                  stroke="#94a3b8"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis yAxisId="left" fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  fontSize={11}
                  stroke="#94a3b8"
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip />
                <Bar yAxisId="left" dataKey="count" name="Failures" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Line
                  yAxisId="right"
                  dataKey="cumulative_pct"
                  name="Cumulative %"
                  stroke="#1e3a8a"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Supplier Performance" bodyClassName="p-0">
          <PerformanceTable
            rows={suppliers}
            valueLabel="Pass %"
            secondaryLabel="Reports"
            format={(v) => `${v.toFixed(1)}%`}
            tone={(v) => (v >= 98 ? "text-emerald-600" : v >= 92 ? "text-amber-600" : "text-red-600")}
          />
        </Card>

        <Card title="Inspector Performance" bodyClassName="p-0">
          <PerformanceTable
            rows={inspectors}
            valueLabel="Reports"
            secondaryLabel="Failures found"
            format={(v) => v.toFixed(0)}
          />
        </Card>

        <Card title="Part-wise Defect Analysis" bodyClassName="p-3">
          {parts.length === 0 ? (
            <EmptyState title="No part data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={parts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                <YAxis dataKey="label" type="category" fontSize={11} stroke="#94a3b8" width={90} />
                <Tooltip />
                <Bar dataKey="value" name="Failed characteristics" radius={[0, 3, 3, 0]}>
                  {parts.map((p, i) => (
                    <Cell key={p.label} fill={i === 0 ? "#ef4444" : "#f59e0b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card
        className="mt-6"
        title="Recent Inspection Reports"
        actions={
          <Link href="/reports" className="btn-secondary">
            View all
          </Link>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Report No.</th>
                <th>Part</th>
                <th>Supplier</th>
                <th>Batch</th>
                <th>Date</th>
                <th className="text-right">Checked</th>
                <th className="text-right">Failed</th>
                <th>Result</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/reports/${r.id}`} className="font-medium text-brand-600 hover:underline">
                      {r.report_number}
                    </Link>
                  </td>
                  <td>{r.part?.part_number ?? "—"}</td>
                  <td>{r.supplier?.name ?? "—"}</td>
                  <td className="font-mono text-xs">{r.batch_number ?? "—"}</td>
                  <td>{date(r.inspection_date)}</td>
                  <td className="text-right tabular-nums">{r.total_parameters}</td>
                  <td className="text-right tabular-nums">
                    {r.failed_parameters > 0 ? (
                      <span className="font-semibold text-red-600">{r.failed_parameters}</span>
                    ) : (
                      0
                    )}
                  </td>
                  <td>
                    <StatusBadge value={r.overall_result} />
                  </td>
                  <td>
                    <StatusBadge value={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && <EmptyState title="No inspection reports yet" />}
        </div>
      </Card>
    </>
  );
}

function PerformanceTable({
  rows,
  valueLabel,
  secondaryLabel,
  format,
  tone,
}: {
  rows: NamedCount[];
  valueLabel: string;
  secondaryLabel: string;
  format: (value: number) => string;
  tone?: (value: number) => string;
}) {
  if (rows.length === 0) return <EmptyState title="No data yet" />;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th className="text-right">{valueLabel}</th>
            <th className="text-right">{secondaryLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="max-w-[220px] truncate">{row.label}</td>
              <td className={`text-right font-semibold tabular-nums ${tone?.(row.value) ?? ""}`}>
                {format(row.value)}
              </td>
              <td className="text-right tabular-nums text-ink-500">{row.secondary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
