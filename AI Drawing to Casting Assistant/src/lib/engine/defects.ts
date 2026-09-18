/**
 * Casting defect risk prediction.
 *
 * Geometry-driven heuristics only — these are engineering predictions, never
 * statements of fact, and the UI labels them accordingly.
 */

import type { CastingConcept, DefectRisk, Severity } from "@/lib/types";
import type { SampleProfile } from "@/lib/samples";

let seq = 0;
const nextId = () => `dr-${(seq += 1)}`;

function risk(
  defect: string,
  riskArea: string,
  possibleCause: string,
  preventiveAction: string,
  inspectionMethod: string,
  likelihood: Severity,
  confidence: number,
): DefectRisk {
  return { id: nextId(), defect, riskArea, possibleCause, preventiveAction, inspectionMethod, likelihood, confidence };
}

export function predictDefects(profile: SampleProfile, casting: CastingConcept): DefectRisk[] {
  seq = 0;
  const alloy = profile.hints.alloyFamily;
  const out: DefectRisk[] = [];

  out.push(
    risk(
      "Shrinkage porosity",
      `Heaviest section (${profile.maxWallMm} mm) at the ${profile.archetype === "impeller" ? "hub" : "main boss"}`,
      "Isolated thermal centre with no direct feed path; volumetric contraction during solidification draws liquid away from the last-freezing region.",
      "Feeder directly over the heavy section, chill on the opposing face, and a solidification simulation before pattern release.",
      "Radiography of the heavy section (ASTM E446 Level 2) plus sectioning of the first-article casting.",
      profile.maxWallMm >= 20 ? "high" : "medium",
      0.82,
    ),
  );

  out.push(
    risk(
      "Gas porosity / blow holes",
      casting.coreCount > 1 ? "Cored passages and the core print interfaces" : "Cope surface above the cored bore",
      "Core binder gases and mould moisture cannot escape through the cope; entrapped gas collects at the highest point of the cored section.",
      "Vent the cores through the prints, control sand moisture and binder addition, and raise the pouring temperature within the specified band.",
      "Visual inspection after shot blasting plus X-ray of the cored region on the first batch.",
      casting.coreCount > 1 ? "high" : "medium",
      0.78,
    ),
  );

  if (profile.minWallMm <= (alloy === "aluminium" ? 4 : 6)) {
    out.push(
      risk(
        "Cold shut",
        `Thin web sections (${profile.minWallMm} mm) furthest from the ingate`,
        "Two metal fronts meet after the leading edges have already begun to solidify, so they fail to fuse.",
        "Shorten the flow path with additional ingates, raise the pouring temperature, and increase the pouring rate.",
        "100 % visual inspection of the thin sections; dye penetrant on the first article.",
        "high",
        0.8,
      ),
    );
    out.push(
      risk(
        "Misrun",
        `Last-to-fill thin section at the extremity of the casting (${profile.minWallMm} mm wall)`,
        "Insufficient fluidity or head pressure to complete the fill before solidification.",
        "Review gating and riser head height, confirm metal temperature at the ladle, and consider a filling simulation.",
        "100 % visual inspection and dimensional check of the section edges.",
        "medium",
        0.75,
      ),
    );
  }

  if (profile.sectionRatio >= 3.5 || profile.flags.sharpCorners) {
    out.push(
      risk(
        "Hot tearing / hot cracking",
        "Sharp internal corners and abrupt section changes at rib junctions",
        "Restrained contraction across an abrupt section change while the alloy is still in the semi-solid range.",
        "Add generous fillets (0.5-1x wall), use collapsible mould/core media, and avoid restraining the contraction path.",
        "Magnetic particle inspection (ferrous) or dye penetrant (non-ferrous) at the junctions.",
        profile.sectionRatio >= 4.5 ? "high" : "medium",
        0.76,
      ),
    );
  }

  out.push(
    risk(
      "Sand inclusion / dross",
      casting.coreCount > 1 ? "Cored passages and the parting line region" : "Parting line and ingate region",
      "Mould or core erosion from turbulent metal flow, or oxide film carried in with the first metal.",
      "Use a filter in the running system, apply a bottom-gated non-turbulent design, and harden the core surface with a coating.",
      "Visual inspection of internal passages with borescope plus penetrant on machined faces.",
      alloy === "aluminium" ? "high" : "medium",
      0.72,
    ),
  );

  out.push(
    risk(
      "Dimensional distortion",
      "Overall length and machined datum faces",
      "Non-uniform cooling and residual stress relief after shake-out; amplified by any downstream heat treatment.",
      "Fixture during cooling and heat treatment, and establish datums on the first machining operation from as-cast reference pads.",
      "CMM layout of the first 3 castings per batch against the datum scheme.",
      profile.envelope.length > 200 ? "medium" : "low",
      0.7,
    ),
  );

  if (profile.flags.heavyBossIsolated) {
    out.push(
      risk(
        "Subsurface porosity exposed by machining",
        `Machined face over the isolated heavy boss (${casting.machiningAllowanceMm.criticalFaces} mm removed)`,
        "Shrinkage cavity sits just below the as-cast skin and is opened up once the machining allowance is removed.",
        "Chill the boss, or increase the allowance locally so the cut stays above the porous zone.",
        "Dye penetrant on the machined face after the finish cut; X-ray for the first batch.",
        "high",
        0.74,
      ),
    );
  }

  if (alloy === "steel" || alloy === "ductile-iron") {
    out.push(
      risk(
        "Inclusions / slag entrapment",
        "Upper surfaces of the casting in the as-poured orientation",
        "Slag and oxide carried from the ladle float to the top of the mould cavity.",
        "Use a ceramic foam filter and a slag trap in the running system; skim the ladle before pouring.",
        "Visual and penetrant inspection of cope-side surfaces after blasting.",
        "medium",
        0.7,
      ),
    );
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2, info: 3 };
  return out.sort((a, b) => order[a.likelihood] - order[b.likelihood]);
}
