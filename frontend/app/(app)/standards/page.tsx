"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, qs } from "@/lib/api";
import { date } from "@/lib/format";
import { Alert, Badge, Card, EmptyState, PageHeader, Spinner, StatusBadge } from "@/components/ui";
import type { Standard } from "@/lib/types";

export default function StandardsPage() {
  const [rows, setRows] = useState<Standard[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Standard[]>(`/standards${qs({ q, standard_status: statusFilter })}`)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <>
      <PageHeader
        title="Inspection Standards"
        subtitle="Controlled inspection plans generated from verified drawing extractions"
      />
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card
        title={`${rows.length} standard${rows.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-md border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
              placeholder="Search code or title…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="rounded-md border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        }
        bodyClassName="p-0"
      >
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No inspection standards"
            hint="Analyze a drawing, verify the extracted characteristics, then generate a standard."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Part</th>
                  <th className="text-right">Ver.</th>
                  <th className="text-right">Parameters</th>
                  <th>Verification</th>
                  <th>Created</th>
                  <th>Approved by</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs font-medium">{s.code}</td>
                    <td className="max-w-[280px] truncate">{s.title}</td>
                    <td>{s.part?.part_number ?? "—"}</td>
                    <td className="text-right tabular-nums">v{s.version}</td>
                    <td className="text-right tabular-nums">{s.parameter_count}</td>
                    <td>
                      {s.unverified_count > 0 ? (
                        <Badge tone="amber">{s.unverified_count} pending</Badge>
                      ) : (
                        <Badge tone="green">Complete</Badge>
                      )}
                    </td>
                    <td>{date(s.created_at)}</td>
                    <td>{s.approved_by?.full_name ?? "—"}</td>
                    <td>
                      <StatusBadge value={s.status} />
                    </td>
                    <td className="text-right">
                      <Link href={`/standards/${s.id}`} className="btn-secondary py-1">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
