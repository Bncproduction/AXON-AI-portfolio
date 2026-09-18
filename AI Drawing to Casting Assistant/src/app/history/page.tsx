"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Card, EmptyState, Field, Spinner, TableShell, Td, Th, cx, inputClass } from "@/components/ui";
import { fieldValue } from "@/lib/engine";
import { formatBytes } from "@/components/DrawingPreview";

type Filter = "all" | "pending" | "validated" | "issues";

export default function HistoryPage() {
  const router = useRouter();
  const { records, setActiveId, deleteRecord, setValidation, hydrated, seedDemoData } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [validating, setValidating] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [by, setBy] = useState("");

  if (!hydrated) return <Spinner label="Loading workspace…" />;

  const filtered = records.filter((r) => {
    if (filter === "pending" && r.validation.status !== "pending") return false;
    if (filter === "validated" && r.validation.status !== "validated") return false;
    if (filter === "issues" && !(r.feasibility ?? []).some((i) => i.severity === "high")) return false;
    if (!query) return true;
    const hay = [
      r.drawing.fileName,
      r.analysis ? fieldValue(r.analysis, "partNumber") : "",
      r.analysis ? fieldValue(r.analysis, "partName") : "",
      r.analysis ? fieldValue(r.analysis, "drawingNumber") : "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-industrial-900">Drawing Analysis History</h1>
          <p className="mt-1 text-sm text-industrial-600">Every drawing processed in this workspace, with its workflow state and validation status.</p>
        </div>
        <div className="flex gap-2">
          {records.length === 0 && <Button onClick={seedDemoData}>Load demo data</Button>}
          <Link href="/upload">
            <Button variant="primary">Upload Drawing</Button>
          </Link>
        </div>
      </header>

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <Field label="Search">
              <input
                className={inputClass}
                placeholder="File name, part number, part name, drawing number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex gap-1">
            {(["all", "pending", "validated", "issues"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cx(
                  "rounded px-3 py-2 text-sm capitalize",
                  filter === f ? "bg-industrial-700 text-white" : "border border-industrial-300 bg-white text-industrial-700 hover:bg-industrial-50",
                )}
              >
                {f === "issues" ? "High-severity issues" : f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="No records match" description="Adjust the filter or search term, or upload a new drawing." />
      ) : (
        <Card title={`${filtered.length} record${filtered.length === 1 ? "" : "s"}`}>
          <TableShell className="min-w-0">
            <thead>
              <tr>
                <Th>Drawing / part</Th>
                <Th className="w-[110px]">Size</Th>
                <Th className="w-[140px]">Casting process</Th>
                <Th className="w-[110px]">Cast wt.</Th>
                <Th className="w-[110px]">Issues</Th>
                <Th className="w-[150px]">Validation</Th>
                <Th className="w-[150px]">Uploaded</Th>
                <Th className="w-[230px] no-print">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const high = r.feasibility?.filter((i) => i.severity === "high").length ?? 0;
                return (
                  <tr key={r.drawing.id} className="align-top hover:bg-industrial-50/50">
                    <Td>
                      <span className="block font-mono text-[12px] text-industrial-900">{r.drawing.fileName}</span>
                      {r.analysis && (
                        <span className="mt-0.5 block text-[11px] text-industrial-600">
                          {fieldValue(r.analysis, "partName")} · {fieldValue(r.analysis, "partNumber")} Rev{" "}
                          {fieldValue(r.analysis, "revision")}
                        </span>
                      )}
                    </Td>
                    <Td className="font-mono text-[11px]">{formatBytes(r.drawing.fileSizeBytes)}</Td>
                    <Td className="text-xs">
                      {r.recommendation
                        ? r.recommendation.insufficientInformation
                          ? "Not determined"
                          : r.recommendation.process
                        : "—"}
                    </Td>
                    <Td className="font-mono text-[12px]">{r.casting ? `${r.casting.estimatedCastWeightKg} kg` : "—"}</Td>
                    <Td className={cx("font-mono text-xs", high > 0 && "text-red-700")}>
                      {r.feasibility ? `${r.feasibility.length}${high ? ` (${high} high)` : ""}` : "—"}
                    </Td>
                    <Td>
                      <span
                        className={cx(
                          "rounded border px-1.5 py-0.5 text-[11px] font-semibold",
                          r.validation.status === "validated"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : r.validation.status === "rejected"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-amber-200 bg-amber-50 text-amber-800",
                        )}
                      >
                        {r.validation.status}
                      </span>
                      {r.validation.validatedBy && (
                        <span className="mt-1 block text-[10px] text-industrial-500">{r.validation.validatedBy}</span>
                      )}
                    </Td>
                    <Td className="font-mono text-[11px] text-industrial-600">{new Date(r.drawing.uploadedAt).toLocaleString()}</Td>
                    <Td className="no-print">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-xs"
                          onClick={() => {
                            setActiveId(r.drawing.id);
                            router.push(r.report ? "/reports" : r.casting ? "/casting" : r.analysis ? "/analysis" : "/upload");
                          }}
                        >
                          Open
                        </Button>
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-xs"
                          onClick={() => {
                            setValidating(validating === r.drawing.id ? null : r.drawing.id);
                            setBy(r.validation.validatedBy ?? "");
                            setNote(r.validation.note ?? "");
                          }}
                        >
                          Validate
                        </Button>
                        <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => deleteRecord(r.drawing.id)}>
                          Delete
                        </Button>
                      </div>
                      {validating === r.drawing.id && (
                        <div className="mt-2 space-y-2 rounded border border-industrial-200 bg-white p-2">
                          <input className={inputClass} placeholder="Validated by" value={by} onChange={(e) => setBy(e.target.value)} />
                          <textarea className={inputClass} rows={2} placeholder="Validation note" value={note} onChange={(e) => setNote(e.target.value)} />
                          <div className="flex gap-1">
                            <Button
                              variant="primary"
                              className="px-2 py-1 text-xs"
                              disabled={!by.trim()}
                              onClick={() => {
                                setValidation(r.drawing.id, "validated", by.trim(), note.trim());
                                setValidating(null);
                              }}
                            >
                              Validate
                            </Button>
                            <Button
                              variant="danger"
                              className="px-2 py-1 text-xs"
                              disabled={!by.trim()}
                              onClick={() => {
                                setValidation(r.drawing.id, "rejected", by.trim(), note.trim());
                                setValidating(null);
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </Card>
      )}
    </div>
  );
}
