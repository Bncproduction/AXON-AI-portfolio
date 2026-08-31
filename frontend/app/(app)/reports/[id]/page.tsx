"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { evaluate } from "@/lib/evaluate";
import { date, dateTime, limitsText, num, toleranceText } from "@/lib/format";
import {
  Alert,
  Badge,
  Card,
  Field,
  Modal,
  PageHeader,
  Spinner,
  Stat,
  StatusBadge,
} from "@/components/ui";
import type { Defect, Report, ResultValue } from "@/lib/types";

interface Draft {
  actual_value: string;
  actual_text: string;
  manual_result: ResultValue | "";
  defect_id: string;
  defect_description: string;
  remarks: string;
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can, user } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        api.get<Report>(`/reports/${id}`),
        api.get<Defect[]>("/defects"),
      ]);
      setReport(r);
      setDefects(d);
      setDrafts(
        Object.fromEntries(
          (r.results ?? []).map((row) => [
            row.parameter_id,
            {
              actual_value: row.actual_value === null ? "" : String(row.actual_value),
              actual_text: row.actual_text ?? "",
              manual_result: row.parameter.is_attribute && row.result !== "PENDING" ? row.result : "",
              defect_id: row.defect_id ? String(row.defect_id) : "",
              defect_description: row.defect_description ?? "",
              remarks: row.remarks ?? "",
            } satisfies Draft,
          ]),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the report");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const open = report ? report.status === "draft" || report.status === "submitted" : false;
  const editable = open && can("inspector");

  /** Live client-side evaluation of the unsaved grid. */
  const live = useMemo(() => {
    if (!report?.results) return [];
    return report.results.map((row) => {
      const draft = drafts[row.parameter_id];
      const value = draft?.actual_value === "" || draft === undefined ? null : Number(draft.actual_value);
      const verdict = evaluate(
        row.parameter,
        value,
        draft?.manual_result === "" ? null : (draft?.manual_result as ResultValue),
      );
      return { row, draft, verdict };
    });
  }, [report, drafts]);

  const liveSummary = useMemo(() => {
    const passed = live.filter((l) => l.verdict.result === "PASS").length;
    const failed = live.filter((l) => l.verdict.result === "FAIL").length;
    const pending = live.filter((l) => l.verdict.result === "PENDING").length;
    const critical = live.filter(
      (l) => l.verdict.result === "FAIL" && l.row.parameter.classification === "critical",
    ).length;
    const major = live.filter(
      (l) => l.verdict.result === "FAIL" && l.row.parameter.classification === "major",
    ).length;
    const overall =
      live.length === 0 || pending > 0
        ? "PENDING"
        : failed === 0
          ? "ACCEPTED"
          : critical > 0 || major > 0
            ? "REJECTED"
            : "ACCEPTED_WITH_DEVIATION";
    return { total: live.length, passed, failed, pending, critical, overall };
  }, [live]);

  const dirty = useMemo(() => {
    if (!report?.results) return false;
    return report.results.some((row) => {
      const draft = drafts[row.parameter_id];
      if (!draft) return false;
      const savedValue = row.actual_value === null ? "" : String(row.actual_value);
      return (
        draft.actual_value !== savedValue ||
        draft.actual_text !== (row.actual_text ?? "") ||
        draft.remarks !== (row.remarks ?? "") ||
        draft.defect_id !== (row.defect_id ? String(row.defect_id) : "") ||
        draft.defect_description !== (row.defect_description ?? "")
      );
    });
  }, [report, drafts]);

  function patch(parameterId: number, change: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [parameterId]: { ...prev[parameterId], ...change } }));
  }

  async function saveResults() {
    if (!report) return;
    setBusy("Evaluating and saving…");
    setError(null);
    setNotice(null);
    try {
      const payload = Object.entries(drafts).map(([parameterId, draft]) => ({
        parameter_id: Number(parameterId),
        actual_value: draft.actual_value === "" ? null : Number(draft.actual_value),
        actual_text: draft.actual_text || null,
        manual_result: draft.manual_result || null,
        defect_id: draft.defect_id ? Number(draft.defect_id) : null,
        defect_description: draft.defect_description || null,
        remarks: draft.remarks || null,
      }));
      const saved = await api.put<Report>(`/reports/${report.id}/results`, { results: payload });
      setReport(saved);
      setNotice(`Saved. Server evaluation: ${saved.overall_result.replace(/_/g, " ")}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Spinner />;
  if (!report) return <Alert>{error ?? "Report not found"}</Alert>;

  return (
    <>
      <PageHeader
        title={report.report_number}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {report.part?.part_name ?? "—"} · {report.part?.part_number ?? "—"} · Drawing{" "}
            {report.drawing?.drawing_number ?? "—"} Rev {report.drawing_revision ?? "—"}
            <StatusBadge value={report.status} />
            <StatusBadge value={report.overall_result} />
          </span>
        }
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Link href="/reports" className="btn-secondary">
              Back
            </Link>
            <button className="btn-secondary" onClick={() => window.print()}>
              Print
            </button>
            <button
              className="btn-secondary"
              onClick={() => api.download(`/reports/${report.id}/export.pdf`, `${report.report_number}.pdf`)}
            >
              Export PDF
            </button>
            <button
              className="btn-secondary"
              onClick={() => api.download(`/reports/${report.id}/export.xlsx`, `${report.report_number}.xlsx`)}
            >
              Export Excel
            </button>
            {editable && (
              <button className="btn-primary" onClick={saveResults} disabled={!!busy}>
                {dirty ? "Save results" : "Re-evaluate"}
              </button>
            )}
            {editable && report.status === "draft" && (
              <button className="btn-primary" onClick={() => setSignOpen(true)} disabled={!!busy}>
                Sign &amp; submit
              </button>
            )}
            {report.status === "submitted" && can("quality_manager") && (
              <button className="btn-primary" onClick={() => setQaOpen(true)}>
                QA decision
              </button>
            )}
          </div>
        }
      />

      <div className="mb-4 space-y-3">
        {busy && <Alert tone="blue">{busy}</Alert>}
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="green">{notice}</Alert>}
        {dirty && (
          <Alert tone="amber">
            Unsaved measurements. The PASS/FAIL shown below is a live preview — save to record the
            server’s evaluation.
          </Alert>
        )}
      </div>

      <Card title="Report header" className="mb-6">
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
          <Detail label="Company Name" value={report.company_name} />
          <Detail label="Supplier Name" value={report.supplier?.name} />
          <Detail label="Customer Name" value={report.customer_name} />
          <Detail label="Part Name" value={report.part?.part_name} />
          <Detail label="Part Number" value={report.part?.part_number} />
          <Detail label="Drawing Number" value={report.drawing?.drawing_number} />
          <Detail label="Drawing Revision" value={report.drawing_revision} />
          <Detail label="Batch / Lot Number" value={report.batch_number} />
          <Detail label="PO Number" value={report.po_number} />
          <Detail label="Invoice Number" value={report.invoice_number} />
          <Detail label="Inspection Date" value={date(report.inspection_date)} />
          <Detail label="Shift" value={report.shift} />
          <Detail label="Machine Number" value={report.machine_number} />
          <Detail label="Operator Name" value={report.operator_name} />
          <Detail label="Inspector Name" value={report.inspector_name} />
          <Detail label="Lot Quantity" value={String(report.lot_quantity)} />
          <Detail label="Sample Quantity" value={String(report.sample_quantity)} />
        </dl>
      </Card>

      <Card
        title="Inspection results"
        actions={
          <span className="text-xs text-ink-500">
            {liveSummary.passed} pass · {liveSummary.failed} fail · {liveSummary.pending} pending
          </span>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-12">S.No</th>
                <th className="min-w-[170px]">Inspection Parameter</th>
                <th className="min-w-[140px]">Specification</th>
                <th className="w-28">Tolerance</th>
                <th className="w-32">Limits</th>
                <th className="min-w-[130px]">Method</th>
                <th className="min-w-[140px]">Instrument</th>
                <th className="w-28">Actual</th>
                <th className="w-28">Result</th>
                <th className="w-24">Deviation</th>
                <th className="min-w-[150px]">Defect</th>
                <th className="min-w-[150px]">Inspector Remarks</th>
              </tr>
            </thead>
            <tbody>
              {live.map(({ row, draft, verdict }) => {
                const p = row.parameter;
                const failing = verdict.result === "FAIL";
                return (
                  <tr key={row.id} className={failing ? "bg-red-50" : undefined}>
                    <td className="tabular-nums text-ink-400">{row.seq}</td>
                    <td>
                      <p className="font-medium text-ink-800">{p.parameter}</p>
                      <p className="mt-0.5 flex items-center gap-1.5">
                        <StatusBadge value={p.classification} />
                        {p.requires_manual_verification && <Badge tone="amber">Unverified spec</Badge>}
                      </p>
                    </td>
                    <td className="font-mono text-xs">{p.specification || "—"}</td>
                    <td className="font-mono text-xs">{toleranceText(p)}</td>
                    <td className="text-xs text-ink-500">{limitsText(p)}</td>
                    <td className="text-xs">{p.inspection_method ?? "—"}</td>
                    <td className="text-xs">{p.instrument_text ?? "—"}</td>
                    <td>
                      {p.is_attribute ? (
                        <select
                          className="cell-input"
                          value={draft?.manual_result ?? ""}
                          disabled={!editable}
                          onChange={(e) =>
                            patch(row.parameter_id, {
                              manual_result: e.target.value as ResultValue | "",
                              actual_text:
                                e.target.value === "PASS"
                                  ? "Conforms"
                                  : e.target.value === "FAIL"
                                    ? "Does not conform"
                                    : draft?.actual_text ?? "",
                            })
                          }
                        >
                          <option value="">—</option>
                          <option value="PASS">Conforms</option>
                          <option value="FAIL">Does not conform</option>
                          <option value="NA">Not applicable</option>
                        </select>
                      ) : (
                        <input
                          className={`cell-input text-right tabular-nums ${
                            failing ? "border-red-400 bg-white font-semibold text-red-700" : ""
                          }`}
                          type="number"
                          step="any"
                          value={draft?.actual_value ?? ""}
                          disabled={!editable || p.requires_manual_verification}
                          placeholder={p.requires_manual_verification ? "spec unverified" : "—"}
                          onChange={(e) => patch(row.parameter_id, { actual_value: e.target.value })}
                        />
                      )}
                    </td>
                    <td>
                      <StatusBadge value={verdict.result} />
                      {verdict.result === "PENDING" && (
                        <p className="mt-1 text-xs text-ink-400">{verdict.reason}</p>
                      )}
                    </td>
                    <td className="text-right font-mono text-xs">
                      {verdict.deviation ? (
                        <span className="font-semibold text-red-700">
                          {verdict.deviation > 0 ? "+" : ""}
                          {num(verdict.deviation)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {failing ? (
                        <>
                          <select
                            className="cell-input"
                            value={draft?.defect_id ?? ""}
                            disabled={!editable}
                            onChange={(e) => {
                              const chosen = defects.find((d) => String(d.id) === e.target.value);
                              patch(row.parameter_id, {
                                defect_id: e.target.value,
                                defect_description: chosen?.name ?? draft?.defect_description ?? "",
                              });
                            }}
                          >
                            <option value="">— select defect —</option>
                            {defects.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <input
                            className="cell-input mt-1"
                            placeholder="Defect description"
                            value={draft?.defect_description ?? ""}
                            disabled={!editable}
                            onChange={(e) =>
                              patch(row.parameter_id, { defect_description: e.target.value })
                            }
                          />
                        </>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        value={draft?.remarks ?? ""}
                        disabled={!editable}
                        onChange={(e) => patch(row.parameter_id, { remarks: e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-ink-600">
        Final inspection summary
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Parameters Checked" value={report.total_parameters} />
        <Stat label="Passed Parameters" value={report.passed_parameters} tone="green" />
        <Stat
          label="Failed Parameters"
          value={report.failed_parameters}
          tone={report.failed_parameters ? "red" : "slate"}
        />
        <Stat
          label="Critical Failures"
          value={report.critical_failures}
          tone={report.critical_failures ? "red" : "green"}
          hint={`${report.major_failures} major · ${report.minor_failures} minor`}
        />
        <Stat label="Accepted Quantity" value={report.accepted_quantity} tone="green" />
        <Stat label="Rejected Quantity" value={report.rejected_quantity} tone="red" />
        <Stat label="Rework Quantity" value={report.rework_quantity} tone="amber" />
        <Stat
          label="Overall Inspection Result"
          value={<StatusBadge value={report.overall_result} />}
        />
      </div>

      <Card className="mt-6" title="Approvals">
        <div className="grid gap-6 sm:grid-cols-3">
          <SignatureBlock
            title="Inspector Signature"
            name={report.inspector_signature}
            at={report.inspector_signed_at}
          />
          <SignatureBlock
            title="QA Approval"
            name={report.qa_signature}
            at={report.qa_approved_at}
            note={report.qa_remarks}
          />
          <div>
            <p className="field">Digital approval status</p>
            <p className="mt-2">
              <StatusBadge value={report.status} />
            </p>
            <p className="mt-2 text-xs text-ink-400">
              Report created {dateTime(report.created_at)}
              {report.qa_approver && ` · Decided by ${report.qa_approver.full_name}`}
            </p>
          </div>
        </div>
      </Card>

      <SignDialog
        open={signOpen}
        defaultName={report.inspector_name ?? user?.full_name ?? ""}
        pending={report.pending_parameters}
        onClose={() => setSignOpen(false)}
        onSubmit={async (signature) => {
          setBusy("Submitting…");
          setError(null);
          try {
            if (dirty) await saveResults();
            const saved = await api.post<Report>(`/reports/${report.id}/submit`, { signature });
            setReport(saved);
            setSignOpen(false);
            setNotice("Report submitted for QA approval.");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Submission failed");
          } finally {
            setBusy(null);
          }
        }}
      />

      <QaDialog
        open={qaOpen}
        report={report}
        defaultName={user?.full_name ?? ""}
        onClose={() => setQaOpen(false)}
        onDecide={async (payload) => {
          setBusy("Recording QA decision…");
          setError(null);
          try {
            const saved = await api.post<Report>(`/reports/${report.id}/qa-approve`, payload);
            setReport(saved);
            setQaOpen(false);
            setNotice(`Report ${payload.decision}.`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "QA decision failed");
          } finally {
            setBusy(null);
          }
        }}
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="field">{label}</dt>
      <dd className="mt-1 font-medium text-ink-800">{value || "—"}</dd>
    </div>
  );
}

function SignatureBlock({
  title,
  name,
  at,
  note,
}: {
  title: string;
  name?: string | null;
  at?: string | null;
  note?: string | null;
}) {
  return (
    <div>
      <p className="field">{title}</p>
      <div className="mt-2 flex h-20 flex-col justify-end border-b border-ink-300 pb-1">
        <p className="font-[cursive] text-lg text-ink-800">{name || "—"}</p>
      </div>
      <p className="mt-1 text-xs text-ink-400">{at ? dateTime(at) : "Not signed"}</p>
      {note && <p className="mt-1 text-xs text-ink-500">{note}</p>}
    </div>
  );
}

function SignDialog({
  open,
  defaultName,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  defaultName: string;
  pending: number;
  onClose: () => void;
  onSubmit: (signature: string) => Promise<void>;
}) {
  const [signature, setSignature] = useState(defaultName);
  useEffect(() => setSignature(defaultName), [defaultName]);

  return (
    <Modal open={open} title="Sign and submit report" onClose={onClose}>
      <div className="space-y-4">
        {pending > 0 && (
          <Alert tone="amber">
            {pending} parameter{pending === 1 ? "" : "s"} still pending. The server will refuse the
            submission until every parameter has a result.
          </Alert>
        )}
        <p className="text-sm text-ink-600">
          By signing you confirm the recorded measurements are the values you actually observed.
        </p>
        <Field label="Inspector signature (type your full name)">
          <input className="input" value={signature} onChange={(e) => setSignature(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-ink-200 pt-4">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!signature.trim()}
            onClick={() => onSubmit(signature.trim())}
          >
            Sign &amp; submit
          </button>
        </div>
      </div>
    </Modal>
  );
}

function QaDialog({
  open,
  report,
  defaultName,
  onClose,
  onDecide,
}: {
  open: boolean;
  report: Report;
  defaultName: string;
  onClose: () => void;
  onDecide: (payload: {
    decision: "approved" | "rejected";
    signature: string;
    remarks: string | null;
    accepted_quantity: number;
    rejected_quantity: number;
    rework_quantity: number;
  }) => Promise<void>;
}) {
  const [signature, setSignature] = useState(defaultName);
  const [remarks, setRemarks] = useState("");
  const [accepted, setAccepted] = useState(report.accepted_quantity);
  const [rejected, setRejected] = useState(report.rejected_quantity);
  const [rework, setRework] = useState(report.rework_quantity);

  useEffect(() => setSignature(defaultName), [defaultName]);

  const total = accepted + rejected + rework;
  const mismatch = report.lot_quantity > 0 && total !== report.lot_quantity;

  function decide(decision: "approved" | "rejected") {
    return onDecide({
      decision,
      signature: signature.trim(),
      remarks: remarks.trim() || null,
      accepted_quantity: accepted,
      rejected_quantity: rejected,
      rework_quantity: rework,
    });
  }

  return (
    <Modal open={open} title="QA approval" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="rounded-md bg-ink-50 p-4 text-sm">
          <p>
            Server evaluation: <StatusBadge value={report.overall_result} /> ·{" "}
            {report.failed_parameters} failed of {report.total_parameters} ({report.critical_failures}{" "}
            critical)
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Accepted quantity">
            <input
              className="input"
              type="number"
              min={0}
              value={accepted}
              onChange={(e) => setAccepted(Number(e.target.value))}
            />
          </Field>
          <Field label="Rejected quantity">
            <input
              className="input"
              type="number"
              min={0}
              value={rejected}
              onChange={(e) => setRejected(Number(e.target.value))}
            />
          </Field>
          <Field label="Rework quantity">
            <input
              className="input"
              type="number"
              min={0}
              value={rework}
              onChange={(e) => setRework(Number(e.target.value))}
            />
          </Field>
        </div>
        {mismatch && (
          <Alert tone="amber">
            Accepted + rejected + rework = {total}, but the lot quantity is {report.lot_quantity}.
          </Alert>
        )}

        <Field label="QA signature (type your full name)">
          <input className="input" value={signature} onChange={(e) => setSignature(e.target.value)} />
        </Field>
        <Field label="QA remarks">
          <textarea
            className="input"
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Deviation acceptance, concession reference, corrective action required…"
          />
        </Field>

        <div className="flex justify-end gap-2 border-t border-ink-200 pt-4">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-danger" disabled={!signature.trim()} onClick={() => decide("rejected")}>
            Reject
          </button>
          <button className="btn-primary" disabled={!signature.trim()} onClick={() => decide("approved")}>
            Approve
          </button>
        </div>
      </div>
    </Modal>
  );
}
