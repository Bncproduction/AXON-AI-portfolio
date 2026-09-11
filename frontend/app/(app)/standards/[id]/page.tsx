"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date, limitsText } from "@/lib/format";
import {
  Alert,
  Badge,
  Card,
  Field,
  Modal,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import type { Instrument, Parameter, Report, Standard, Supplier } from "@/lib/types";

export default function StandardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();

  const [standard, setStandard] = useState<Standard | null>(null);
  const [rows, setRows] = useState<Parameter[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, inst] = await Promise.all([
        api.get<Standard>(`/standards/${id}`),
        api.get<Instrument[]>("/instruments"),
      ]);
      setStandard(s);
      setRows(s.parameters ?? []);
      setInstruments(inst);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the standard");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const editable = can("quality_manager") && standard?.status === "draft";
  const unverified = rows.filter((r) => r.requires_manual_verification).length;

  function patch(index: number, change: Partial<Parameter>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...change } : r)));
  }

  async function save() {
    setBusy("Saving…");
    setError(null);
    try {
      const saved = await api.put<Standard>(`/standards/${id}/parameters`, {
        parameters: rows.map((r, i) => ({ ...r, seq: i + 1 })),
      });
      setStandard(saved);
      setRows(saved.parameters ?? []);
      setNotice("Inspection standard saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy("Approving…");
    setError(null);
    try {
      await api.put(`/standards/${id}/parameters`, {
        parameters: rows.map((r, i) => ({ ...r, seq: i + 1 })),
      });
      const approved = await api.post<Standard>(`/standards/${id}/approve`, {});
      setStandard(approved);
      setRows(approved.parameters ?? []);
      setNotice("Standard approved and released for inspection.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Spinner />;
  if (!standard) return <Alert>{error ?? "Standard not found"}</Alert>;

  return (
    <>
      <PageHeader
        title={standard.code}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {standard.title} · v{standard.version}
            <StatusBadge value={standard.status} />
            {standard.approved_by && (
              <span className="text-xs text-ink-400">
                Approved by {standard.approved_by.full_name} on {date(standard.approved_at)}
              </span>
            )}
          </span>
        }
        actions={
          <>
            <Link href="/standards" className="btn-secondary">
              Back
            </Link>
            {editable && (
              <>
                <button className="btn-secondary" onClick={save} disabled={!!busy}>
                  Save changes
                </button>
                <button className="btn-primary" onClick={approve} disabled={!!busy}>
                  Approve standard
                </button>
              </>
            )}
            {standard.status === "approved" && can("inspector") && (
              <button className="btn-primary" onClick={() => setCreateOpen(true)}>
                Create inspection report
              </button>
            )}
          </>
        }
      />

      <div className="mb-4 space-y-3">
        {busy && <Alert tone="blue">{busy}</Alert>}
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="green">{notice}</Alert>}
        {unverified > 0 && (
          <Alert tone="amber">
            {unverified} parameter{unverified === 1 ? "" : "s"} still marked{" "}
            <em>Requires Manual Verification</em>. Enter the nominal and tolerance from the drawing
            and untick the flag — approval is blocked until then.
          </Alert>
        )}
        {standard.status !== "draft" && can("quality_manager") && (
          <Alert tone="blue">
            This standard is {standard.status} and therefore read-only. Generate a new version from
            the drawing to make changes.
          </Alert>
        )}
      </div>

      <Card
        title={`Inspection parameters (${rows.length})`}
        actions={
          editable && (
            <button
              className="btn-secondary py-1"
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  {
                    id: -Date.now(),
                    seq: prev.length + 1,
                    parameter: "New characteristic",
                    specification: "",
                    nominal_value: null,
                    upper_tolerance: null,
                    lower_tolerance: null,
                    unit: "mm",
                    inspection_method: "Variable measurement",
                    instrument_id: null,
                    instrument_text: null,
                    frequency: "5 pcs per lot",
                    sampling_plan: "ISO 2859-1, Level II, AQL 0.65",
                    acceptance_criteria: "",
                    classification: "major",
                    reference_dimension: null,
                    remarks: null,
                    is_attribute: false,
                    requires_manual_verification: true,
                    source_confidence: null,
                    source_note: "Added manually by Quality Engineer",
                  },
                ])
              }
            >
              Add parameter
            </button>
          )
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">S.No</th>
                <th className="min-w-[170px]">Inspection Parameter</th>
                <th className="min-w-[150px]">Specification</th>
                <th className="w-24">Nominal</th>
                <th className="w-24">Upper tol.</th>
                <th className="w-24">Lower tol.</th>
                <th className="w-16">Unit</th>
                <th className="min-w-[140px]">Inspection Method</th>
                <th className="min-w-[150px]">Measuring Instrument</th>
                <th className="min-w-[110px]">Frequency</th>
                <th className="min-w-[140px]">Sampling Plan</th>
                <th className="min-w-[140px]">Acceptance Criteria</th>
                <th className="w-24">Class</th>
                <th className="w-24">Ref. Dim.</th>
                <th className="min-w-[150px]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, index) => (
                <tr
                  key={p.id}
                  className={p.requires_manual_verification ? "bg-amber-50/70" : undefined}
                >
                  <td className="tabular-nums text-ink-400">{index + 1}</td>
                  <td>
                    <input
                      className="cell-input"
                      value={p.parameter}
                      disabled={!editable}
                      onChange={(e) => patch(index, { parameter: e.target.value })}
                    />
                    <label className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-ink-300"
                        checked={p.is_attribute}
                        disabled={!editable}
                        onChange={(e) => patch(index, { is_attribute: e.target.checked })}
                      />
                      Attribute (inspector verdict)
                    </label>
                  </td>
                  <td>
                    <input
                      className="cell-input font-mono text-xs"
                      value={p.specification}
                      disabled={!editable}
                      onChange={(e) => patch(index, { specification: e.target.value })}
                    />
                  </td>
                  <Num value={p.nominal_value} disabled={!editable} onChange={(v) => patch(index, { nominal_value: v })} />
                  <Num value={p.upper_tolerance} disabled={!editable} onChange={(v) => patch(index, { upper_tolerance: v })} />
                  <Num value={p.lower_tolerance} disabled={!editable} onChange={(v) => patch(index, { lower_tolerance: v })} />
                  <td>
                    <input
                      className="cell-input"
                      value={p.unit ?? ""}
                      disabled={!editable}
                      onChange={(e) => patch(index, { unit: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      value={p.inspection_method ?? ""}
                      disabled={!editable}
                      onChange={(e) => patch(index, { inspection_method: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="cell-input"
                      value={p.instrument_id ?? ""}
                      disabled={!editable}
                      onChange={(e) =>
                        patch(index, {
                          instrument_id: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    >
                      <option value="">{p.instrument_text ?? "— select —"}</option>
                      {instruments.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      value={p.frequency ?? ""}
                      disabled={!editable}
                      onChange={(e) => patch(index, { frequency: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      value={p.sampling_plan ?? ""}
                      disabled={!editable}
                      onChange={(e) => patch(index, { sampling_plan: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      value={p.acceptance_criteria ?? ""}
                      disabled={!editable}
                      onChange={(e) => patch(index, { acceptance_criteria: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-ink-400">{limitsText(p)}</p>
                  </td>
                  <td>
                    <select
                      className="cell-input"
                      value={p.classification}
                      disabled={!editable}
                      onChange={(e) =>
                        patch(index, { classification: e.target.value as Parameter["classification"] })
                      }
                    >
                      <option value="critical">Critical</option>
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      value={p.reference_dimension ?? ""}
                      disabled={!editable}
                      onChange={(e) => patch(index, { reference_dimension: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      value={p.remarks ?? ""}
                      disabled={!editable}
                      onChange={(e) => patch(index, { remarks: e.target.value })}
                    />
                    {p.requires_manual_verification ? (
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-amber-700">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-ink-300"
                          disabled={!editable}
                          onChange={() =>
                            patch(index, { requires_manual_verification: false })
                          }
                        />
                        Requires Manual Verification
                      </label>
                    ) : (
                      <p className="mt-1">
                        <Badge tone="green">Verified</Badge>
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateReportDialog
        open={createOpen}
        standardId={standard.id}
        onClose={() => setCreateOpen(false)}
        onCreated={(report) => router.push(`/reports/${report.id}`)}
      />
    </>
  );
}

function Num({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <td>
      <input
        className="cell-input text-right tabular-nums"
        type="number"
        step="any"
        value={value ?? ""}
        placeholder="—"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </td>
  );
}

function CreateReportDialog({
  open,
  standardId,
  onClose,
  onCreated,
}: {
  open: boolean;
  standardId: number;
  onClose: () => void;
  onCreated: (report: Report) => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState({
    supplier_id: "",
    batch_number: "",
    po_number: "",
    invoice_number: "",
    inspection_date: new Date().toISOString().slice(0, 10),
    shift: "A",
    machine_number: "",
    operator_name: "",
    lot_quantity: 100,
    sample_quantity: 5,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) api.get<Supplier[]>("/suppliers").then(setSuppliers).catch(() => setSuppliers([]));
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const report = await api.post<Report>("/reports", {
        standard_id: standardId,
        ...form,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        lot_quantity: Number(form.lot_quantity),
        sample_quantity: Number(form.sample_quantity),
      });
      onCreated(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the report");
    } finally {
      setBusy(false);
    }
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Modal open={open} title="New inspection report" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Supplier">
            <select className="input" value={form.supplier_id} onChange={set("supplier_id")}>
              <option value="">— none —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Batch / Lot number">
            <input className="input" value={form.batch_number} onChange={set("batch_number")} />
          </Field>
          <Field label="Inspection date">
            <input
              className="input"
              type="date"
              value={form.inspection_date}
              onChange={set("inspection_date")}
            />
          </Field>
          <Field label="PO number">
            <input className="input" value={form.po_number} onChange={set("po_number")} />
          </Field>
          <Field label="Invoice number">
            <input className="input" value={form.invoice_number} onChange={set("invoice_number")} />
          </Field>
          <Field label="Shift">
            <select className="input" value={form.shift} onChange={set("shift")}>
              <option>A</option>
              <option>B</option>
              <option>C</option>
            </select>
          </Field>
          <Field label="Machine number">
            <input className="input" value={form.machine_number} onChange={set("machine_number")} />
          </Field>
          <Field label="Operator name">
            <input className="input" value={form.operator_name} onChange={set("operator_name")} />
          </Field>
          <Field label="Lot quantity">
            <input
              className="input"
              type="number"
              min={0}
              value={form.lot_quantity}
              onChange={set("lot_quantity")}
            />
          </Field>
          <Field label="Sample quantity">
            <input
              className="input"
              type="number"
              min={0}
              value={form.sample_quantity}
              onChange={set("sample_quantity")}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-200 pt-4">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create report"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
