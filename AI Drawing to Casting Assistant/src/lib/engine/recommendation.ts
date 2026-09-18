/**
 * Casting process recommendation.
 *
 * Scores candidate processes against alloy, volume, wall thickness, precision
 * and size. If the drawing lacks the inputs a defensible choice needs, the
 * recommender returns `insufficientInformation` instead of guessing.
 */

import type { CastingConcept, CastingProcess, DrawingAnalysis, ProcessRecommendation } from "@/lib/types";
import type { SampleProfile } from "@/lib/samples";
import { hasValue } from "./analysis";

interface Candidate {
  process: CastingProcess;
  score: number;
  rationale: string;
}

/** Inputs a process choice cannot be made without. */
function missingInputs(profile: SampleProfile, analysis: DrawingAnalysis): string[] {
  const missing: string[] = [];
  if (!hasValue(analysis, "material")) missing.push("Material specification");
  if (!hasValue(analysis, "overallSize")) missing.push("Overall size");
  if (!hasValue(analysis, "tolerance")) missing.push("General tolerance class");
  if (profile.hints.annualVolume == null) missing.push("Annual production volume (not a drawing field — confirm with sales/planning)");
  return missing;
}

export function recommendProcess(
  profile: SampleProfile,
  analysis: DrawingAnalysis,
  casting: CastingConcept,
): ProcessRecommendation {
  const missing = missingInputs(profile, analysis);
  const volume = profile.hints.annualVolume ?? 0;
  const { alloyFamily, wallThicknessClass, dimensionalClass } = profile.hints;
  const maxDim = Math.max(casting.envelope.length, casting.envelope.width, casting.envelope.height);

  const candidates: Candidate[] = [];

  // Sand casting — the general-purpose baseline.
  {
    let s = 55;
    const why: string[] = [];
    if (volume < 5000) { s += 15; why.push("low to moderate annual volume suits reusable-pattern tooling"); }
    if (maxDim > 250) { s += 10; why.push("envelope is comfortably within sand-casting size capability"); }
    if (alloyFamily === "grey-iron" || alloyFamily === "ductile-iron" || alloyFamily === "steel") {
      s += 15;
      why.push("alloy pours well in green sand / no-bake");
    }
    if (dimensionalClass === "high-precision") { s -= 20; why.push("as-cast tolerance grade is coarse for the precision called for"); }
    if (wallThicknessClass === "thin") { s -= 12; why.push("thin sections are harder to fill in sand"); }
    if (casting.coreCount >= 2) { s += 8; why.push("multi-core assemblies are straightforward in sand"); }
    candidates.push({ process: "Sand Casting", score: s, rationale: why.join("; ") });
  }

  // Gravity die casting.
  {
    let s = 40;
    const why: string[] = [];
    if (alloyFamily === "aluminium" || alloyFamily === "bronze") { s += 25; why.push("alloy is well suited to permanent-mould tooling"); }
    else { s -= 25; why.push("ferrous alloys are not normally gravity die cast"); }
    if (volume >= 2000 && volume <= 60000) { s += 18; why.push("volume amortises permanent-mould tooling"); }
    if (maxDim <= 400) { s += 8; why.push("size within typical die capability"); }
    if (dimensionalClass !== "general") { s += 10; why.push("gives a finer as-cast tolerance than sand"); }
    if (casting.coreCount >= 3) { s -= 12; why.push("complex core assembly is awkward in a permanent mould"); }
    candidates.push({ process: "Gravity Die Casting", score: s, rationale: why.join("; ") });
  }

  // Pressure die casting.
  {
    let s = 30;
    const why: string[] = [];
    if (alloyFamily === "aluminium") { s += 22; why.push("alloy family is standard for HPDC"); }
    else { s -= 30; why.push("alloy is outside normal HPDC practice"); }
    if (volume >= 20000) { s += 25; why.push("volume justifies hard tooling"); }
    else { s -= 20; why.push("volume does not amortise HPDC tooling cost"); }
    if (wallThicknessClass === "thin") { s += 15; why.push("thin walls fill readily under pressure"); }
    if (profile.hints.pressureTight) { s -= 15; why.push("entrapped-gas porosity is a risk for pressure-tight duty"); }
    if (casting.coreCount >= 2) { s -= 15; why.push("sand cores cannot be used; features must be formed by slides"); }
    candidates.push({ process: "Pressure Die Casting", score: s, rationale: why.join("; ") });
  }

  // Investment casting.
  {
    let s = 35;
    const why: string[] = [];
    if (dimensionalClass === "high-precision") { s += 25; why.push("delivers the tightest as-cast tolerance and surface finish"); }
    if (alloyFamily === "steel") { s += 18; why.push("stainless and alloy steels are routine in investment casting"); }
    if (maxDim <= 300) { s += 10; why.push("size suits shell capability"); }
    else { s -= 15; why.push("envelope is large for a practical shell"); }
    if (volume > 20000) { s -= 12; why.push("per-piece cost is high at this volume"); }
    if (profile.flags.undercut || casting.coreCount >= 3) { s += 12; why.push("complex internal geometry is formed without sand cores"); }
    if (casting.estimatedCastWeightKg > 25) { s -= 15; why.push("cast weight is high for investment casting"); }
    candidates.push({ process: "Investment Casting", score: s, rationale: why.join("; ") });
  }

  // Shell moulding — middle ground.
  {
    let s = 38;
    const why: string[] = [];
    if (dimensionalClass === "precision") { s += 14; why.push("better dimensional repeatability than green sand"); }
    if (volume >= 5000) { s += 12; why.push("volume supports metal pattern plates"); }
    if (maxDim > 350) { s -= 12; why.push("large for economical shell moulding"); }
    candidates.push({ process: "Shell Moulding", score: s, rationale: why.join("; ") });
  }

  // Low pressure die casting.
  {
    let s = 30;
    const why: string[] = [];
    if (alloyFamily === "aluminium") { s += 20; why.push("standard for aluminium structural parts"); }
    else { s -= 25; why.push("rarely used outside light alloys"); }
    if (profile.hints.pressureTight) { s += 14; why.push("quiescent fill gives sound, pressure-tight sections"); }
    if (volume >= 10000) { s += 10; why.push("volume supports the tooling"); }
    candidates.push({ process: "Low Pressure Die Casting", score: s, rationale: why.join("; ") });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const runnerUp = candidates[1];

  // Only commit when the data supports it and there is a clear winner.
  const blockingMissing = missing.filter((m) => !m.includes("Annual production volume"));
  const decisive = best.score - runnerUp.score >= 6 && best.score >= 55;
  const insufficient = blockingMissing.length > 0 || !decisive;

  const normalise = (s: number) => Math.max(0, Math.min(100, Math.round(s)));

  const rationale = insufficient
    ? [
        blockingMissing.length
          ? `The drawing does not provide: ${blockingMissing.join(", ")}. A process cannot be selected without these.`
          : `No single process scores decisively (${best.process} ${normalise(best.score)} vs ${runnerUp.process} ${normalise(runnerUp.score)}). Both remain viable.`,
        "Candidate processes and their scoring are listed below for engineering review.",
      ]
    : [
        `${best.process} scores highest (${normalise(best.score)}/100) for this part: ${best.rationale}.`,
        `Next best option is ${runnerUp.process} (${normalise(runnerUp.score)}/100): ${runnerUp.rationale}.`,
        `Scoring inputs: ${profile.hints.alloyFamily.replace("-", " ")} alloy, ${wallThicknessClass} wall class, ${dimensionalClass.replace("-", " ")} dimensional class, ${maxDim} mm maximum envelope, ${volume.toLocaleString()} pcs/year assumed volume.`,
      ];

  return {
    process: insufficient ? "Insufficient Information" : best.process,
    alternatives: candidates.slice(0, 5).map((c) => ({
      process: c.process,
      rationale: c.rationale || "No differentiating factors identified.",
      suitability: normalise(c.score),
    })),
    rationale,
    insufficientInformation: insufficient,
    missingInputs: missing,
    recommendedMaterial: casting.castingMaterial,
    recommendedAllowanceMm: `${casting.machiningAllowanceMm.general} mm general / ${casting.machiningAllowanceMm.criticalFaces} mm critical faces / ${casting.machiningAllowanceMm.bores} mm bores`,
    recommendedDraftAngleDeg: `${casting.draftAngleDeg}° external, ${casting.draftAngleDeg + 0.5}° cored surfaces`,
    coreRequirement: casting.coreRequirement,
    approximateCastWeightKg: casting.estimatedCastWeightKg,
    estimatedMachiningRequirement: `${casting.machiningRemovalPct}% of cast mass removed (${(casting.estimatedCastWeightKg - casting.estimatedFinishWeightKg).toFixed(2)} kg); ${casting.machinedAreas.length} machined feature groups`,
    criticalQualityCheckpoints: [
      `Chemical composition per heat against ${casting.castingMaterial.split(",")[0]}`,
      ...profile.qualityRequirements.slice(0, 3),
      `Dimensional layout of all ${casting.criticalAreas.length} critical dimensions on first article`,
      "Machining allowance verification on the raw casting before the first cut",
    ],
    confidence: insufficient ? 0.45 : Math.min(0.92, 0.55 + (best.score - runnerUp.score) / 100),
  };
}
