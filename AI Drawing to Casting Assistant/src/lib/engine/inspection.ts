/**
 * Casting inspection standard generator.
 *
 * Produces a complete incoming/in-process inspection plan for the raw casting.
 * Rows whose specification came off the drawing are marked provenance
 * "drawing"; rows derived from standard practice are marked "ai".
 */

import type {
  CastingConcept,
  DrawingAnalysis,
  InspectionCheck,
  InspectionStandard,
  ProcessRecommendation,
} from "@/lib/types";
import type { SampleProfile } from "@/lib/samples";
import { fieldValue, hasValue } from "./analysis";

let seq = 0;
const nextId = () => `ic-${(seq += 1)}`;

type Row = Omit<InspectionCheck, "id">;

const row = (r: Row): InspectionCheck => ({ id: nextId(), ...r });

export function generateInspectionStandard(
  profile: SampleProfile,
  analysis: DrawingAnalysis,
  casting: CastingConcept,
  recommendation: ProcessRecommendation,
): InspectionStandard {
  seq = 0;
  const checks: InspectionCheck[] = [];
  const alloy = profile.hints.alloyFamily;
  const ferrous = alloy === "grey-iron" || alloy === "ductile-iron" || alloy === "steel";

  // --- Material ---
  checks.push(
    row({
      group: "Material",
      checkParameter: "Material grade verification",
      specification: casting.castingMaterial,
      tolerance: "Grade must match exactly; no substitution",
      inspectionMethod: "Mill/foundry test certificate review + heat code traceability",
      instrument: "Document review; heat code stamped on casting",
      frequency: "Every heat / every lot",
      acceptanceCriteria: "Certificate matches the specified grade and is traceable to the delivered lot",
      provenance: hasValue(analysis, "castingMaterial") ? "drawing" : "ai",
      reference: hasValue(analysis, "castingMaterial") ? "Drawing title block / material note" : "Derived from the part material specification",
    }),
    row({
      group: "Material",
      checkParameter: "Chemical composition",
      specification:
        alloy === "aluminium"
          ? "Si 6.5-7.5 %, Mg 0.25-0.45 %, Fe ≤ 0.20 %, balance Al (A356.0)"
          : alloy === "steel"
            ? "C ≤ 0.08 %, Cr 18-21 %, Ni 9-12 %, Mo 2.0-3.0 % (CF8M)"
            : alloy === "ductile-iron"
              ? "C 3.5-3.9 %, Si 2.2-2.8 %, Mg 0.03-0.06 %, S ≤ 0.02 %"
              : "C 3.1-3.4 %, Si 1.8-2.4 %, Mn 0.5-0.8 %, P ≤ 0.15 %, S ≤ 0.12 %",
      tolerance: "Per the referenced material standard",
      inspectionMethod: "Spectrographic analysis of a poured test sample",
      instrument: "Optical emission spectrometer",
      frequency: "Every melt / ladle",
      acceptanceCriteria: "All elements within the specified band; report retained with the lot",
      provenance: "ai",
      reference: "Standard foundry practice for the specified grade",
    }),
    row({
      group: "Material",
      checkParameter: "Mechanical properties",
      specification:
        alloy === "aluminium"
          ? "Rm ≥ 262 MPa, Rp0.2 ≥ 186 MPa, A ≥ 5 % (T6)"
          : alloy === "ductile-iron"
            ? "Rm ≥ 500 MPa, Rp0.2 ≥ 320 MPa, A ≥ 7 %"
            : alloy === "steel"
              ? "Rm ≥ 485 MPa, Rp0.2 ≥ 205 MPa, A ≥ 30 %"
              : "Rm ≥ 250 MPa on a separately cast 30 mm bar",
      tolerance: "Minimum values, no upper limit unless stated",
      inspectionMethod: "Tensile test on a separately cast or attached test bar",
      instrument: "Universal tensile testing machine",
      frequency: "One bar per heat",
      acceptanceCriteria: "All measured values meet or exceed the minimum",
      provenance: "ai",
      reference: "Referenced material standard",
    }),
  );

  if (alloy === "ductile-iron") {
    checks.push(
      row({
        group: "Material",
        checkParameter: "Nodularity",
        specification: "≥ 85 % nodularity, nodule count ≥ 100/mm²",
        tolerance: "Minimum",
        inspectionMethod: "Metallographic examination of a polished section",
        instrument: "Metallurgical microscope with image analysis",
        frequency: "One casting per ladle",
        acceptanceCriteria: "≥ 85 % nodularity; graphite form III or better rejected",
        provenance: "drawing",
        reference: "Drawing material note",
      }),
    );
  }

  if (alloy === "steel") {
    checks.push(
      row({
        group: "Material",
        checkParameter: "Positive material identification (PMI)",
        specification: "Alloy confirmed as CF8M",
        tolerance: "Pass / fail",
        inspectionMethod: "Handheld XRF or optical analysis on the finished casting",
        instrument: "Portable XRF analyser",
        frequency: "100 %",
        acceptanceCriteria: "Alloy signature matches CF8M; mixed material is rejected",
        provenance: "drawing",
        reference: "Drawing quality note",
      }),
      row({
        group: "Material",
        checkParameter: "Ferrite number",
        specification: "5-15 FN",
        tolerance: "5-15 FN",
        inspectionMethod: "Ferrite measurement on the machined surface",
        instrument: "Ferritescope",
        frequency: "Every heat",
        acceptanceCriteria: "Within 5-15 FN",
        provenance: "drawing",
        reference: "Drawing material note",
      }),
    );
  }

  // --- Dimensional ---
  checks.push(
    row({
      group: "Dimensional",
      checkParameter: "Raw casting envelope",
      specification: `${casting.envelope.length} x ${casting.envelope.width} x ${casting.envelope.height} mm`,
      tolerance: profile.hints.dimensionalClass === "high-precision" ? "ISO 8062-3 DCTG 8" : "ISO 8062-3 DCTG 10",
      inspectionMethod: "Direct measurement of the raw casting before machining",
      instrument: "Vernier caliper / height gauge / measuring tape (as size dictates)",
      frequency: "First 3 pieces per batch, then 1 in 20",
      acceptanceCriteria: "Within the stated as-cast tolerance grade with the full machining allowance present",
      provenance: "ai",
      reference: "Derived from the finished envelope plus the machining allowance",
    }),
    row({
      group: "Dimensional",
      checkParameter: "General dimensions",
      specification: fieldValue(analysis, "overallSize"),
      tolerance: fieldValue(analysis, "tolerance"),
      inspectionMethod: "Layout inspection against the drawing",
      instrument: "Caliper, micrometer, height gauge, surface plate",
      frequency: "First article; 5 % thereafter",
      acceptanceCriteria: "All dimensions within the general tolerance class",
      provenance: hasValue(analysis, "tolerance") ? "drawing" : "ai",
      reference: "Drawing general tolerance note",
    }),
  );

  analysis.criticalDimensions
    .filter((d) => d.inspectionCritical)
    .forEach((d) => {
      checks.push(
        row({
          group: "Critical dimensions",
          checkParameter: d.feature,
          specification: d.nominal,
          tolerance: d.tolerance,
          inspectionMethod: d.feature.toLowerCase().includes("ø")
            ? "Bore measurement at 3 depths, 2 planes"
            : "CMM measurement referenced to the drawing datum scheme",
          instrument: d.feature.toLowerCase().includes("ø")
            ? "Air gauge / three-point internal micrometer / CMM"
            : "CMM (or height gauge on a surface plate)",
          frequency: "100 % on critical features",
          acceptanceCriteria: `Within ${d.tolerance}${d.datum ? ` relative to datum ${d.datum}` : ""}; out-of-tolerance parts quarantined`,
          provenance: "drawing",
          reference: `Drawing dimension${d.datum ? `, datum ${d.datum}` : ""}`,
        }),
      );
    });

  // --- GD&T ---
  analysis.gdt.forEach((g) => {
    checks.push(
      row({
        group: "GD&T",
        checkParameter: `${g.characteristic} — ${g.appliesTo}`,
        specification: `${g.symbol} ${g.tolerance}`,
        tolerance: g.tolerance,
        inspectionMethod: "CMM evaluation against the stated datum reference frame",
        instrument: "CMM with GD&T evaluation software",
        frequency: "First article and on every process change; 1 in 20 in series",
        acceptanceCriteria: `${g.characteristic} within ${g.tolerance} referenced to ${g.datumReference}`,
        provenance: "drawing",
        reference: `Feature control frame, datums ${g.datumReference}`,
      }),
    );
  });

  // --- Machining allowance ---
  checks.push(
    row({
      group: "Machining allowance",
      checkParameter: "Stock allowance on machined faces",
      specification: `${casting.machiningAllowanceMm.general} mm general, ${casting.machiningAllowanceMm.criticalFaces} mm on datum/critical faces, ${casting.machiningAllowanceMm.bores} mm on bores`,
      tolerance: "+1.5 / -0.5 mm on the nominal allowance",
      inspectionMethod: "Ultrasonic wall thickness measurement and layout on the raw casting",
      instrument: "Ultrasonic thickness gauge; marking-out on a surface plate",
      frequency: "First 3 pieces per batch; 100 % after any pattern repair",
      acceptanceCriteria: "Allowance present on every machined face with the datum scheme achievable in one setup",
      provenance: hasValue(analysis, "machiningAllowance") ? "drawing" : "ai",
      reference: hasValue(analysis, "machiningAllowance")
        ? "Drawing machining allowance note"
        : "Assumed from ISO 8062-3 practice — not stated on the drawing",
    }),
  );

  // --- Visual & surface ---
  checks.push(
    row({
      group: "Visual & surface",
      checkParameter: "Visual inspection — general casting condition",
      specification: "Free from cracks, cold shuts, misruns, sand inclusion and blow holes",
      tolerance: "No defects permitted in critical areas; cosmetic defects per the agreed boundary sample",
      inspectionMethod: "Visual inspection after shot blasting under ≥ 500 lux",
      instrument: "Visual, 10x magnifier, boundary sample set",
      frequency: "100 %",
      acceptanceCriteria: "No cracks, cold shuts or misruns anywhere; no inclusions in machined or sealing areas",
      provenance: "drawing",
      reference: "Drawing general notes",
    }),
    row({
      group: "Visual & surface",
      checkParameter: "Surface finish",
      specification: fieldValue(analysis, "surfaceFinish"),
      tolerance: "Maximum Ra as stated",
      inspectionMethod: "Surface roughness measurement on machined faces; comparator on as-cast faces",
      instrument: "Surface roughness tester; SCRATA / cast surface comparator plates",
      frequency: "First article and 1 in 20",
      acceptanceCriteria: "Ra at or below the specified value on each surface class",
      provenance: hasValue(analysis, "surfaceFinish") ? "drawing" : "ai",
      reference: "Drawing surface texture symbols",
    }),
    row({
      group: "Visual & surface",
      checkParameter: "Surface defects — parting line mismatch, flash, fettling",
      specification: "Mismatch ≤ 1.0 mm; all flash and feeder contact fully dressed",
      tolerance: "≤ 1.0 mm mismatch",
      inspectionMethod: "Visual and step-gauge measurement across the parting line",
      instrument: "Step gauge / caliper",
      frequency: "100 % visual; measured on 1 in 10",
      acceptanceCriteria: "No mismatch that encroaches on the machining allowance",
      provenance: "ai",
      reference: "Standard foundry practice; parting line proposed by the AI casting concept",
    }),
  );

  // --- NDT ---
  checks.push(
    row({
      group: "Non-destructive testing",
      checkParameter: "Internal soundness / porosity",
      specification: "No shrinkage or gas porosity exceeding the referenced severity level",
      tolerance: "ASTM E446 Level 2 for the heavy section",
      inspectionMethod: "Radiographic inspection of the heavy section",
      instrument: "X-ray / radiography with a certified interpreter",
      frequency: "First article; then 1 per batch, or 100 % where stated on the drawing",
      acceptanceCriteria: "No category-C or worse discontinuity above Level 2 in critical regions",
      provenance: "drawing",
      reference: "Drawing quality requirements",
    }),
    row({
      group: "Non-destructive testing",
      checkParameter: "Crack / discontinuity inspection",
      specification: ferrous
        ? "No linear indications on machined or sealing surfaces"
        : "No linear indications; rounded indications per ASTM E165 acceptance",
      tolerance: "No relevant linear indication",
      inspectionMethod: ferrous
        ? "Magnetic particle inspection (ASTM E709)"
        : "Liquid penetrant inspection (ASTM E165)",
      instrument: ferrous ? "Yoke magnetiser with wet fluorescent media" : "Penetrant kit, Type II Method C",
      frequency: "100 % on machined sealing faces; first article on all surfaces",
      acceptanceCriteria: "No cracks, hot tears or linear indications in critical or machined areas",
      provenance: "drawing",
      reference: "Drawing quality requirements",
    }),
  );

  // --- Hardness / heat treatment ---
  checks.push(
    row({
      group: "Hardness & heat treatment",
      checkParameter: "Hardness",
      specification:
        alloy === "aluminium"
          ? "80-110 HB after T6"
          : alloy === "ductile-iron"
            ? "170-230 HB"
            : alloy === "steel"
              ? "≤ 187 HB in the solution-annealed condition"
              : "180-220 HB on the machined face",
      tolerance: "As specified band",
      inspectionMethod: "Brinell hardness test on a prepared machined surface",
      instrument: "Brinell hardness tester (2.5/187.5 or 10/3000)",
      frequency: "One casting per heat treatment batch",
      acceptanceCriteria: "Within the specified band; out-of-band batches re-treated with engineering approval",
      provenance: "ai",
      reference: "Derived from the specified material grade and condition",
    }),
    row({
      group: "Hardness & heat treatment",
      checkParameter: "Heat treatment verification",
      specification: hasValue(analysis, "heatTreatment")
        ? fieldValue(analysis, "heatTreatment")
        : "Information Not Available in Drawing. — confirm with engineering whether stress relief is required",
      tolerance: hasValue(analysis, "heatTreatment") ? "Per cycle stated on the drawing" : "To be confirmed",
      inspectionMethod: "Furnace chart review against the specified cycle, plus hardness confirmation",
      instrument: "Calibrated furnace recorder chart; Brinell tester",
      frequency: "Every heat treatment batch",
      acceptanceCriteria: "Soak temperature and time within tolerance for the full batch; chart retained with the lot",
      provenance: hasValue(analysis, "heatTreatment") ? "drawing" : "unavailable",
      reference: "Drawing heat treatment note",
    }),
  );

  // --- Casting defects summary check ---
  checks.push(
    row({
      group: "Casting defects",
      checkParameter: "Defect-specific check for the predicted risk areas",
      specification: `Targeted inspection of: ${casting.criticalAreas.slice(0, 2).join("; ") || "critical machined features"}`,
      tolerance: "No defect open to a machined or sealing surface",
      inspectionMethod: "Post-machining visual and penetrant inspection of the exposed faces",
      instrument: "Penetrant kit; 10x magnifier; borescope for internal passages",
      frequency: "100 % for the first 3 production batches, then per the sampling plan",
      acceptanceCriteria: "No porosity, inclusion or shrinkage exposed on a functional surface",
      provenance: "ai",
      reference: "Derived from the AI defect prediction — requires engineering validation",
    }),
    row({
      group: "Casting defects",
      checkParameter: "Cored passage cleanliness and wall thickness",
      specification: `${casting.coreCount} core(s): passages clear, wall thickness within the drawing envelope`,
      tolerance: "Wall thickness -0 / +2 mm on the nominal wall",
      inspectionMethod: "Borescope inspection plus ultrasonic wall thickness measurement",
      instrument: "Borescope; ultrasonic thickness gauge",
      frequency: "First 3 pieces per batch",
      acceptanceCriteria: "No residual core material or sand; no wall below the drawing minimum from core shift",
      provenance: "ai",
      reference: "Derived from the AI casting concept core plan",
    }),
  );

  if (profile.hints.pressureTight) {
    checks.push(
      row({
        group: "Function test",
        checkParameter: "Hydrostatic pressure test",
        specification: "16 bar for 10 minutes",
        tolerance: "No pressure drop",
        inspectionMethod: "Hydrostatic test with the casting blanked off at the machined faces",
        instrument: "Hydrostatic test rig with calibrated gauge and chart",
        frequency: "100 %",
        acceptanceCriteria: "No leakage, weeping or visible sweating over the hold period",
        provenance: "drawing",
        reference: "Drawing note",
      }),
    );
  }

  checks.push(
    row({
      group: "Documentation",
      checkParameter: "Traceability and documentation package",
      specification: "Heat code on the casting; material certificate, NDT report, dimensional report per lot",
      tolerance: "Complete package required before dispatch",
      inspectionMethod: "Document review at final inspection",
      instrument: "Document review checklist",
      frequency: "Every lot",
      acceptanceCriteria: `All documents present and traceable to ${fieldValue(analysis, "drawingNumber")} rev ${fieldValue(analysis, "revision")}`,
      provenance: "ai",
      reference: "Standard supplier quality requirement",
    }),
  );

  return {
    id: `is-${analysis.drawingId}`,
    drawingId: analysis.drawingId,
    generatedAt: new Date().toISOString(),
    standardNumber: `CIS-${fieldValue(analysis, "partNumber")}-R${fieldValue(analysis, "revision")}`,
    revision: `01 (generated against drawing rev ${fieldValue(analysis, "revision")}, process: ${recommendation.process})`,
    checks,
  };
}
