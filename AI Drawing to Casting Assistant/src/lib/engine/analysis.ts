/**
 * Drawing extraction stage.
 *
 * Turns a matched `SampleProfile` into a `DrawingAnalysis` with per-field
 * provenance. Anything the profile leaves blank becomes an explicit
 * "Information Not Available in Drawing." entry rather than a guess.
 */

import {
  NOT_IN_DRAWING,
  type DrawingAnalysis,
  type ExtractedField,
  type FieldGroup,
  type Provenance,
} from "@/lib/types";
import type { SampleProfile } from "@/lib/samples";

export const ENGINE_VERSION = "dca-engine 1.4.0 (demo extraction)";

interface FieldSeed {
  key: string;
  label: string;
  value: string;
  group: FieldGroup;
  confidence: number;
  basis: string;
  unit?: string;
}

function toField(seed: FieldSeed): ExtractedField {
  const empty = !seed.value || seed.value.trim() === "";
  const provenance: Provenance = empty ? "unavailable" : "drawing";
  return {
    key: seed.key,
    label: seed.label,
    value: empty ? NOT_IN_DRAWING : seed.value,
    provenance,
    confidence: empty ? undefined : seed.confidence,
    basis: empty ? "No corresponding callout found on the drawing." : seed.basis,
    unit: seed.unit,
    group: seed.group,
  };
}

