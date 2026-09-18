/**
 * Domain model for the AI Drawing -> Casting -> Inspection -> Report workflow.
 *
 * Every AI-derived field carries provenance so the UI can never present a
 * prediction as an approved engineering fact. See `Provenance`.
 */

/** Where a value came from. Drives the badge shown next to it in the UI. */
export type Provenance =
  /** Read directly off the drawing (title block, dimension, note). */
  | "drawing"
  /** Derived by the AI engine from drawing geometry / standards. Needs validation. */
  | "ai"
  /** Typed or corrected by a human user in this app. */
  | "user"
  /** Signed off by an authorised engineer. Only this counts as approved. */
  | "validated"
  /** Nothing in the drawing supports a value. */
  | "unavailable";

export const NOT_IN_DRAWING = "Information Not Available in Drawing.";
export const AI_CONCEPT_NOTICE = "AI-Generated Concept – Engineering Validation Required.";
export const AI_RECOMMENDATION_NOTICE = "AI Recommendation – Engineering Validation Required.";

/** A single extracted parameter with provenance and confidence. */
export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  provenance: Provenance;
  /** 0..1 model confidence. Undefined when provenance is user/validated/unavailable. */
  confidence?: number;
  /** Short note on how the value was obtained, shown on hover. */
  basis?: string;
  /** Free-text unit hint for editing help. */
  unit?: string;
  group: FieldGroup;
}

export type FieldGroup =
  | "identification"
  | "material"
  | "geometry"
  | "tolerance"
  | "process"
  | "quality";

export const FIELD_GROUP_LABELS: Record<FieldGroup, string> = {
  identification: "Drawing Identification",
  material: "Material & Specification",
  geometry: "Geometry & Dimensions",
  tolerance: "Tolerances & GD&T",
  process: "Process Requirements",
  quality: "Quality Requirements",
};

export interface HoleDetail {
  id: string;
  description: string;
  diameter: string;
  depth: string;
  quantity: number;
  /** true when the hole must be machined from solid / cored stock. */
  machined: boolean;
  cored: boolean;
  thread?: string;
  provenance: Provenance;
}

export interface CriticalDimension {
  id: string;
  feature: string;
  nominal: string;
  tolerance: string;
  datum?: string;
  inspectionCritical: boolean;
  provenance: Provenance;
}

export interface GdtFeature {
  id: string;
  symbol: string;
  characteristic: string;
  tolerance: string;
  datumReference: string;
  appliesTo: string;
  provenance: Provenance;
}

/** Result of "Analyze Drawing with AI". */
export interface DrawingAnalysis {
  id: string;
  drawingId: string;
  analyzedAt: string;
  engineVersion: string;
  /** Overall extraction confidence 0..1. */
  confidence: number;
  fields: ExtractedField[];
  holes: HoleDetail[];
  criticalDimensions: CriticalDimension[];
  gdt: GdtFeature[];
  datums: { id: string; description: string; provenance: Provenance }[];
  specialNotes: { id: string; text: string; provenance: Provenance }[];
  /** Fields the engine could not find any evidence for. */
  missingFields: string[];
}

export interface UploadedDrawing {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  /** Data URL for raster/PDF previews; undefined for DWG/DXF (no in-browser render). */
  previewDataUrl?: string;
  /** True when the format cannot be rendered in the browser today. */
  previewUnsupported: boolean;
  /** Which built-in sample profile the demo engine matched. */
  sampleProfileId: string;
  uploadedBy: string;
}

export type CastingProcess =
  | "Sand Casting"
  | "Gravity Die Casting"
  | "Pressure Die Casting"
  | "Investment Casting"
  | "Shell Moulding"
  | "Low Pressure Die Casting"
  | "Insufficient Information";

export interface CastingZone {
  id: string;
  label: string;
  kind: "machined" | "as-cast" | "critical" | "inspection" | "core" | "draft";
  note: string;
}

/** Result of "Generate Casting". */
export interface CastingConcept {
  id: string;
  drawingId: string;
  generatedAt: string;
  castingPartName: string;
  castingPartNumber: string;
  castingMaterial: string;
  materialProvenance: Provenance;
  /** Raw casting envelope in mm. */
  envelope: { length: number; width: number; height: number };
  machinedEnvelope: { length: number; width: number; height: number };
  machiningAllowanceMm: { general: number; criticalFaces: number; bores: number };
  draftAngleDeg: number;
  partingLine: string;
  coreRequirement: string;
  coreCount: number;
  criticalAreas: string[];
  draftAreas: string[];
  machinedAreas: string[];
  asCastAreas: string[];
  importantFeatures: string[];
  estimatedCastWeightKg: number;
  estimatedFinishWeightKg: number;
  /** Mass removed by machining, as a % of cast weight. */
  machiningRemovalPct: number;
  zones: CastingZone[];
  /** Geometry hints the SVG renderer uses to draw the section view. */
  render: CastingRenderModel;
}

