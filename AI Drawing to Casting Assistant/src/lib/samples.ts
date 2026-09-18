/**
 * Built-in sample drawing profiles.
 *
 * The demo engine matches an uploaded file to one of these profiles (by
 * filename keyword, else deterministically by a hash of the file name+size) so
 * the whole workflow can be exercised end to end without a live model call.
 * A real extraction backend would replace `matchProfile` only — everything
 * downstream consumes `SampleProfile`.
 */

export interface SampleProfileHole {
  description: string;
  diameter: string;
  depth: string;
  quantity: number;
  machined: boolean;
  cored: boolean;
  thread?: string;
}

export interface SampleProfile {
  id: string;
  /** Filename fragments that select this profile. */
  keywords: string[];
  partName: string;
  partNumber: string;
  drawingNumber: string;
  revision: string;
  /** Material of the finished part as called out in the title block. */
  material: string;
  /** Casting/alloy spec. Empty string = not stated on the drawing. */
  castingMaterial: string;
  overallSize: string;
  /** Finished part envelope, mm. */
  envelope: { length: number; width: number; height: number };
  generalTolerance: string;
  surfaceFinish: string;
  /** Empty string = not stated on the drawing. */
  weight: string;
  heatTreatment: string;
  /** Empty string = not stated (the engine must then flag it). */
  machiningAllowance: string;
  nominalWallMm: number;
  minWallMm: number;
  maxWallMm: number;
  sectionRatio: number;
  draftStatedDeg: number | null;
  density: number;
  /** Finished part volume in cm^3, used for weight estimation. */
  finishVolumeCm3: number;
  criticalDimensions: {
    feature: string;
    nominal: string;
    tolerance: string;
    datum?: string;
    inspectionCritical: boolean;
  }[];
  gdt: {
    symbol: string;
    characteristic: string;
    tolerance: string;
    datumReference: string;
    appliesTo: string;
  }[];
  datums: { id: string; description: string }[];
  holes: SampleProfileHole[];
  notes: string[];
  qualityRequirements: string[];
  /** Geometry archetype used by the SVG section renderer. */
  archetype: "housing" | "flanged-cover" | "bracket" | "impeller";
  /** Process hints the recommender scores against. */
  hints: {
    annualVolume: number | null;
    wallThicknessClass: "thin" | "medium" | "heavy";
    alloyFamily: "grey-iron" | "ductile-iron" | "aluminium" | "steel" | "bronze";
    dimensionalClass: "general" | "precision" | "high-precision";
    pressureTight: boolean;
  };
  /** Characteristics the feasibility checker keys off. */
  flags: {
    sharpCorners: boolean;
    unevenWall: boolean;
    deepPocket: boolean;
    undercut: boolean;
    complexCore: boolean;
    heavyBossIsolated: boolean;
  };
}