export function analyseProfile(profile: SampleProfile, drawingId: string): DrawingAnalysis {
  const seeds: FieldSeed[] = [
    {
      key: "partName",
      label: "Part Name",
      value: profile.partName,
      group: "identification",
      confidence: 0.97,
      basis: "Title block — description field.",
    },
    {
      key: "partNumber",
      label: "Part Number",
      value: profile.partNumber,
      group: "identification",
      confidence: 0.98,
      basis: "Title block — part number field.",
    },
    {
      key: "drawingNumber",
      label: "Drawing Number",
      value: profile.drawingNumber,
      group: "identification",
      confidence: 0.98,
      basis: "Title block — drawing number field.",
    },
    {
      key: "revision",
      label: "Revision",
      value: profile.revision,
      group: "identification",
      confidence: 0.95,
      basis: "Revision block, latest row.",
    },
    {
      key: "material",
      label: "Material",
      value: profile.material,
      group: "material",
      confidence: 0.94,
      basis: "Title block — material field.",
    },
    {
      key: "castingMaterial",
      label: "Casting Material / Alloy Specification",
      value: profile.castingMaterial,
      group: "material",
      confidence: 0.88,
      basis: "Material note referencing the casting standard.",
    },
    {
      key: "overallSize",
      label: "Overall Size",
      value: profile.overallSize,
      group: "geometry",
      confidence: 0.92,
      basis: "Outermost dimensions across all views.",
      unit: "mm",
    },
    {
      key: "criticalDimensions",
      label: "Critical Dimensions",
      value: `${profile.criticalDimensions.filter((d) => d.inspectionCritical).length} dimensions flagged critical (see table)`,
      group: "geometry",
      confidence: 0.86,
      basis: "Dimensions carrying fit classes, tight limits or inspection balloons.",
    },
    {
      key: "tolerance",
      label: "Tolerance",
      value: profile.generalTolerance,
      group: "tolerance",
      confidence: 0.93,
      basis: "General tolerance note in the title block.",
    },
    {
      key: "gdt",
      label: "GD&T",
      value: profile.gdt.length ? `${profile.gdt.length} feature control frames (see table)` : "",
      group: "tolerance",
      confidence: 0.85,
      basis: "Feature control frames detected on the views.",
    },
    {
      key: "datums",
      label: "Datum References",
      value: profile.datums.length ? profile.datums.map((d) => d.id).join(", ") : "",
      group: "tolerance",
      confidence: 0.9,
      basis: "Datum feature symbols on the views.",
    },
    {
      key: "machiningAllowance",
      label: "Machining Allowance",
      value: profile.machiningAllowance,
      group: "process",
      confidence: 0.8,
      basis: "Machining allowance note.",
      unit: "mm",
    },
    {
      key: "surfaceFinish",
      label: "Surface Finish",
      value: profile.surfaceFinish,
      group: "process",
      confidence: 0.89,
      basis: "Surface texture symbols and general finish note.",
    },
    {
      key: "heatTreatment",
      label: "Heat Treatment",
      value: profile.heatTreatment,
      group: "process",
      confidence: 0.91,
      basis: "Heat treatment note.",
    },
    {
      key: "weight",
      label: "Weight",
      value: profile.weight,
      group: "geometry",
      confidence: 0.76,
      basis: "Mass field in the title block.",
      unit: "kg",
    },
    {
      key: "holes",
      label: "Hole Details",
      value: profile.holes.length ? `${profile.holes.length} hole groups (see table)` : "",
      group: "geometry",
      confidence: 0.87,
      basis: "Hole callouts and hole charts.",
    },
    {
      key: "threads",
      label: "Thread Details",
      value: profile.holes.filter((h) => h.thread).map((h) => h.thread).join("; "),
      group: "geometry",
      confidence: 0.88,
      basis: "Thread callouts on hole notes.",
    },
    {
      key: "specialNotes",
      label: "Special Notes",
      value: profile.notes.length ? `${profile.notes.length} notes captured (see notes panel)` : "",
      group: "quality",
      confidence: 0.84,
      basis: "General notes block.",
    },
    {
      key: "qualityRequirements",
      label: "Quality Inspection Requirements",
      value: profile.qualityRequirements.length
        ? `${profile.qualityRequirements.length} requirements captured (see notes panel)`
        : "",
      group: "quality",
      confidence: 0.82,
      basis: "Inspection / QA notes and referenced standards.",
    },
  ];

  const fields = seeds.map(toField);
  const missingFields = fields.filter((f) => f.provenance === "unavailable").map((f) => f.label);
  const scored = fields.filter((f) => typeof f.confidence === "number");
  const confidence = scored.length
    ? scored.reduce((sum, f) => sum + (f.confidence ?? 0), 0) / scored.length
    : 0;

  return {
    id: `an-${drawingId}`,
    drawingId,
    analyzedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    confidence: Math.round(confidence * 100) / 100,
    fields,
    holes: profile.holes.map((h, i) => ({
      id: `hole-${i + 1}`,
      description: h.description,
      diameter: h.diameter,
      depth: h.depth,
      quantity: h.quantity,
      machined: h.machined,
      cored: h.cored,
      thread: h.thread,
      provenance: "drawing" as Provenance,
    })),
    criticalDimensions: profile.criticalDimensions.map((d, i) => ({
      id: `cd-${i + 1}`,
      feature: d.feature,
      nominal: d.nominal,
      tolerance: d.tolerance,
      datum: d.datum,
      inspectionCritical: d.inspectionCritical,
      provenance: "drawing" as Provenance,
    })),
    gdt: profile.gdt.map((g, i) => ({
      id: `gdt-${i + 1}`,
      symbol: g.symbol,
      characteristic: g.characteristic,
      tolerance: g.tolerance,
      datumReference: g.datumReference,
      appliesTo: g.appliesTo,
      provenance: "drawing" as Provenance,
    })),
    datums: profile.datums.map((d) => ({ ...d, provenance: "drawing" as Provenance })),
    specialNotes: profile.notes.map((text, i) => ({
      id: `note-${i + 1}`,
      text,
      provenance: "drawing" as Provenance,
    })),
    missingFields,
  };
}

/** Reads a field value out of an analysis, honouring user edits. */
export function fieldValue(analysis: DrawingAnalysis | undefined, key: string): string {
  return analysis?.fields.find((f) => f.key === key)?.value ?? NOT_IN_DRAWING;
}

export function hasValue(analysis: DrawingAnalysis | undefined, key: string): boolean {
  const f = analysis?.fields.find((x) => x.key === key);
  return !!f && f.provenance !== "unavailable" && f.value !== NOT_IN_DRAWING;
}