/**
 * Minimal 2-D section model used by the CAD-style SVG renderer.
 * Intentionally decoupled from any CAD kernel so a real STEP/STL generator
 * can be swapped in behind the same interface (see src/integrations).
 */
export interface CastingRenderModel {
  /** Outline of the finished machined part, in model mm, as an SVG path. */
  machinedPath: string;
  /** Outline of the raw casting (machined outline + allowance), in model mm. */
  castingPath: string;
  /** Bores / cored features to subtract, drawn as separate paths. */
  features: {
    id: string;
    path: string;
    kind: "machined-bore" | "cored-hole" | "pocket";
    label: string;
  }[];
  /** Parting line as a straight line in model coordinates. */
  partingLine: { x1: number; y1: number; x2: number; y2: number };
  /** Draft arrows: origin + direction. */
  draftArrows: { x: number; y: number; dx: number; dy: number; label: string }[];
  /** Core placement markers. */
  cores: { x: number; y: number; r: number; label: string }[];
  /** Datum callouts positioned in model space. */
  datums: { x: number; y: number; label: string }[];
  /** Dimension annotations. */
  dimensions: {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    text: string;
    critical: boolean;
    /**
     * Which view the dimension belongs to. "casting" dimensions (raw envelope)
     * are hidden on the finished-component view; "part" dimensions are hidden
     * on the raw casting view; "both" applies to features common to each.
     */
    scope: "part" | "casting" | "both";
  }[];
  viewBox: { x: number; y: number; w: number; h: number };
}

export type Severity = "high" | "medium" | "low" | "info";

export interface FeasibilityIssue {
  id: string;
  category: string;
  /** Issue -> Location -> Reason -> Recommended action. */
  issue: string;
  location: string;
  reason: string;
  recommendedAction: string;
  severity: Severity;
  confidence: number;
  /** Always "ai" for engine output; becomes "validated" after sign-off. */
  provenance: Provenance;
}

export interface DefectRisk {
  id: string;
  defect: string;
  riskArea: string;
  possibleCause: string;
  preventiveAction: string;
  inspectionMethod: string;
  likelihood: Severity;
  confidence: number;
}

export interface ProcessRecommendation {
  process: CastingProcess;
  /** Alternatives with a one-line rationale. */
  alternatives: { process: CastingProcess; rationale: string; suitability: number }[];
  rationale: string[];
  /** Set when the drawing lacks the data needed to choose. */
  insufficientInformation: boolean;
  missingInputs: string[];
  recommendedMaterial: string;
  recommendedAllowanceMm: string;
  recommendedDraftAngleDeg: string;
  coreRequirement: string;
  approximateCastWeightKg: number;
  estimatedMachiningRequirement: string;
  criticalQualityCheckpoints: string[];
  confidence: number;
}

export interface InspectionCheck {
  id: string;
  group: string;
  checkParameter: string;
  specification: string;
  tolerance: string;
  inspectionMethod: string;
  instrument: string;
  frequency: string;
  acceptanceCriteria: string;
  /** "drawing" when the spec came off the print, "ai" when it came from a standard. */
  provenance: Provenance;
  reference?: string;
}

export interface InspectionStandard {
  id: string;
  drawingId: string;
  generatedAt: string;
  standardNumber: string;
  revision: string;
  checks: InspectionCheck[];
}

export interface ValidationSignoff {
  preparedBy: string;
  date: string;
  supplier: string;
  customer: string;
  qaApprover: string;
  qaApproved: boolean;
  engineeringApprover: string;
  engineeringApproved: boolean;
  remarks: string;
}

export interface CastingReport {
  id: string;
  drawingId: string;
  reportNumber: string;
  generatedAt: string;
  signoff: ValidationSignoff;
}

/** One row in the workflow history / dashboard. */
export interface WorkflowRecord {
  drawing: UploadedDrawing;
  analysis?: DrawingAnalysis;
  casting?: CastingConcept;
  feasibility?: FeasibilityIssue[];
  defects?: DefectRisk[];
  recommendation?: ProcessRecommendation;
  inspection?: InspectionStandard;
  report?: CastingReport;
  /** Engineering validation state for the whole record. */
  validation: {
    status: "pending" | "validated" | "rejected";
    validatedBy?: string;
    validatedAt?: string;
    note?: string;
  };
}

export interface AppSettings {
  preparedBy: string;
  organisation: string;
  supplier: string;
  customer: string;
  qaApprover: string;
  engineeringApprover: string;
  defaultUnits: "mm" | "inch";
  /** Machining allowance defaults, mm, used when the drawing is silent. */
  defaultAllowance: { general: number; criticalFaces: number; bores: number };
  defaultDraftAngleDeg: number;
  aiProvider: "built-in-demo" | "anthropic" | "custom-endpoint";
  aiModel: string;
  requireEngineeringValidation: boolean;
}
