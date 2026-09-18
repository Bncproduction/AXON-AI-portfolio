/**
 * Casting feasibility rules.
 *
 * Each rule is an explicit, inspectable check against the extracted drawing
 * data. Everything returned is provenance "ai" and must be shown under the
 * "AI Recommendation – Engineering Validation Required." banner.
 */

import type { CastingConcept, DrawingAnalysis, FeasibilityIssue, Severity } from "@/lib/types";
import type { SampleProfile } from "@/lib/samples";
import { hasValue } from "./analysis";

/** Minimum practical wall thickness in mm, by alloy family and process class. */
const MIN_WALL: Record<SampleProfile["hints"]["alloyFamily"], number> = {
  "grey-iron": 5,
  "ductile-iron": 5,
  aluminium: 3,
  steel: 6,
  bronze: 4,
};

let seq = 0;
const nextId = () => `fi-${(seq += 1)}`;

function issue(
  category: string,
  text: string,
  location: string,
  reason: string,
  action: string,
  severity: Severity,
  confidence: number,
): FeasibilityIssue {
  return {
    id: nextId(),
    category,
    issue: text,
    location,
    reason,
    recommendedAction: action,
    severity,
    confidence,
    provenance: "ai",
  };
}

export function analyseFeasibility(
  profile: SampleProfile,
  analysis: DrawingAnalysis,
  casting: CastingConcept,
): FeasibilityIssue[] {
  seq = 0;
  const out: FeasibilityIssue[] = [];
  const minWall = MIN_WALL[profile.hints.alloyFamily];

  // 1. Draft
  if (profile.draftStatedDeg == null) {
    out.push(
      issue(
        "Draft",
        "No draft angle specified on the drawing",
        "All as-cast vertical walls and cored surfaces",
        "The drawing carries no draft callout. Without draft the pattern cannot be withdrawn without tearing the mould face, and core withdrawal will scuff the cored surfaces.",
        `Add a drawing note applying ${casting.draftAngleDeg}° minimum draft to external as-cast walls and ${casting.draftAngleDeg + 0.5}° to cored surfaces, stated as additive to the nominal wall.`,
        "high",
        0.9,
      ),
    );
  } else if (profile.draftStatedDeg < 1) {
    out.push(
      issue(
        "Draft",
        `Specified draft of ${profile.draftStatedDeg}° is below the practical minimum`,
        "External as-cast walls",
        `${profile.draftStatedDeg}° gives very little clearance on a ${profile.envelope.height} mm draw depth and risks mould damage on withdrawal.`,
        `Increase draft to ${casting.draftAngleDeg}° minimum, or agree a loose-piece pattern with the foundry.`,
        "medium",
        0.78,
      ),
    );
  }

  // 2. Thin wall
  if (profile.minWallMm < minWall) {
    out.push(
      issue(
        "Thin wall",
        `Minimum wall ${profile.minWallMm} mm is below the ${minWall} mm practical limit for ${profile.hints.alloyFamily.replace("-", " ")}`,
        "Thinnest web / rib sections",
        `Sections below ${minWall} mm in this alloy are prone to misrun and cold shut, especially at the last-to-fill regions.`,
        `Increase the minimum wall to ${minWall + 1} mm, or confirm with the foundry that a raised pouring temperature and revised gating can fill ${profile.minWallMm} mm reliably.`,
        "high",
        0.86,
      ),
    );
  } else if (profile.minWallMm < minWall + 1.5) {
    out.push(
      issue(
        "Thin wall",
        `Minimum wall ${profile.minWallMm} mm is close to the practical limit`,
        "Thinnest web / rib sections",
        "Fill is achievable but leaves little margin for pattern wear and metal temperature variation.",
        "Plan a filling simulation before pattern manufacture and monitor first-article sections.",
        "medium",
        0.72,
      ),
    );
  }

  // 3. Uneven wall / section ratio
  if (profile.sectionRatio >= 4) {
    out.push(
      issue(
        "Uneven wall thickness",
        `Section thickness ratio ${profile.sectionRatio}:1 between the heaviest and lightest sections`,
        `Heavy section ${profile.maxWallMm} mm vs. thin section ${profile.minWallMm} mm`,
        "A large section ratio produces uneven solidification: the heavy section stays liquid after the thin section has solidified, creating an isolated hot spot that cannot be fed.",
        "Taper transitions towards the feeder, add a directional-solidification wedge, or place a chill at the heavy section. Target a section ratio below 3:1 where the design allows.",
        "high",
        0.83,
      ),
    );
  } else if (profile.sectionRatio >= 3) {
    out.push(
      issue(
        "Uneven wall thickness",
        `Section thickness ratio ${profile.sectionRatio}:1`,
        "Heavy boss to adjacent wall transitions",
        "Moderate section change; feeding is workable but transitions must be blended.",
        "Blend all section changes over at least 3x the thinner wall and confirm with solidification simulation.",
        "medium",
        0.7,
      ),
    );
  }

  // 4. Sharp corners
  if (profile.flags.sharpCorners) {
    out.push(
      issue(
        "Sharp corners",
        "Sharp internal corners detected at wall junctions",
        "Rib-to-wall and boss-to-wall junctions",
        "Sharp internal corners concentrate stress and form a local hot spot, promoting hot tearing in the mould and fatigue cracking in service.",
        "Apply a fillet of 0.5x to 1x the adjoining wall thickness at all internal corners, and radius external corners to at least R2.",
        "medium",
        0.8,
      ),
    );
  }

  // 5. Core complexity
  if (profile.flags.complexCore) {
    out.push(
      issue(
        "Difficult core requirement",
        `${casting.coreCount} cores required, including an internally supported core`,
        casting.coreRequirement,
        "Cores that are long, unsupported, or assembled from segments shift under metal pressure, producing wall-thickness variation and eccentric cored features.",
        "Design positive core prints at both ends, add chaplets or core supports where the unsupported length exceeds 4x the core diameter, and add a first-off wall-thickness check by ultrasonic measurement.",
        "high",
        0.81,
      ),
    );
  }

  // 6. Undercut / difficult parting line
  if (profile.flags.undercut) {
    out.push(
      issue(
        "Difficult parting line",
        "Geometry contains an undercut relative to the proposed draw direction",
        casting.partingLine,
        "The undercut cannot be drawn straight from the mould; it forces either a loose piece, an extra core, or a stepped parting line, all of which add cost and a mismatch risk.",
        "Confirm the proposed parting line with the pattern shop. If the undercut is not functionally required, relieve it in the design; otherwise budget for a loose piece and add a mismatch tolerance to the drawing.",
        "medium",
        0.75,
      ),
    );
  }

  // 7. Machining allowance
  if (!hasValue(analysis, "machiningAllowance")) {
    out.push(
      issue(
        "Machining allowance",
        "No machining allowance stated on the drawing",
        "All surfaces carrying a machining symbol",
        `The drawing does not state a stock allowance, so the foundry has no basis for pattern sizing. ${casting.machiningAllowanceMm.general} mm has been assumed from ISO 8062-3 practice for this size and alloy.`,
        `Add a machining allowance note: ${casting.machiningAllowanceMm.general} mm general, ${casting.machiningAllowanceMm.criticalFaces} mm on datum and critical faces, ${casting.machiningAllowanceMm.bores} mm on bores.`,
        "high",
        0.88,
      ),
    );
  } else if (casting.machiningAllowanceMm.general < 2 && profile.hints.alloyFamily !== "aluminium") {
    out.push(
      issue(
        "Machining allowance",
        `Stated allowance of ${casting.machiningAllowanceMm.general} mm may be insufficient`,
        "Machined faces and bores",
        "Below 2 mm there is a real risk that as-cast surface scale and dimensional scatter are not fully cleaned up in a single machining pass.",
        "Review against the foundry's dimensional capability (ISO 8062 tolerance grade) and increase the allowance on datum faces if required.",
        "medium",
        0.68,
      ),
    );
  }

  // 8. Shrinkage / feeding
  out.push(
    issue(
      "Shrinkage",
      `Heaviest section ${profile.maxWallMm} mm requires a dedicated feeder`,
      "Heavy boss / hub region",
      `${profile.hints.alloyFamily.replace("-", " ")} solidifies with measurable volumetric contraction; the last region to freeze will draw shrinkage porosity unless it has a direct liquid path to a feeder.`,
      "Position a feeder directly over the heaviest section, verify feeding range by solidification simulation, and add a chill where the feeder cannot reach.",
      profile.maxWallMm >= 20 ? "high" : "medium",
      0.79,
    ),
  );

  // 9. Porosity at critical machined features
  if (profile.flags.heavyBossIsolated) {
    out.push(
      issue(
        "Potential porosity",
        "Isolated heavy boss adjacent to a machined critical feature",
        casting.criticalAreas[0] ?? "Primary machined bore",
        "Subsurface shrinkage porosity in an isolated heavy section is often exposed only after machining, causing scrap at the most expensive point in the route.",
        "Chill or feed the boss, and add a post-machining NDT check (dye penetrant or X-ray) on the exposed face for the first production batch.",
        "high",
        0.77,
      ),
    );
  }

  // 10. Distortion
  if (profile.envelope.length / Math.max(profile.minWallMm, 1) > 30) {
    out.push(
      issue(
        "Potential distortion",
        `Long, comparatively thin part (${profile.envelope.length} mm long on a ${profile.minWallMm} mm minimum wall)`,
        "Overall length of the casting",
        "High length-to-thickness ratios distort during cooling and again during stress relief, which can put machined datums out of tolerance.",
        hasValue(analysis, "heatTreatment")
          ? "Fixture the casting during stress relief and measure datum flatness before and after heat treatment."
          : "Add a stress-relief operation before finish machining and fixture the casting during cooling.",
        "medium",
        0.7,
      ),
    );
  }

  // 11. Difficult-to-machine regions
  if (profile.flags.deepPocket) {
    out.push(
      issue(
        "Difficult-to-machine region",
        "Deep internal pocket with a limited tool approach",
        "Internal passage / pocket area",
        "A deep pocket forces a long tool overhang, which increases chatter, tool deflection and the risk of missing the position tolerance on the pocket features.",
        "Confirm tool access with the machining supplier, consider casting the pocket closer to net shape, or agree a relaxed tolerance on non-functional pocket surfaces.",
        "low",
        0.66,
      ),
    );
  }

  // 12. Pressure tightness
  if (profile.hints.pressureTight) {
    out.push(
      issue(
        "Pressure tightness",
        "Part is pressure tested but has a heavy-to-thin transition in the pressure boundary",
        "Pressure-containing wall between the inlet and the volute",
        "Interdendritic porosity in the pressure wall leaks under hydrostatic test even when the surface looks sound.",
        "Specify impregnation as a contingency only with engineering approval, and require a 100 % hydrostatic test at the stated pressure rather than a sample test.",
        "medium",
        0.74,
      ),
    );
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2, info: 3 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
