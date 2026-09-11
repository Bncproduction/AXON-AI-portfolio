"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { api, qs } from "@/lib/api";
import { date } from "@/lib/format";
import { Alert, Card, EmptyState, PageHeader, Spinner, StatusBadge } from "@/components/ui";
import type { Report, Supplier } from "@/lib/types";

export default function ReportsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ReportsInner />
    </Suspense>
  );
}

function ReportsInner() {
  const params = useSearchParams();
  const [rows, setRows] = useState<Report[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filters, setFilters] = useState({
    q: params.get("q") ?? "",
    report_status: "",
    supplier_id: "",
    date_from: "",
    date_to: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Supplier[]>("/suppliers").then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Report[]>(`/reports${qs(filters)}`)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const set = (key: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <PageHeader
        title="Inspection Reports"
        subtitle="Search by report number, batch, PO, invoice, supplier or date"
      />
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card className="mb-6" title="Filters">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="field">Search</span>
            <input
              className="input"
              placeholder="Report / batch / PO / invoice"
              value={filters.q}
              onChange={set("q")}
            />
          </label>
          <label className="block">
            <span className="field">Status</span>
            <select className="input" value={filters.report_status} onChange={set("report_status")}>
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="block">
            <span className="field">Supplier</span>
            <select className="input" value={filters.supplier_id} onChange={set("supplier_id")}>
              <option value="">All</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field">From</span>
            <input className="input" type="date" value={filters.date_from} onChange={set("date_from")} />
          </label>
          <label className="block">
            <span className="field">To</span>
            <input className="input" type="date" value={filters.date_to} onChange={set("date_to")} />
          </label>
        </div>
      </Card>

      <Card title={`${rows.length} report${rows.length === 1 ? "" : "s"}`} bodyClassName="p-0">
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No inspection reports match these filters"
            hint="Approve an inspection standard, then create a report against it."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Report No.</th>
                  <th>Part</th>
                  <th>Supplier</th>
                  <th>Batch</th>
                  <th>PO</th>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Inspector</th>
                  <th className="text-right">Checked</th>
                  <th className="text-right">Failed</th>
                  <th className="text-right">Critical</th>
                  <th>Result</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">
                      <Link href={`/reports/${r.id}`} className="text-brand-600 hover:underline">
                        {r.report_number}
                      </Link>
                    </td>
                    <td>{r.part?.part_number ?? "—"}</td>
                    <td className="max-w-[160px] truncate">{r.supplier?.name ?? "—"}</td>
                    <td className="font-mono text-xs">{r.batch_number ?? "—"}</td>
                    <td className="font-mono text-xs">{r.po_number ?? "—"}</td>
                    <td>{date(r.inspection_date)}</td>
                    <td>{r.shift ?? "—"}</td>
                    <td className="max-w-[140px] truncate">{r.inspector_name ?? "—"}</td>
                    <td className="text-right tabular-nums">{r.total_parameters}</td>
                    <td className="text-right tabular-nums">
                      {r.failed_parameters > 0 ? (
                        <span className="font-semibold text-red-600">{r.failed_parameters}</span>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="text-right tabular-nums">
                      {r.critical_failures > 0 ? (
                        <span className="font-semibold text-red-600">{r.critical_failures}</span>
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
                    <td className="text-right">
                      <Link href={`/reports/${r.id}`} className="btn-secondary py-1">
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
