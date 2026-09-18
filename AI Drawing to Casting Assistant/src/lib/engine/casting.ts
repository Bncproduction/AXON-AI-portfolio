/**
 * Casting concept stage: turns extracted drawing data into a raw-casting
 * configuration (envelope, allowance, draft, parting line, cores) plus the
 * geometry model used by the comparison view.
 */

import type { AppSettings, CastingConcept, CastingZone, DrawingAnalysis, Provenance } from "@/lib/types";
import type { SampleProfile } from "@/lib/samples";
import { buildRenderModel } from "./geometry";
import { fieldValue, hasValue } from "./analysis";

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/** Parses "3 mm on machined faces (note 4)" -> 3. Returns null if absent. */
export function parseAllowance(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*mm/i);
  return m ? Number(m[1]) : null;
}

/** ISO 8062 style baseline allowance by envelope size and alloy family. */
function baselineAllowance(profile: SampleProfile, settings: AppSettings): number {
  const maxDim = Math.max(profile.envelope.length, profile.envelope.width, profile.envelope.height);
  const sizeBand = maxDim <= 100 ? 1.5 : maxDim <= 250 ? 2.5 : maxDim <= 400 ? 3.5 : 5;
  const alloyFactor =
    profile.hints.alloyFamily === "aluminium" ? 0.7 : profile.hints.alloyFamily === "steel" ? 1.15 : 1;
  const precisionFactor = profile.hints.dimensionalClass === "high-precision" ? 1.1 : 1;
  return round(Math.max(settings.defaultAllowance.general, sizeBand * alloyFactor * precisionFactor), 1);
}

function baselineDraft(profile: SampleProfile, settings: AppSettings): number {
  if (profile.draftStatedDeg != null) return profile.draftStatedDeg;
  switch (profile.hints.alloyFamily) {
    case "aluminium":
      return profile.hints.wallThicknessClass === "thin" ? 2 : 1.5;
    case "steel":
      return 2;
    case "ductile-iron":
      return 1.5;
    default:
      return settings.defaultDraftAngleDeg;
  }
}

const PARTING_LINE_BY_ARCHETYPE: Record<SampleProfile["archetype"], string> = {
  housing: "Horizontal parting through the shaft centreline — splits the volute at its widest section and keeps both bore halves in cope and drag.",
  "flanged-cover": "Flat parting on the back face of the flange — the whole hub draws from the cope, the flange from the drag.",
  bracket: "Stepped parting following the top of the web — avoids a cored undercut at the slot boss.",
  impeller: "Parting at the mid-height of the shroud — vane passages formed by a ceramic core assembly.",
};

const CORE_BY_ARCHETYPE: Record<SampleProfile["archetype"], { text: string; count: number }> = {
  housing: { text: "2 cores: volute passage core (chaplet-supported at the discharge end) and bearing bore core.", count: 2 },
  "flanged-cover": { text: "1 core: central seal bore, cast Ø6 mm under finish size.", count: 1 },
  bracket: { text: "1 core: pivot bore. Adjustment slot to be machined from solid — coring it would create an undercut.", count: 1 },
  impeller: { text: "3+ cores: shaft bore core plus a 6-segment ceramic vane-passage core assembly.", count: 3 },
};

