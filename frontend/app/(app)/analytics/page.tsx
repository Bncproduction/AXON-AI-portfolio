"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { Alert, Card, EmptyState, PageHeader, Spinner } from "@/components/ui";
import type { NamedCount, ParetoPoint, TrendPoint } from "@/lib/types";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  major: "#f59e0b",
  minor: "#64748b",
};

export default function AnalyticsPage() {
  const [monthly, setMonthly] = useState<TrendPoint[]>([]);
  const [pareto, setPareto] = useState<ParetoPoint[]>([]);
  const [suppliers, setSuppliers] = useState<NamedCount[]>([]);
  const [severity, setSeverity] = useState<NamedCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<TrendPoint[]>("/dashboard/trends?granularity=monthly&days=365"),
      api.get<ParetoPoint[]>("/dashboard/pareto?limit=15"),
      api.get<NamedCount[]>("/dashboard/suppliers"),
      api.get<NamedCount[]>("/dashboard/defect-types"),
    ])
      .then(([m, p, s, d]) => {
        setMonthly(m);
        setPareto(p);
        setSuppliers(s);
        setSeverity(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Defect distribution, supplier quality and long-run trends" />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Monthly inspection volume" bodyClassName="p-3">
          {monthly.length === 0 ? (
            <EmptyState title="No data in the last 12 months" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="period" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="passed" name="Accepted" stackId="a" fill="#10b981" />
                <Bar dataKey="failed" name="With failures" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Failures by severity" bodyClassName="p-3">
          {severity.length === 0 ? (
            <EmptyState title="No failures recorded" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severity}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  label={(e: any) => `${e.label}: ${e.value}`}
                >
                  {severity.map((s) => (
                    <Cell key={s.label} fill={SEVERITY_COLORS[s.label] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="xl:col-span-2" title="Pareto — top failing characteristics" bodyClassName="p-3">
          {pareto.length === 0 ? (
            <EmptyState title="No failures recorded" />
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={pareto} margin={{ bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  fontSize={10}
                  stroke="#94a3b8"
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                  height={90}
                />
                <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Failures" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="xl:col-span-2" title="Supplier quality ranking" bodyClassName="p-0">
          {suppliers.length === 0 ? (
            <EmptyState title="No supplier data" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th className="text-right">Reports</th>
                    <th className="text-right">Pass rate</th>
                    <th className="w-1/3">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.label}>
                      <td className="font-medium">{s.label}</td>
                      <td className="text-right tabular-nums">{s.secondary}</td>
                      <td className="text-right font-semibold tabular-nums">
                        {s.value.toFixed(1)}%
                      </td>
                      <td>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-200">
                          <div
                            className={`h-full rounded-full ${
                              s.value >= 98
                                ? "bg-emerald-500"
                                : s.value >= 92
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, s.value))}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
