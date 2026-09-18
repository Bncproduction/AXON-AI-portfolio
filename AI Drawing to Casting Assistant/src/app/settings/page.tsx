"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Card, Field, Spinner, TableShell, Td, Th, cx, inputClass } from "@/components/ui";
import { INTEGRATIONS } from "@/integrations";

export default function SettingsPage() {
  const { settings, updateSettings, hydrated, seedDemoData, clearAll, records } = useStore();
  const [saved, setSaved] = useState(false);

  if (!hydrated) return <Spinner label="Loading workspace…" />;

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-industrial-900">Settings</h1>
        <p className="mt-1 text-sm text-industrial-600">
          Organisation defaults used on reports, engineering defaults used when the drawing is silent, and the
          integration roadmap.
        </p>
      </header>

      {saved && <p className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Settings saved.</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Organisation and approvers" subtitle="Printed in the report title block and validation section">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organisation">
              <input className={inputClass} value={settings.organisation} onChange={(e) => { updateSettings({ organisation: e.target.value }); flash(); }} />
            </Field>
            <Field label="Prepared by">
              <input className={inputClass} value={settings.preparedBy} onChange={(e) => { updateSettings({ preparedBy: e.target.value }); flash(); }} />
            </Field>
            <Field label="Supplier">
              <input className={inputClass} value={settings.supplier} onChange={(e) => { updateSettings({ supplier: e.target.value }); flash(); }} />
            </Field>
            <Field label="Customer">
              <input className={inputClass} value={settings.customer} onChange={(e) => { updateSettings({ customer: e.target.value }); flash(); }} />
            </Field>
            <Field label="QA approver">
              <input className={inputClass} value={settings.qaApprover} onChange={(e) => { updateSettings({ qaApprover: e.target.value }); flash(); }} />
            </Field>
            <Field label="Engineering approver">
              <input className={inputClass} value={settings.engineeringApprover} onChange={(e) => { updateSettings({ engineeringApprover: e.target.value }); flash(); }} />
            </Field>
          </div>
        </Card>

        <Card
          title="Engineering defaults"
          subtitle="Applied only where the drawing does not state a value — every applied default is flagged as AI derived"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Units">
              <select
                className={inputClass}
                value={settings.defaultUnits}
                onChange={(e) => { updateSettings({ defaultUnits: e.target.value as "mm" | "inch" }); flash(); }}
              >
                <option value="mm">Millimetres</option>
                <option value="inch">Inches</option>
              </select>
            </Field>
            <Field label="Default draft angle (°)">
              <input
                type="number"
                step="0.5"
                min="0"
                className={inputClass}
                value={settings.defaultDraftAngleDeg}
                onChange={(e) => { updateSettings({ defaultDraftAngleDeg: Number(e.target.value) }); flash(); }}
              />
            </Field>
            <Field label="General allowance (mm)">
              <input
                type="number"
                step="0.5"
                min="0"
                className={inputClass}
                value={settings.defaultAllowance.general}
                onChange={(e) => { updateSettings({ defaultAllowance: { ...settings.defaultAllowance, general: Number(e.target.value) } }); flash(); }}
              />
            </Field>
            <Field label="Critical face allowance (mm)">
              <input
                type="number"
                step="0.5"
                min="0"
                className={inputClass}
                value={settings.defaultAllowance.criticalFaces}
                onChange={(e) => { updateSettings({ defaultAllowance: { ...settings.defaultAllowance, criticalFaces: Number(e.target.value) } }); flash(); }}
              />
            </Field>
            <Field label="Bore allowance (mm)">
              <input
                type="number"
                step="0.5"
                min="0"
                className={inputClass}
                value={settings.defaultAllowance.bores}
                onChange={(e) => { updateSettings({ defaultAllowance: { ...settings.defaultAllowance, bores: Number(e.target.value) } }); flash(); }}
              />
            </Field>
            <Field label="Require engineering validation" hint="When on, reports show as unapproved until both approvals are recorded">
              <select
                className={inputClass}
                value={settings.requireEngineeringValidation ? "yes" : "no"}
                onChange={(e) => { updateSettings({ requireEngineeringValidation: e.target.value === "yes" }); flash(); }}
              >
                <option value="yes">Yes (recommended)</option>
                <option value="no">No</option>
              </select>
            </Field>
          </div>
          <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Changing a default does not change any value already read from a drawing. Defaults only fill gaps, and any
            gap filled this way is reported as an AI-derived value requiring engineering validation.
          </p>
        </Card>

        <Card title="AI extraction backend" subtitle="Which engine the analysis stage calls">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider">
              <select
                className={inputClass}
                value={settings.aiProvider}
                onChange={(e) => { updateSettings({ aiProvider: e.target.value as typeof settings.aiProvider }); flash(); }}
              >
                <option value="built-in-demo">Built-in demo engine</option>
                <option value="anthropic">Vision model (not configured)</option>
                <option value="custom-endpoint">Custom endpoint (not configured)</option>
              </select>
            </Field>
            <Field label="Model">
              <input className={inputClass} value={settings.aiModel} onChange={(e) => { updateSettings({ aiModel: e.target.value }); flash(); }} />
            </Field>
          </div>
          <p className="mt-4 text-xs text-industrial-600">
            Only the built-in demo engine is wired up in this build. It runs the same deterministic rule set on the
            server (<span className="font-mono">/api/analyze</span>) and in the browser, so the workflow is fully
            testable offline. Selecting another provider does not change behaviour until an{" "}
            <span className="font-mono">ExtractionAdapter</span> is registered.
          </p>
        </Card>

        <Card title="Workspace data" subtitle="Records are stored in this browser only">
          <p className="text-sm text-industrial-700">
            {records.length} record{records.length === 1 ? "" : "s"} in this workspace.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={seedDemoData}>Reload demo data set</Button>
            <Button variant="danger" onClick={clearAll}>Clear all records</Button>
          </div>
          <p className="mt-3 text-xs text-industrial-500">
            Clearing removes every drawing, analysis, casting concept, inspection standard and report from this browser.
            It cannot be undone.
          </p>
        </Card>
      </div>

      <Card title="Future integrations" subtitle="Interfaces defined in src/integrations — no live connections in this build">
        <TableShell>
          <thead>
            <tr>
              <Th className="w-[220px]">Integration</Th>
              <Th className="w-[120px]">Category</Th>
              <Th className="w-[150px]">Status</Th>
              <Th>Purpose</Th>
              <Th className="w-[300px]">Seam in this codebase</Th>
            </tr>
          </thead>
          <tbody>
            {INTEGRATIONS.map((i) => (
              <tr key={i.id} className="hover:bg-industrial-50/50">
                <Td className="font-medium text-industrial-900">{i.name}</Td>
                <Td className="text-xs">{i.category}</Td>
                <Td>
                  <span
                    className={cx(
                      "rounded border px-1.5 py-0.5 text-[11px] font-semibold",
                      i.status === "available"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : i.status === "interface-defined"
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : "border-slate-300 bg-slate-100 text-slate-600",
                    )}
                  >
                    {i.status.replace("-", " ")}
                  </span>
                </Td>
                <Td className="text-industrial-700">{i.purpose}</Td>
                <Td className="font-mono text-[11px] text-industrial-600">{i.seam}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Card>
    </div>
  );
}
