"use client";

import { useMemo, useState } from "react";
import { buildRenderModel } from "@/lib/engine";
import { profileById } from "@/lib/samples";
import type {
  CastingConcept,
  DefectRisk,
  FeasibilityIssue,
  InspectionStandard,
  ProcessRecommendation,
  WorkflowRecord,
} from "@/lib/types";
import { AiNotice, Card, ConfidenceBar, ProvenanceBadge, SeverityBadge, StatTile, TableShell, Td, Th, cx } from "./ui";
import { DEFAULT_LAYERS, TechnicalView, ViewLegend, type ViewLayers, type ViewMode } from "./TechnicalView";
import { DrawingPreview } from "./DrawingPreview";

/* ------------------------------------------------------------------ */
/* Casting concept summary                                             */
/* ------------------------------------------------------------------ */

export function CastingSummary({ casting }: { casting: CastingConcept }) {
  return (
    <div className="space-y-4">
      <AiNotice kind="concept" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Approx. cast weight" value={`${casting.estimatedCastWeightKg} kg`} hint="AI estimate from the section model" />
        <StatTile label="Finished weight" value={`${casting.estimatedFinishWeightKg} kg`} hint="From the extracted geometry" />
        <StatTile label="Material removed" value={`${casting.machiningRemovalPct}%`} tone={casting.machiningRemovalPct > 25 ? "warn" : "default"} hint="Of cast mass" />
        <StatTile label="Cores required" value={casting.coreCount} hint={`Draft ${casting.draftAngleDeg}°`} />
      </div>

      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <Row label="Casting part name" value={casting.castingPartName} />
        <Row label="Casting part number" value={casting.castingPartNumber} mono />
        <Row
          label="Casting material"
          value={
            <span className="flex flex-wrap items-center gap-2">
              {casting.castingMaterial}
              <ProvenanceBadge provenance={casting.materialProvenance} />
            </span>
          }
        />
        <Row
          label="Approximate casting dimensions"
          value={`${casting.envelope.length} x ${casting.envelope.width} x ${casting.envelope.height} mm (finished ${casting.machinedEnvelope.length} x ${casting.machinedEnvelope.width} x ${casting.machinedEnvelope.height} mm)`}
          mono
        />
        <Row
          label="Machining allowance"
          value={`${casting.machiningAllowanceMm.general} mm general · ${casting.machiningAllowanceMm.criticalFaces} mm critical faces · ${casting.machiningAllowanceMm.bores} mm bores`}
        />
        <Row label="Draft angle" value={`${casting.draftAngleDeg}° external · ${casting.draftAngleDeg + 0.5}° cored surfaces`} />
        <Row label="Potential parting line" value={casting.partingLine} className="sm:col-span-2" />
        <Row label="Core requirement" value={casting.coreRequirement} className="sm:col-span-2" />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListBlock title="Critical casting areas" items={casting.criticalAreas} tone="critical" />
        <ListBlock title="Required draft areas" items={casting.draftAreas} tone="draft" />
        <ListBlock title="Machining areas" items={casting.machinedAreas} tone="machined" />
        <ListBlock title="As-cast areas" items={casting.asCastAreas} tone="ascast" />
      </div>

      <ListBlock title="Important dimensional features" items={casting.importantFeatures} tone="plain" />
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-industrial-500">{label}</dt>
      <dd className={cx("mt-0.5 text-industrial-900", mono && "font-mono text-[13px]")}>{value}</dd>
    </div>
  );
}

const TONE_STYLES = {
  critical: "border-red-200 bg-red-50/60",
  draft: "border-amber-200 bg-amber-50/60",
  machined: "border-blue-200 bg-blue-50/60",
  ascast: "border-orange-200 bg-orange-50/50",
  plain: "border-industrial-200 bg-industrial-50/60",
} as const;

function ListBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: keyof typeof TONE_STYLES;
}) {
  return (
    <div className={cx("rounded-md border px-3 py-2.5", TONE_STYLES[tone])}>
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-industrial-600">{title}</h4>
      {items.length ? (
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] text-industrial-800">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[13px] italic text-industrial-500">None identified.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drawing vs casting comparison                                       */
/* ------------------------------------------------------------------ */

const LAYER_LABELS: { key: keyof ViewLayers; label: string }[] = [
  { key: "machinedSurfaces", label: "Machined surfaces" },
  { key: "asCast", label: "Raw casting surfaces" },
  { key: "allowance", label: "Machining allowance" },
  { key: "critical", label: "Critical dimensions" },
  { key: "draft", label: "Draft direction" },
  { key: "partingLine", label: "Parting line" },
  { key: "cores", label: "Core locations" },
  { key: "datums", label: "Datum references" },
  { key: "dimensions", label: "Dimensions" },
];

const EXAGGERATION_OPTIONS = [1, 3, 6] as const;

export function ComparisonPanel({ record }: { record: WorkflowRecord }) {
  const [layers, setLayers] = useState<ViewLayers>(DEFAULT_LAYERS);
  const [mode, setMode] = useState<ViewMode>("casting");
  const [showUpload, setShowUpload] = useState(false);
  const [exaggeration, setExaggeration] = useState<number>(3);
  const casting = record.casting;

  // A 3 mm allowance on a 300 mm part is about 1 % of the view and reads as a
  // line. The allowance can be drawn at an exaggerated scale so the band is
  // legible; the view is labelled whenever it is not true scale.
  const model = useMemo(() => {
    if (!casting || exaggeration === 1) return casting?.render;
    const inflated = buildRenderModel({
      profile: profileById(record.drawing.sampleProfileId),
      allowanceGeneral: casting.machiningAllowanceMm.general * exaggeration,
      allowanceBores: casting.machiningAllowanceMm.bores * exaggeration,
      draftDeg: casting.draftAngleDeg,
    });
    // Keep the annotated values true to the real allowance — only the drawn
    // band is exaggerated, never the numbers.
    return {
      ...inflated,
      dimensions: inflated.dimensions.map((d) => ({
        ...d,
        text: casting.render.dimensions.find((t) => t.id === d.id)?.text ?? d.text,
      })),
    };
  }, [casting, exaggeration, record.drawing.sampleProfileId]);

  if (!casting || !model) return null;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-industrial-200 bg-industrial-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-industrial-500">Right view</span>
          {(["casting", "overlay", "drawing"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cx(
                "rounded px-2 py-1 text-xs capitalize",
                mode === m ? "bg-industrial-700 text-white" : "bg-white text-industrial-700 hover:bg-industrial-100",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-industrial-700">
          <input type="checkbox" checked={showUpload} onChange={(e) => setShowUpload(e.target.checked)} />
          Show uploaded file on the left
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-industrial-500">Allowance scale</span>
          {EXAGGERATION_OPTIONS.map((x) => (
            <button
              key={x}
              onClick={() => setExaggeration(x)}
              title={x === 1 ? "True scale" : `Machining allowance drawn ${x} times oversize for legibility`}
              className={cx(
                "rounded px-2 py-1 text-xs",
                exaggeration === x ? "bg-industrial-700 text-white" : "bg-white text-industrial-700 hover:bg-industrial-100",
              )}
            >
              {x === 1 ? "True scale" : `${x}×`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-industrial-500">Highlight</span>
          {LAYER_LABELS.map((l) => (
            <label key={l.key} className="flex items-center gap-1.5 text-xs text-industrial-700">
              <input
                type="checkbox"
                checked={layers[l.key]}
                onChange={(e) => setLayers((prev) => ({ ...prev, [l.key]: e.target.checked }))}
              />
              {l.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-industrial-200 bg-white p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-industrial-700">
            Left — Final component drawing
          </h3>
          {showUpload ? (
            <DrawingPreview record={record} compact />
          ) : (
            <TechnicalView model={model} mode="drawing" layers={layers} title="Finished machined component" className="min-h-[380px]" />
          )}
        </div>
        <div className="rounded-lg border border-amber-300 bg-white p-3">
          <h3 className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-industrial-700">
            Right — Proposed casting
            <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-amber-800">
              AI-Generated Concept – Engineering Validation Required.
            </span>
          </h3>
          <TechnicalView
            model={model}
            mode={mode}
            layers={layers}
            title={mode === "overlay" ? "Casting with finished contour overlaid" : "Proposed raw casting"}
            className="min-h-[380px]"
          />
        </div>
      </div>

      {exaggeration !== 1 && (
        <p className="rounded border border-industrial-300 bg-industrial-50 px-3 py-1.5 text-[11px] text-industrial-700">
          Machining allowance is drawn <span className="font-semibold">{exaggeration}× oversize</span> so the band is
          legible. The allowance values, dimensions and weights stated everywhere else are the true{" "}
          {casting.machiningAllowanceMm.general} mm / {casting.machiningAllowanceMm.criticalFaces} mm /{" "}
          {casting.machiningAllowanceMm.bores} mm figures. Switch to &ldquo;True scale&rdquo; for a proportionally correct view.
        </p>
      )}

      <ViewLegend mode="casting" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {casting.zones.map((z) => (
          <div key={z.id} className="rounded-md border border-industrial-200 bg-white px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-industrial-600">{z.label}</p>
            <p className="mt-1 text-xs text-industrial-700">{z.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feasibility                                                         */
/* ------------------------------------------------------------------ */

export function FeasibilityPanel({ issues }: { issues: FeasibilityIssue[] }) {
  const counts = {
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
  };
  return (
    <div className="space-y-4">
      <AiNotice />
      <div className="flex flex-wrap gap-3">
        <StatTile label="High severity" value={counts.high} tone={counts.high ? "alert" : "good"} />
        <StatTile label="Medium severity" value={counts.medium} tone={counts.medium ? "warn" : "good"} />
        <StatTile label="Low severity" value={counts.low} />
      </div>
      <TableShell className="min-w-0">
        <thead>
          <tr>
            <Th className="w-[100px]">Severity</Th>
            <Th className="w-[210px]">Issue</Th>
            <Th className="w-[190px]">Location</Th>
            <Th>Reason</Th>
            <Th>Recommended action</Th>
            <Th className="w-[120px]">Confidence</Th>
          </tr>
        </thead>
        <tbody>
          {issues.map((i) => (
            <tr key={i.id} className="hover:bg-industrial-50/50">
              <Td><SeverityBadge severity={i.severity} /></Td>
              <Td>
                <span className="block text-[11px] uppercase tracking-wide text-industrial-500">{i.category}</span>
                <span className="font-medium text-industrial-900">{i.issue}</span>
              </Td>
              <Td className="text-industrial-700">{i.location}</Td>
              <Td className="text-industrial-700">{i.reason}</Td>
              <Td className="text-industrial-700">{i.recommendedAction}</Td>
              <Td><ConfidenceBar value={i.confidence} /></Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Defect prediction                                                   */
/* ------------------------------------------------------------------ */

export function DefectPanel({ defects }: { defects: DefectRisk[] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
        ⚠ AI-based engineering prediction from drawing geometry only. Requires validation by a casting / process
        engineer before it is used to set process parameters or acceptance limits.
      </div>
      <TableShell>
        <thead>
          <tr>
            <Th className="w-[180px]">Predicted defect</Th>
            <Th className="w-[110px]">Likelihood</Th>
            <Th className="w-[190px]">Risk area</Th>
            <Th>Possible cause</Th>
            <Th>Preventive action</Th>
            <Th className="w-[220px]">Inspection method</Th>
          </tr>
        </thead>
        <tbody>
          {defects.map((d) => (
            <tr key={d.id} className="hover:bg-industrial-50/50">
              <Td className="font-medium text-industrial-900">{d.defect}</Td>
              <Td><SeverityBadge severity={d.likelihood} /></Td>
              <Td className="text-industrial-700">{d.riskArea}</Td>
              <Td className="text-industrial-700">{d.possibleCause}</Td>
              <Td className="text-industrial-700">{d.preventiveAction}</Td>
              <Td className="text-industrial-700">{d.inspectionMethod}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Process recommendation                                              */
/* ------------------------------------------------------------------ */

export function RecommendationPanel({ recommendation }: { recommendation: ProcessRecommendation }) {
  return (
    <div className="space-y-4">
      <AiNotice />
      <div
        className={cx(
          "rounded-lg border px-4 py-3",
          recommendation.insufficientInformation ? "border-slate-300 bg-slate-50" : "border-industrial-300 bg-industrial-50",
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-industrial-500">Recommended casting process</p>
        <p className={cx("mt-1 text-2xl font-semibold", recommendation.insufficientInformation ? "text-slate-600" : "text-industrial-900")}>
          {recommendation.insufficientInformation ? "Information Not Available in Drawing." : recommendation.process}
        </p>
        {recommendation.insufficientInformation && (
          <p className="mt-1 text-sm text-slate-600">
            The AI has not selected a process because the drawing does not carry enough information to justify one.
          </p>
        )}
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-industrial-700">
          {recommendation.rationale.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-industrial-500">Recommendation confidence</span>
          <ConfidenceBar value={recommendation.confidence} />
        </div>
      </div>

      {recommendation.missingInputs.length > 0 && (
        <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Inputs not available from the drawing</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
            {recommendation.missingInputs.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <TableShell className="min-w-0">
        <thead>
          <tr>
            <Th className="w-[210px]">Candidate process</Th>
            <Th className="w-[150px]">Suitability</Th>
            <Th>Scoring rationale</Th>
          </tr>
        </thead>
        <tbody>
          {recommendation.alternatives.map((a) => (
            <tr key={a.process} className={cx("hover:bg-industrial-50/50", a.process === recommendation.process && "bg-emerald-50/50")}>
              <Td className="font-medium text-industrial-900">{a.process}</Td>
              <Td>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-industrial-200">
                    <span
                      className={cx("block h-full rounded-full", a.suitability >= 70 ? "bg-emerald-500" : a.suitability >= 50 ? "bg-amber-500" : "bg-red-400")}
                      style={{ width: `${a.suitability}%` }}
                    />
                  </span>
                  <span className="font-mono text-[11px] text-industrial-600">{a.suitability}/100</span>
                </span>
              </Td>
              <Td className="text-industrial-700">{a.rationale}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <Row label="Recommended material" value={recommendation.recommendedMaterial} />
        <Row label="Recommended casting allowance" value={recommendation.recommendedAllowanceMm} />
        <Row label="Recommended draft angle" value={recommendation.recommendedDraftAngleDeg} />
        <Row label="Core requirement" value={recommendation.coreRequirement} />
        <Row label="Approximate casting weight" value={`${recommendation.approximateCastWeightKg} kg`} mono />
        <Row label="Estimated machining requirement" value={recommendation.estimatedMachiningRequirement} />
      </dl>

      <ListBlock title="Critical quality checkpoints" items={recommendation.criticalQualityCheckpoints} tone="plain" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inspection standard                                                 */
/* ------------------------------------------------------------------ */

export function InspectionPanel({ standard }: { standard: InspectionStandard }) {
  const groups = Array.from(new Set(standard.checks.map((c) => c.group)));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md border border-industrial-200 bg-industrial-50 px-3 py-2 text-xs text-industrial-700">
        <span><span className="font-semibold">Standard no.:</span> <span className="font-mono">{standard.standardNumber}</span></span>
        <span><span className="font-semibold">Revision:</span> {standard.revision}</span>
        <span><span className="font-semibold">Generated:</span> {new Date(standard.generatedAt).toLocaleString()}</span>
        <span><span className="font-semibold">Checks:</span> {standard.checks.length}</span>
      </div>
      {groups.map((g) => (
        <div key={g}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-industrial-500">{g}</h3>
          <TableShell>
            <thead>
              <tr>
                <Th className="w-[200px]">Check parameter</Th>
                <Th className="w-[230px]">Specification</Th>
                <Th className="w-[150px]">Tolerance</Th>
                <Th className="w-[200px]">Inspection method</Th>
                <Th className="w-[180px]">Instrument</Th>
                <Th className="w-[150px]">Frequency</Th>
                <Th className="w-[230px]">Acceptance criteria</Th>
                <Th className="w-[130px]">Source</Th>
              </tr>
            </thead>
            <tbody>
              {standard.checks
                .filter((c) => c.group === g)
                .map((c) => (
                  <tr key={c.id} className="hover:bg-industrial-50/50">
                    <Td className="font-medium text-industrial-900">{c.checkParameter}</Td>
                    <Td className="text-industrial-700">{c.specification}</Td>
                    <Td className="font-mono text-[12px] text-industrial-700">{c.tolerance}</Td>
                    <Td className="text-industrial-700">{c.inspectionMethod}</Td>
                    <Td className="text-industrial-700">{c.instrument}</Td>
                    <Td className="text-industrial-700">{c.frequency}</Td>
                    <Td className="text-industrial-700">{c.acceptanceCriteria}</Td>
                    <Td>
                      <ProvenanceBadge provenance={c.provenance} />
                      {c.reference && <span className="mt-1 block text-[10px] text-industrial-500">{c.reference}</span>}
                    </Td>
                  </tr>
                ))}
            </tbody>
          </TableShell>
        </div>
      ))}
    </div>
  );
}

export { Card };
