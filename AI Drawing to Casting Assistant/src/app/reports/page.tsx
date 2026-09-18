"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Card, EmptyState, Field, Spinner, inputClass } from "@/components/ui";
import { ReportDocument } from "@/components/ReportDocument";
import type { ValidationSignoff } from "@/lib/types";

export default function ReportsPage() {
  const { active, settings, generateReport, setValidation, hydrated } = useStore();
  const [signoff, setSignoff] = useState<ValidationSignoff | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setSignoff(
      active.report?.signoff ?? {
        preparedBy: settings.preparedBy,
        date: new Date().toISOString().slice(0, 10),
        supplier: settings.supplier,
        customer: settings.customer,
        qaApprover: settings.qaApprover,
        qaApproved: false,
        engineeringApprover: settings.engineeringApprover,
        engineeringApproved: false,
        remarks: "",
      },
    );
  }, [active, settings]);

  if (!hydrated) return <Spinner label="Loading workspace…" />;

  if (!active?.casting) {
    return (
      <EmptyState
        title="Casting analysis required"
        description="The report is assembled from the drawing analysis, casting concept, feasibility study, defect prediction and inspection standard."
        action={
          <Link href="/casting">
            <Button variant="primary">Go to Casting</Button>
          </Link>
        }
      />
    );
  }

  const set = <K extends keyof ValidationSignoff>(key: K, value: ValidationSignoff[K]) =>
    setSignoff((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <div className="space-y-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-industrial-900">Casting Analysis Report</h1>
          <p className="mt-1 text-sm text-industrial-600">
            Assembles the full workflow into one document: drawing information, extracted parameters, casting concept,
            comparison, feasibility, defect analysis, inspection standard, recommendations and the validation section.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => {
              if (!signoff) return;
              const r = generateReport(active.drawing.id, signoff);
              setMessage(`Report ${r.reportNumber} generated.`);
            }}
          >
            Generate Casting Analysis Report
          </Button>
          {active.report && <Button onClick={() => window.print()}>Print / Save as PDF</Button>}
        </div>
      </header>

      {message && <p className="no-print rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}

      {!active.inspection && (
        <p className="no-print rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No inspection standard has been generated for this drawing yet — section 9 will be omitted from the report.{" "}
          <Link href="/inspection" className="underline">Generate it first</Link> for a complete document.
        </p>
      )}

      {signoff && (
        <Card className="no-print" title="Report header and approvals" subtitle="These fields are printed in the report title block and validation section">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Prepared by">
              <input className={inputClass} value={signoff.preparedBy} onChange={(e) => set("preparedBy", e.target.value)} />
            </Field>
            <Field label="Date">
              <input type="date" className={inputClass} value={signoff.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="Supplier">
              <input className={inputClass} value={signoff.supplier} onChange={(e) => set("supplier", e.target.value)} />
            </Field>
            <Field label="Customer">
              <input className={inputClass} value={signoff.customer} onChange={(e) => set("customer", e.target.value)} />
            </Field>
            <Field label="QA approver">
              <input className={inputClass} value={signoff.qaApprover} onChange={(e) => set("qaApprover", e.target.value)} />
            </Field>
            <Field label="Engineering approver">
              <input className={inputClass} value={signoff.engineeringApprover} onChange={(e) => set("engineeringApprover", e.target.value)} />
            </Field>
            <Field label="Remarks" hint="Printed under the approval blocks">
              <textarea rows={2} className={inputClass} value={signoff.remarks} onChange={(e) => set("remarks", e.target.value)} />
            </Field>
            <div className="flex flex-col justify-end gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={signoff.qaApproved} onChange={(e) => set("qaApproved", e.target.checked)} />
                QA approved
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={signoff.engineeringApproved}
                  onChange={(e) => set("engineeringApproved", e.target.checked)}
                />
                Engineering approved
              </label>
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                disabled={!signoff.qaApproved || !signoff.engineeringApproved}
                title={
                  !signoff.qaApproved || !signoff.engineeringApproved
                    ? "Both QA and engineering approval are required before the record can be marked validated."
                    : undefined
                }
                onClick={() => {
                  setValidation(
                    active.drawing.id,
                    "validated",
                    signoff.engineeringApprover,
                    signoff.remarks || "Validated from the report page.",
                  );
                  setMessage("Record marked as engineering validated.");
                }}
              >
                Mark record as engineering validated
              </Button>
            </div>
          </div>
        </Card>
      )}

      {active.report ? (
        <ReportDocument record={active} settings={settings} />
      ) : (
        <EmptyState
          title="Report not generated yet"
          description='Fill in the header fields above and press "Generate Casting Analysis Report" to build the document. Use Print / Save as PDF to export it.'
        />
      )}
    </div>
  );
}