export function generateCasting(
  profile: SampleProfile,
  analysis: DrawingAnalysis,
  settings: AppSettings,
): CastingConcept {
  const statedAllowance = hasValue(analysis, "machiningAllowance")
    ? parseAllowance(fieldValue(analysis, "machiningAllowance"))
    : null;

  const general = statedAllowance ?? baselineAllowance(profile, settings);
  const criticalFaces = round(general + 0.5, 1);
  const bores = round(Math.max(settings.defaultAllowance.bores, general * 0.8), 1);
  const draft = baselineDraft(profile, settings);

  const machinedEnvelope = { ...profile.envelope };
  const envelope = {
    length: round(profile.envelope.length + general * 2, 1),
    width: round(profile.envelope.width + general * 2, 1),
    height: round(profile.envelope.height + general * 2, 1),
  };

  // Cast volume ~= finished volume + material removed from the machined skin.
  const skinAreaCm2 = (2 * (profile.envelope.length * profile.envelope.width +
    profile.envelope.length * profile.envelope.height +
    profile.envelope.width * profile.envelope.height)) / 100;
  // Only a fraction of the envelope surface is actually machined.
  const machinedFraction = profile.archetype === "bracket" ? 0.28 : 0.42;
  const removedCm3 = skinAreaCm2 * (general / 10) * machinedFraction;
  const finishWeight = round((profile.finishVolumeCm3 * profile.density) / 1000, 2);
  const castWeight = round(((profile.finishVolumeCm3 + removedCm3) * profile.density) / 1000, 2);
  const removalPct = round(((castWeight - finishWeight) / castWeight) * 100, 1);

  const materialProvenance: Provenance = hasValue(analysis, "castingMaterial") ? "drawing" : "ai";
  const castingMaterial = hasValue(analysis, "castingMaterial")
    ? fieldValue(analysis, "castingMaterial")
    : `${fieldValue(analysis, "material")} — casting-grade equivalent proposed by AI, not stated on the drawing`;

  const machinedAreas = analysis.holes
    .filter((h) => h.machined)
    .map((h) => `${h.quantity} x ${h.description} (${h.diameter})`);
  analysis.criticalDimensions
    .filter((d) => d.inspectionCritical)
    .forEach((d) => machinedAreas.push(`${d.feature} ${d.nominal} ${d.tolerance}`));

  const asCastAreas = [
    "External body / outer profile between machined pads",
    ...analysis.holes.filter((h) => h.cored && !h.machined).map((h) => `${h.description} — cored, left as-cast`),
    "Fillets and blend radii not called out for machining",
  ];

  const criticalAreas = analysis.criticalDimensions
    .filter((d) => d.inspectionCritical)
    .map((d) => `${d.feature} — ${d.nominal} ${d.tolerance}${d.datum ? ` to datum ${d.datum}` : ""}`);

  const draftAreas = [
    `All vertical as-cast walls — ${draft}° minimum`,
    `Internal cored surfaces — ${round(draft + 0.5, 1)}° minimum (higher draft needed for core withdrawal)`,
    "Bosses and ribs perpendicular to the parting plane",
  ];

  const zones: CastingZone[] = [
    { id: "z1", label: "Machined surfaces", kind: "machined", note: `Material removed: ${general} mm general, ${criticalFaces} mm on critical faces.` },
    { id: "z2", label: "As-cast surfaces", kind: "as-cast", note: "Left at foundry finish; only fettling and blasting applied." },
    { id: "z3", label: "Critical dimensional areas", kind: "critical", note: `${criticalAreas.length} dimensions drive fit and function.` },
    { id: "z4", label: "Inspection areas", kind: "inspection", note: "Regions carrying NDT or layout inspection requirements." },
    { id: "z5", label: "Core locations", kind: "core", note: CORE_BY_ARCHETYPE[profile.archetype].text },
    { id: "z6", label: "Draft direction", kind: "draft", note: `Draw direction normal to the parting plane, ${draft}° applied.` },
  ];

  return {
    id: `cc-${analysis.drawingId}`,
    drawingId: analysis.drawingId,
    generatedAt: new Date().toISOString(),
    castingPartName: `${fieldValue(analysis, "partName")} — Raw Casting`,
    castingPartNumber: `${fieldValue(analysis, "partNumber")}-RC`,
    castingMaterial,
    materialProvenance,
    envelope,
    machinedEnvelope,
    machiningAllowanceMm: { general, criticalFaces, bores },
    draftAngleDeg: draft,
    partingLine: PARTING_LINE_BY_ARCHETYPE[profile.archetype],
    coreRequirement: CORE_BY_ARCHETYPE[profile.archetype].text,
    coreCount: CORE_BY_ARCHETYPE[profile.archetype].count,
    criticalAreas,
    draftAreas,
    machinedAreas,
    asCastAreas,
    importantFeatures: [
      `Overall raw envelope ${envelope.length} x ${envelope.width} x ${envelope.height} mm`,
      `Nominal wall ${profile.nominalWallMm} mm (min ${profile.minWallMm} mm, max ${profile.maxWallMm} mm)`,
      `Section thickness ratio ${profile.sectionRatio}:1 — drives feeding strategy`,
      `${analysis.datums.length} datum features must be established from as-cast references on the first operation`,
    ],
    estimatedCastWeightKg: castWeight,
    estimatedFinishWeightKg: finishWeight,
    machiningRemovalPct: removalPct,
    zones,
    render: buildRenderModel({
      profile,
      allowanceGeneral: general,
      allowanceBores: bores,
      draftDeg: draft,
    }),
  };
}
