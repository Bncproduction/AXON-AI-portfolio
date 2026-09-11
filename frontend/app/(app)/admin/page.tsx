"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { date, dateTime, titleCase } from "@/lib/format";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import type { Instrument, Role, Supplier, User } from "@/lib/types";

interface AuditRow {
  id: number;
  actor: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  ip_address: string | null;
  created_at: string;
}

const TABS = ["Users", "Suppliers", "Instruments", "Audit log"] as const;

export default function AdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Users");
  const [users, setUsers] = useState<User[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userOpen, setUserOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<User[]>("/users"),
      api.get<Supplier[]>("/suppliers"),
      api.get<Instrument[]>("/instruments"),
      api.get<AuditRow[]>("/audit-logs?limit=100"),
    ])
      .then(([u, s, i, a]) => {
        setUsers(u);
        setSuppliers(s);
        setInstruments(i);
        setAudit(a);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title="Administration"
        subtitle="Users and roles, supplier master, instrument master and the audit trail"
        actions={
          tab === "Users" && (
            <button className="btn-primary" onClick={() => setUserOpen(true)}>
              Add user
            </button>
          )
        }
      />
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-1 border-b border-ink-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Users" && (
        <Card title={`${users.length} users`} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Employee code</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.full_name}</td>
                    <td className="font-mono text-xs">{u.email}</td>
                    <td>{u.employee_code ?? "—"}</td>
                    <td>
                      <Badge tone="blue">{titleCase(u.role)}</Badge>
                    </td>
                    <td>
                      <Badge tone={u.is_active ? "green" : "slate"}>
                        {u.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "Suppliers" && (
        <Card title={`${suppliers.length} suppliers`} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Rating</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">{s.code}</td>
                    <td className="font-medium">{s.name}</td>
                    <td>{s.contact_email ?? "—"}</td>
                    <td>{s.rating ?? "—"}</td>
                    <td>
                      <Badge tone={s.is_active ? "green" : "slate"}>
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "Instruments" && (
        <Card title={`${instruments.length} instruments`} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Least count</th>
                  <th>Range</th>
                  <th>Calibration due</th>
                </tr>
              </thead>
              <tbody>
                {instruments.map((i) => {
                  const overdue =
                    i.calibration_due !== null &&
                    i.calibration_due !== undefined &&
                    new Date(i.calibration_due) < new Date();
                  return (
                    <tr key={i.id}>
                      <td className="font-mono text-xs">{i.code}</td>
                      <td className="font-medium">{i.name}</td>
                      <td>{i.type ?? "—"}</td>
                      <td>{i.least_count ?? "—"}</td>
                      <td>{i.range_text ?? "—"}</td>
                      <td className={overdue ? "font-semibold text-red-600" : ""}>
                        {date(i.calibration_due)}
                        {overdue && " · overdue"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "Audit log" && (
        <Card title={`Last ${audit.length} events`} bodyClassName="p-0">
          {audit.length === 0 ? (
            <EmptyState title="No audit events" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap">{dateTime(row.created_at)}</td>
                      <td>{row.actor ?? "—"}</td>
                      <td>
                        <StatusBadge value={row.action.split(".").pop() ?? row.action} />{" "}
                        <span className="font-mono text-xs text-ink-500">{row.action}</span>
                      </td>
                      <td className="text-xs text-ink-500">
                        {row.entity_type ?? "—"}
                        {row.entity_id ? ` #${row.entity_id}` : ""}
                      </td>
                      <td className="font-mono text-xs text-ink-400">{row.ip_address ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <AddUserDialog
        open={userOpen}
        onClose={() => setUserOpen(false)}
        onDone={() => {
          setUserOpen(false);
          load();
        }}
      />
    </>
  );
}

function AddUserDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "inspector" as Role,
    employee_code: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/users", form);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the user");
    } finally {
      setBusy(false);
    }
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Modal open={open} title="Add user" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Full name">
          <input className="input" required value={form.full_name} onChange={set("full_name")} />
        </Field>
        <Field label="Email">
          <input className="input" type="email" required value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Password (min 8 characters)">
          <input
            className="input"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={set("password")}
          />
        </Field>
        <Field label="Role">
          <select className="input" value={form.role} onChange={set("role")}>
            <option value="viewer">Viewer</option>
            <option value="inspector">Inspector</option>
            <option value="quality_manager">Quality Manager</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="Employee code">
          <input className="input" value={form.employee_code} onChange={set("employee_code")} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-ink-200 pt-4">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