export const SAMPLE_PROFILES: SampleProfile[] = [
  {
    id: "pump-housing-gg25",
    keywords: ["pump", "housing", "casing", "volute"],
    partName: "Centrifugal Pump Housing",
    partNumber: "PH-4820-01",
    drawingNumber: "DRG-PH-4820",
    revision: "C",
    material: "Grey Cast Iron EN-GJL-250 (GG25)",
    castingMaterial: "EN-GJL-250 per EN 1561, min. 250 MPa tensile on separately cast bar",
    overallSize: "286 x 214 x 158 mm",
    envelope: { length: 286, width: 214, height: 158 },
    generalTolerance: "ISO 2768-mK; machined features per drawing",
    surfaceFinish: "Ra 3.2 µm machined faces, Ra 12.5 µm as-cast",
    weight: "14.8 kg (finished)",
    heatTreatment: "Stress relief 550 °C ± 15 °C, 3 h, furnace cool",
    machiningAllowance: "3 mm on machined faces (note 4)",
    nominalWallMm: 10,
    minWallMm: 6,
    maxWallMm: 26,
    sectionRatio: 4.3,
    draftStatedDeg: null,
    density: 7.2,
    finishVolumeCm3: 2055,
    criticalDimensions: [
      { feature: "Suction bore Ø", nominal: "Ø110.00", tolerance: "H7 (+0.035 / 0)", datum: "A", inspectionCritical: true },
      { feature: "Discharge bore Ø", nominal: "Ø80.00", tolerance: "H7 (+0.030 / 0)", datum: "A", inspectionCritical: true },
      { feature: "Mounting face to shaft centreline", nominal: "79.00", tolerance: "±0.10", datum: "B", inspectionCritical: true },
      { feature: "Bearing seat Ø", nominal: "Ø62.00", tolerance: "H6 (+0.019 / 0)", datum: "A", inspectionCritical: true },
      { feature: "Flange PCD", nominal: "Ø180.00", tolerance: "±0.20", datum: "A", inspectionCritical: false },
      { feature: "Overall length", nominal: "286.0", tolerance: "±1.0", inspectionCritical: false },
    ],
    gdt: [
      { symbol: "⌖", characteristic: "Position", tolerance: "Ø0.20 M", datumReference: "A|B|C", appliesTo: "8 x M12 flange holes" },
      { symbol: "◎", characteristic: "Concentricity", tolerance: "Ø0.05", datumReference: "A", appliesTo: "Bearing seat Ø62 H6" },
      { symbol: "⟂", characteristic: "Perpendicularity", tolerance: "0.08", datumReference: "A", appliesTo: "Mounting face" },
      { symbol: "⏥", characteristic: "Flatness", tolerance: "0.05", datumReference: "—", appliesTo: "Cover joint face" },
      { symbol: "↗", characteristic: "Total runout", tolerance: "0.10", datumReference: "A-B", appliesTo: "Seal register" },
    ],
    datums: [
      { id: "A", description: "Bearing seat bore Ø62 H6 axis" },
      { id: "B", description: "Machined mounting face" },
      { id: "C", description: "Dowel hole Ø10 H7" },
    ],
    holes: [
      { description: "Flange bolt holes on Ø180 PCD", diameter: "Ø13.5", depth: "Through", quantity: 8, machined: true, cored: false },
      { description: "Tapped cover holes", diameter: "Ø10.2 tap drill", depth: "22 deep", quantity: 6, machined: true, cored: false, thread: "M12 x 1.75 - 6H, 18 min. full thread" },
      { description: "Suction passage (cored)", diameter: "Ø104 as-cast", depth: "Through", quantity: 1, machined: false, cored: true },
      { description: "Drain port", diameter: "Ø14.75 tap drill", depth: "20 deep", quantity: 1, machined: true, cored: false, thread: "G 1/2 - BSP parallel" },
      { description: "Dowel hole", diameter: "Ø10 H7", depth: "18 deep", quantity: 2, machined: true, cored: false },
    ],
    notes: [
      "Casting to be free from blow holes, cracks, cold shuts and sand inclusion.",
      "All unspecified radii R3 min.",
      "Hydrostatic test at 16 bar for 10 minutes, no leakage permitted.",
      "Machining allowance 3 mm on all faces marked with machining symbol.",
      "Remove all burrs and sharp edges, break edges 0.5 x 45°.",
      "Casting identification: part number and foundry heat code to be cast in relief on the boss face.",
    ],
    qualityRequirements: [
      "Chemical composition report per heat, per EN 1561.",
      "Hardness 180-220 HB on machined mounting face.",
      "Radiographic inspection of the volute section, ASTM E446 Level 2 acceptance.",
      "Dye penetrant inspection of all machined sealing faces.",
      "First article inspection report (FAIR) required before series supply.",
    ],
    archetype: "housing",
    hints: {
      annualVolume: 2400,
      wallThicknessClass: "medium",
      alloyFamily: "grey-iron",
      dimensionalClass: "general",
      pressureTight: true,
    },
    flags: {
      sharpCorners: true,
      unevenWall: true,
      deepPocket: true,
      undercut: false,
      complexCore: true,
      heavyBossIsolated: true,
    },
  },
  {
    id: "bearing-cap-sg500",
    keywords: ["bearing", "cap", "cover", "gearbox", "end"],
    partName: "Gearbox Bearing End Cover",
    partNumber: "BC-2210-04",
    drawingNumber: "DRG-BC-2210",
    revision: "B",
    material: "Ductile Iron EN-GJS-500-7",
    castingMaterial: "EN-GJS-500-7 per EN 1563, nodularity ≥ 85 %",
    overallSize: "Ø196 x 58 mm",
    envelope: { length: 196, width: 196, height: 58 },
    generalTolerance: "ISO 2768-mK",
    surfaceFinish: "Ra 1.6 µm seal bore, Ra 3.2 µm register, Ra 12.5 µm as-cast",
    weight: "",
    heatTreatment: "",
    machiningAllowance: "",
    nominalWallMm: 9,
    minWallMm: 5.5,
    maxWallMm: 18,
    sectionRatio: 3.3,
    draftStatedDeg: 1,
    density: 7.1,
    finishVolumeCm3: 612,
    criticalDimensions: [
      { feature: "Seal bore Ø", nominal: "Ø85.00", tolerance: "H8 (+0.054 / 0)", datum: "A", inspectionCritical: true },
      { feature: "Spigot register Ø", nominal: "Ø150.00", tolerance: "h7 (0 / -0.040)", datum: "A", inspectionCritical: true },
      { feature: "Register depth", nominal: "8.00", tolerance: "±0.05", datum: "B", inspectionCritical: true },
      { feature: "Overall thickness", nominal: "58.0", tolerance: "±0.5", inspectionCritical: false },
      { feature: "Bolt hole PCD", nominal: "Ø170.00", tolerance: "±0.15", datum: "A", inspectionCritical: false },
    ],
    gdt: [
      { symbol: "⌖", characteristic: "Position", tolerance: "Ø0.25 M", datumReference: "A|B", appliesTo: "6 x Ø11 bolt holes" },
      { symbol: "⟂", characteristic: "Perpendicularity", tolerance: "0.05", datumReference: "A", appliesTo: "Mounting face B" },
      { symbol: "◎", characteristic: "Concentricity", tolerance: "Ø0.08", datumReference: "A", appliesTo: "Seal bore Ø85 H8" },
      { symbol: "⏥", characteristic: "Flatness", tolerance: "0.04", datumReference: "—", appliesTo: "Mounting face B" },
    ],
    datums: [
      { id: "A", description: "Spigot register Ø150 h7 axis" },
      { id: "B", description: "Machined mounting face" },
    ],
    holes: [
      { description: "Bolt holes on Ø170 PCD", diameter: "Ø11.0", depth: "Through", quantity: 6, machined: true, cored: false },
      { description: "Central seal bore", diameter: "Ø85 H8", depth: "Through", quantity: 1, machined: true, cored: true },
      { description: "Grease nipple port", diameter: "Ø6.8 tap drill", depth: "14 deep", quantity: 1, machined: true, cored: false, thread: "M8 x 1.25 - 6H" },
      { description: "Lifting/handling tapped hole", diameter: "Ø8.5 tap drill", depth: "16 deep", quantity: 2, machined: true, cored: false, thread: "M10 x 1.5 - 6H" },
    ],
    notes: [
      "Casting surfaces to be shot blasted to SA 2.5.",
      "No welding or weld repair permitted without written engineering approval.",
      "Unspecified fillet radii R2.5.",
      "Draft angle 1° on all vertical as-cast walls.",
    ],
    qualityRequirements: [
      "Nodularity check on one casting per ladle, minimum 85 %.",
      "Hardness 170-230 HB.",
      "Magnetic particle inspection of the seal bore area.",
      "Dimensional layout report on first 3 pieces per batch.",
    ],
    archetype: "flanged-cover",
    hints: {
      annualVolume: 8000,
      wallThicknessClass: "medium",
      alloyFamily: "ductile-iron",
      dimensionalClass: "precision",
      pressureTight: false,
    },
    flags: {
      sharpCorners: false,
      unevenWall: false,
      deepPocket: false,
      undercut: false,
      complexCore: false,
      heavyBossIsolated: false,
    },
  },
  {
    id: "mounting-bracket-a356",
    keywords: ["bracket", "mount", "support", "arm", "alu", "a356"],
    partName: "Alternator Mounting Bracket",
    partNumber: "MB-7715-02",
    drawingNumber: "DRG-MB-7715",
    revision: "A",
    material: "Aluminium Alloy A356.0-T6",
    castingMaterial: "",
    overallSize: "248 x 132 x 96 mm",
    envelope: { length: 248, width: 132, height: 96 },
    generalTolerance: "ISO 2768-mH",
    surfaceFinish: "Ra 3.2 µm machined, as-cast surfaces Ra 6.3 µm",
    weight: "1.9 kg (finished)",
    heatTreatment: "T6 — solution 540 °C/8 h, water quench, age 155 °C/6 h",
    machiningAllowance: "",
    nominalWallMm: 5,
    minWallMm: 3,
    maxWallMm: 19,
    sectionRatio: 6.3,
    draftStatedDeg: null,
    density: 2.68,
    finishVolumeCm3: 709,
    criticalDimensions: [
      { feature: "Pivot bore Ø", nominal: "Ø32.00", tolerance: "H7 (+0.025 / 0)", datum: "A", inspectionCritical: true },
      { feature: "Bore centre to mounting face", nominal: "84.00", tolerance: "±0.15", datum: "B", inspectionCritical: true },
      { feature: "Slot width", nominal: "14.00", tolerance: "+0.12 / 0", datum: "C", inspectionCritical: true },
      { feature: "Boss height", nominal: "96.0", tolerance: "±0.8", inspectionCritical: false },
      { feature: "Hole centre distance", nominal: "168.00", tolerance: "±0.20", datum: "B", inspectionCritical: true },
    ],
    gdt: [
      { symbol: "⌖", characteristic: "Position", tolerance: "Ø0.30 M", datumReference: "A|B|C", appliesTo: "4 x Ø10.5 mounting holes" },
      { symbol: "∥", characteristic: "Parallelism", tolerance: "0.10", datumReference: "B", appliesTo: "Pivot bore axis" },
      { symbol: "⏥", characteristic: "Flatness", tolerance: "0.08", datumReference: "—", appliesTo: "Mounting pad" },
      { symbol: "⌭", characteristic: "Cylindricity", tolerance: "0.02", datumReference: "—", appliesTo: "Pivot bore Ø32 H7" },
    ],
    datums: [
      { id: "A", description: "Pivot bore Ø32 H7 axis" },
      { id: "B", description: "Machined mounting pad" },
      { id: "C", description: "Slot centre plane" },
    ],
    holes: [
      { description: "Mounting holes", diameter: "Ø10.5", depth: "Through", quantity: 4, machined: true, cored: false },
      { description: "Pivot bore", diameter: "Ø32 H7", depth: "Through 46", quantity: 1, machined: true, cored: true },
      { description: "Adjustment slot", diameter: "14 wide x 48 long", depth: "Through", quantity: 1, machined: true, cored: false },
      { description: "Tapped sensor boss", diameter: "Ø5.0 tap drill", depth: "12 deep", quantity: 2, machined: true, cored: false, thread: "M6 x 1.0 - 6H" },
    ],
    notes: [
      "Casting shall be free of cold shuts and misruns in the thin web area.",
      "No porosity permitted within 5 mm of the pivot bore after machining.",
      "Unspecified radii R2.",
      "Component is safety related — traceability by heat code mandatory.",
    ],
    qualityRequirements: [
      "Spectro chemical analysis per melt.",
      "Tensile test bar per batch: Rm ≥ 262 MPa, A ≥ 5 %.",
      "X-ray of the pivot boss region, ASTM E155 Level 2.",
      "Brinell hardness 80-110 HB after T6.",
      "100 % visual inspection for cold shut and misrun.",
    ],
    archetype: "bracket",
    hints: {
      annualVolume: 45000,
      wallThicknessClass: "thin",
      alloyFamily: "aluminium",
      dimensionalClass: "precision",
      pressureTight: false,
    },
    flags: {
      sharpCorners: true,
      unevenWall: true,
      deepPocket: false,
      undercut: true,
      complexCore: false,
      heavyBossIsolated: true,
    },
  },
  {
    id: "impeller-cf8m",
    keywords: ["impeller", "rotor", "blade", "turbine", "investment"],
    partName: "Closed Impeller, 6 Vane",
    partNumber: "IM-9004-07",
    drawingNumber: "DRG-IM-9004",
    revision: "D",
    material: "Stainless Steel CF8M (ASTM A743 Gr. CF8M)",
    castingMaterial: "ASTM A743 Gr. CF8M, ferrite 5-15 FN",
    overallSize: "Ø228 x 74 mm",
    envelope: { length: 228, width: 228, height: 74 },
    generalTolerance: "ISO 8062-3 DCTG 8 as-cast; machined per drawing",
    surfaceFinish: "Ra 3.2 µm machined, Ra 6.3 µm vane passages",
    weight: "",
    heatTreatment: "Solution anneal 1050 °C minimum, water quench",
    machiningAllowance: "2.5 mm on hub and shroud faces",
    nominalWallMm: 6,
    minWallMm: 4,
    maxWallMm: 22,
    sectionRatio: 5.5,
    draftStatedDeg: null,
    density: 7.75,
    finishVolumeCm3: 1180,
    criticalDimensions: [
      { feature: "Shaft bore Ø", nominal: "Ø40.00", tolerance: "H7 (+0.025 / 0)", datum: "A", inspectionCritical: true },
      { feature: "Outer diameter", nominal: "Ø228.00", tolerance: "±0.30", datum: "A", inspectionCritical: true },
      { feature: "Vane outlet width", nominal: "16.00", tolerance: "±0.25", inspectionCritical: true },
      { feature: "Keyway width", nominal: "12.00", tolerance: "P9", datum: "A", inspectionCritical: true },
      { feature: "Hub face to shroud face", nominal: "74.0", tolerance: "±0.4", datum: "B", inspectionCritical: false },
    ],
    gdt: [
      { symbol: "↗", characteristic: "Total runout", tolerance: "0.08", datumReference: "A", appliesTo: "Outer diameter" },
      { symbol: "⟂", characteristic: "Perpendicularity", tolerance: "0.05", datumReference: "A", appliesTo: "Hub face" },
      { symbol: "⌖", characteristic: "Position", tolerance: "Ø0.15 M", datumReference: "A|B", appliesTo: "Balance holes" },
      { symbol: "◎", characteristic: "Concentricity", tolerance: "Ø0.06", datumReference: "A", appliesTo: "Shroud register" },
    ],
    datums: [
      { id: "A", description: "Shaft bore Ø40 H7 axis" },
      { id: "B", description: "Machined hub face" },
    ],
    holes: [
      { description: "Shaft bore", diameter: "Ø40 H7", depth: "Through 74", quantity: 1, machined: true, cored: true },
      { description: "Balance holes", diameter: "Ø8", depth: "10 deep", quantity: 6, machined: true, cored: false },
      { description: "Vane passages (cored)", diameter: "16 x 26 section", depth: "Through", quantity: 6, machined: false, cored: true },
    ],
    notes: [
      "Dynamic balance to ISO 1940 G6.3 at 3000 rpm.",
      "Vane passages to be free from sand inclusion and positive metal.",
      "No weld repair in the vane passage region.",
      "Unspecified radii R2 in the passage, R4 at the hub blend.",
    ],
    qualityRequirements: [
      "Chemical analysis and ferrite number per heat.",
      "Liquid penetrant inspection 100 %, ASTM E165, acceptance ASME VIII Appendix 7.",
      "Radiography of the hub section, ASTM E446 Level 2.",
      "Positive material identification (PMI) 100 %.",
      "Dimensional inspection of vane passages by CMM or 3D scan.",
    ],
    archetype: "impeller",
    hints: {
      annualVolume: 600,
      wallThicknessClass: "thin",
      alloyFamily: "steel",
      dimensionalClass: "high-precision",
      pressureTight: false,
    },
    flags: {
      sharpCorners: false,
      unevenWall: true,
      deepPocket: false,
      undercut: true,
      complexCore: true,
      heavyBossIsolated: true,
    },
  },
];

/** Stable 32-bit hash so the same file always maps to the same profile. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function matchProfile(fileName: string, fileSize: number): SampleProfile {
  const lower = fileName.toLowerCase();
  const keyworded = SAMPLE_PROFILES.find((p) => p.keywords.some((k) => lower.includes(k)));
  if (keyworded) return keyworded;
  const index = hashString(`${lower}:${fileSize}`) % SAMPLE_PROFILES.length;
  return SAMPLE_PROFILES[index];
}

export function profileById(id: string): SampleProfile {
  return SAMPLE_PROFILES.find((p) => p.id === id) ?? SAMPLE_PROFILES[0];
}
