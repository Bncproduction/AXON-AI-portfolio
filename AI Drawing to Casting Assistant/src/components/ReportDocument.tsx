"use client";

/**
 * Printable casting analysis report.
 *
 * Rendered as a styled document and printed through the browser
 * (window.print → "Save as PDF"), which keeps the app dependency-free and
 * preserves selectable text and vector line work in the output.
 */

import type { AppSettings, WorkflowRecord } from "@/lib/types";
import { fieldValue } from "@/lib/engine";
import { profileById } from "@/lib/samples";
import { TechnicalView, ViewLegend } from "./TechnicalView";
import { DrawingPreview } from "./DrawingPreview";
import { TableShell, Td, Th } from "./ui";

function Section({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  return (
    <section className="print-block mt-8 first:mt-0">
      <h2 className="mb-3 border-b-2 border-industrial-700 pb-1 text-sm font-bold uppercase tracking-wide text-industrial-900">
        {no}. {title}
      </h2>
      {children}
    </section>
  );
}

function KV({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex gap-2 border-b border-dotted border-industrial-200 pb-1">
          <dt className="w-52 shrink-0 font-semibold text-industrial-600">{k}</dt>
          <dd className="text-industrial-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ReportDocument({ record, settings }: { record: WorkflowRecord; settings: AppSettings }) {
  const { analysis, casting, feasibility, defects, recommendation, inspection, report } = record;
  if (!analysis || !casting || !report) return null;
  const profile = profileById(record.drawing.sampleProfileId);
  const s = report.signoff;

  return (
    <article className="mx-auto max-w-[1100px] bg-white p-8 text-industrial-900 shadow-sm print:p-0 print:shadow-none">
      {/* Title block */}
      <header className="border-2 border-industrial-800">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-industrial-800 bg-industrial-50 px-5 py-3">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wide">Casting Analysis Report</h1>
            <p className="text-xs text-industrial-600">{settings.organisation}</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-mono text-sm font-bold">{report.reportNumber}</p>
            <p className="text-industrial-600">Generated {new Date(report.generatedAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-5 py-3 text-[12px] sm:grid-cols-4">
          <TitleCell label="Part number" value={fieldValue(analysis, "partNumber")} />
          <TitleCell label="Drawing number" value={fieldValue(analysis, "drawingNumber")} />
          <TitleCell label="Drawing revision" value={fieldValue(analysis, "revision")} />
          <TitleCell label="Date" value={s.date} />
          <TitleCell label="Prepared by" value={s.preparedBy} />
          <TitleCell label="Supplier" value={s.supplier} />
          <TitleCell label="Customer" value={s.customer} />
          <TitleCell
            label="Validation status"
            value={
              record.validation.status === "validated"
                ? "Engineering validated"
                : record.validation.status === "rejected"
                  ? "Rejected — rework required"
                  : "Pending engineering validation"
            }
          />
        </div>
      </header>

      <p className="mt-4 border border-amber-400 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900">
        ⚠ This report contains AI-generated engineering proposals derived from the uploaded drawing. The casting
        concept, allowances, draft, parting line, process selection, defect predictions and any inspection content not
        taken directly from the drawing are marked as AI derived. AI-Generated Concept – Engineering Validation
        Required. Nothing in this document is an approved manufacturing instruction until it is signed off below.
      </p>

      <Section no={1} title="Drawing information">
        <KV
          items={[
            ["Part name", fieldValue(analysis, "partName")],
            ["Part number", fieldValue(analysis, "partNumber")],
            ["Drawing number", fieldValue(analysis, "drawingNumber")],
            ["Revision", fieldValue(analysis, "revision")],
            ["File", <span key="f" className="font-mono text-[12px]">{record.drawing.fileName}</span>],
            ["Uploaded", new Date(record.drawing.uploadedAt).toLocaleString()],
            ["Analysed", new Date(analysis.analyzedAt).toLocaleString()],
            ["Extraction engine", <span key="e" className="font-mono text-[11px]">{analysis.engineVersion}</span>],
          ]}
        />
      </Section>

      <Section no={2} title="Uploaded drawing preview">
        <div className="h-[380px]">
          <DrawingPreview record={record} compact />
        </div>
      </Section>

      <Section no={3} title="Extracted drawing parameters">
        <TableShell>
          <thead>
            <tr>
              <Th className="w-[240px]">Parameter</Th>
              <Th>Extracted value</Th>
              <Th className="w-[130px]">Source</Th>
            </tr>
          </thead>
          <tbody>
            {analysis.fields.map((f) => (
              <tr key={f.key}>
                <Td className="font-medium text-industrial-700">{f.label}</Td>
                <Td>{f.value}</Td>
                <Td className="text-xs uppercase text-industrial-600">{f.provenance}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>

        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-industrial-600">Critical dimensions</h3>
        <TableShell>
          <thead>
            <tr>
              <Th>Feature</Th>
              <Th className="w-[120px]">Nominal</Th>
              <Th className="w-[160px]">Tolerance</Th>
              <Th className="w-[80px]">Datum</Th>
            </tr>
          </thead>
          <tbody>
            {analysis.criticalDimensions.map((d) => (
              <tr key={d.id}>
                <Td>{d.feature}</Td>
                <Td className="font-mono">{d.nominal}</Td>
                <Td className="font-mono">{d.tolerance}</Td>
                <Td className="font-mono">{d.datum ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>

        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-industrial-600">Special notes from the drawing</h3>
        <ol className="list-decimal space-y-1 pl-5 text-[13px]">
          {analysis.specialNotes.map((n) => (
            <li key={n.id}>{n.text}</li>
          ))}
        </ol>

        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-industrial-600">Quality requirements from the drawing</h3>
        <ul className="list-disc space-y-1 pl-5 text-[13px]">
          {profile.qualityRequirements.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>

        {analysis.missingFields.length > 0 && (
          <div className="mt-4 border border-slate-300 bg-slate-50 px-3 py-2 text-[12px]">
            <p className="font-semibold uppercase tracking-wide text-slate-600">Information Not Available in Drawing.</p>
            <p className="mt-1 text-slate-600">{analysis.missingFields.join(" · ")}</p>
          </div>
        )}
      </Section>

      <Section no={4} title="Proposed casting information">
        <KV
          items={[
            ["Casting part name", casting.castingPartName],
            ["Casting part number", casting.castingPartNumber],
            ["Casting material", casting.castingMaterial],
            ["Raw casting envelope", `${casting.envelope.length} x ${casting.envelope.width} x ${casting.envelope.height} mm`],
            ["Finished envelope", `${casting.machinedEnvelope.length} x ${casting.machinedEnvelope.width} x ${casting.machinedEnvelope.height} mm`],
            ["Approximate cast weight", `${casting.estimatedCastWeightKg} kg`],
            ["Finished weight", `${casting.estimatedFinishWeightKg} kg`],
            ["Draft angle", `${casting.draftAngleDeg}° external / ${casting.draftAngleDeg + 0.5}° cored`],
            ["Parting line", casting.partingLine],
            ["Core requirement", casting.coreRequirement],
          ]}
        />
      </Section>

      <Section no={5} title="Drawing vs casting comparison">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-[320px] rounded border border-industrial-200 p-2">
            <TechnicalView model={casting.render} mode="drawing" title="Final component" className="h-full" />
          </div>
          <div className="h-[320px] rounded border border-amber-300 p-2">
            <TechnicalView model={casting.render} mode="overlay" title="Proposed casting (finished contour overlaid)" className="h-full" />
          </div>
        </div>
        <div className="mt-3">
          <ViewLegend mode="casting" />
        </div>
      </Section>

      <Section no={6} title="Machining allowance">
        <KV
          items={[
            ["General allowance", `${casting.machiningAllowanceMm.general} mm`],
            ["Critical / datum faces", `${casting.machiningAllowanceMm.criticalFaces} mm`],
            ["Bores", `${casting.machiningAllowanceMm.bores} mm`],
            ["Material removed", `${casting.machiningRemovalPct}% of cast mass (${(casting.estimatedCastWeightKg - casting.estimatedFinishWeightKg).toFixed(2)} kg)`],
          ]}
        />
        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-industrial-600">Machined areas</h3>
        <ul className="list-disc space-y-0.5 pl-5 text-[13px]">
          {casting.machinedAreas.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-industrial-600">As-cast areas</h3>
        <ul className="list-disc space-y-0.5 pl-5 text-[13px]">
          {casting.asCastAreas.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </Section>

      {feasibility && (
        <Section no={7} title="Casting feasibility analysis">
          <p className="mb-2 text-[12px] font-semibold text-amber-800">AI Recommendation – Engineering Validation Required.</p>
          <TableShell>
            <thead>
              <tr>
                <Th className="w-[80px]">Severity</Th>
                <Th className="w-[180px]">Issue</Th>
                <Th className="w-[160px]">Location</Th>
                <Th>Reason</Th>
                <Th>Recommended action</Th>
              </tr>
            </thead>
            <tbody>
              {feasibility.map((i) => (
                <tr key={i.id}>
                  <Td className="uppercase">{i.severity}</Td>
                  <Td>{i.issue}</Td>
                  <Td>{i.location}</Td>
                  <Td>{i.reason}</Td>
                  <Td>{i.recommendedAction}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Section>
      )}

      {defects && (
        <Section no={8} title="Potential defect analysis">
          <p className="mb-2 text-[12px] font-semibold text-amber-800">
            AI-based engineering prediction — requires validation by a casting / process engineer.
          </p>
          <TableShell>
            <thead>
              <tr>
                <Th className="w-[160px]">Defect</Th>
                <Th className="w-[90px]">Likelihood</Th>
                <Th className="w-[170px]">Risk area</Th>
                <Th>Possible cause</Th>
                <Th>Preventive action</Th>
                <Th className="w-[190px]">Inspection method</Th>
              </tr>
            </thead>
            <tbody>
              {defects.map((d) => (
                <tr key={d.id}>
                  <Td>{d.defect}</Td>
                  <Td className="uppercase">{d.likelihood}</Td>
                  <Td>{d.riskArea}</Td>
                  <Td>{d.possibleCause}</Td>
                  <Td>{d.preventiveAction}</Td>
                  <Td>{d.inspectionMethod}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Section>
      )}

      {inspection && (
        <Section no={9} title="Casting inspection standard">
          <p className="mb-2 text-[12px]">
            <span className="font-semibold">Standard no.:</span> <span className="font-mono">{inspection.standardNumber}</span> ·{" "}
            <span className="font-semibold">Revision:</span> {inspection.revision}
          </p>
          <TableShell>
            <thead>
              <tr>
                <Th className="w-[120px]">Group</Th>
                <Th className="w-[170px]">Check parameter</Th>
                <Th className="w-[190px]">Specification</Th>
                <Th className="w-[120px]">Tolerance</Th>
                <Th className="w-[160px]">Method</Th>
                <Th className="w-[150px]">Instrument</Th>
                <Th className="w-[120px]">Frequency</Th>
                <Th>Acceptance criteria</Th>
              </tr>
            </thead>
            <tbody>
              {inspection.checks.map((c) => (
                <tr key={c.id}>
                  <Td className="text-xs">{c.group}</Td>
                  <Td>{c.checkParameter}</Td>
                  <Td>{c.specification}</Td>
                  <Td className="font-mono text-[11px]">{c.tolerance}</Td>
                  <Td>{c.inspectionMethod}</Td>
                  <Td>{c.instrument}</Td>
                  <Td>{c.frequency}</Td>
                  <Td>{c.acceptanceCriteria}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Section>
      )}

      {recommendation && (
        <Section no={10} title="AI recommendations">
          <KV
            items={[
              [
                "Recommended casting process",
                recommendation.insufficientInformation ? "Information Not Available in Drawing." : recommendation.process,
              ],
              ["Recommended material", recommendation.recommendedMaterial],
              ["Recommended casting allowance", recommendation.recommendedAllowanceMm],
              ["Recommended draft angle", recommendation.recommendedDraftAngleDeg],
              ["Core requirement", recommendation.coreRequirement],
              ["Approximate casting weight", `${recommendation.approximateCastWeightKg} kg`],
              ["Estimated machining requirement", recommendation.estimatedMachiningRequirement],
            ]}
          />
          <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-industrial-600">Rationale</h3>
          <ul className="list-disc space-y-1 pl-5 text-[13px]">
            {recommendation.rationale.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-industrial-600">Critical quality checkpoints</h3>
          <ul className="list-disc space-y-1 pl-5 text-[13px]">
            {recommendation.criticalQualityCheckpoints.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section no={11} title="Engineering validation">
        <p className="mb-3 text-[13px]">
          The content of this report is an AI-generated engineering proposal. It becomes usable manufacturing data only
          once the sections below are signed by the authorised approvers.
        </p>
        <div className="grid grid-cols-2 gap-6">
          <SignBlock role="QA approval" name={s.qaApprover} approved={s.qaApproved} />
          <SignBlock role="Engineering approval" name={s.engineeringApprover} approved={s.engineeringApproved} />
        </div>
        {s.remarks && (
          <div className="mt-4 border border-industrial-200 bg-industrial-50 px-3 py-2 text-[13px]">
            <span className="font-semibold">Remarks: </span>
            {s.remarks}
          </div>
        )}
        {record.validation.status === "validated" && (
          <p className="mt-3 border border-emerald-300 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
            Engineering validated by {record.validation.validatedBy} on{" "}
            {record.validation.validatedAt ? new Date(record.validation.validatedAt).toLocaleString() : "—"}.
            {record.validation.note ? ` ${record.validation.note}` : ""}
          </p>
        )}
      </Section>
    </article>
  );
}

function TitleCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-industrial-500">{label}</p>
      <p className="font-medium text-industrial-900">{value}</p>
    </div>
  );
}

function SignBlock({ role, name, approved }: { role: string; name: string; approved: boolean }) {
  return (
    <div className="border border-industrial-300">
      <p className="border-b border-industrial-300 bg-industrial-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-industrial-600">
        {role}
      </p>
      <div className="space-y-3 px-3 py-3 text-[13px]">
        <p>
          <span className="text-industrial-500">Name: </span>
          {name}
        </p>
        <p>
          <span className="text-industrial-500">Status: </span>
          {approved ? (
            <span className="font-semibold text-emerald-700">Approved</span>
          ) : (
            <span className="font-semibold text-amber-700">Pending</span>
          )}
        </p>
        <p className="pt-6 text-industrial-500">Signature / date: ______________________________</p>
      </div>
    </div>
  );
}
