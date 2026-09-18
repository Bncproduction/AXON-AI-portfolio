/**
 * Integration seams.
 *
 * Nothing here talks to a live system yet — each entry defines the interface
 * an adapter must implement and records its current status, so the surrounding
 * application can be wired to real CAD, ERP, PLM, MES, SQM and digital
 * inspection systems without reshaping the domain model.
 *
 * Contract rules that every adapter must honour:
 *  1. Data pulled from an external system is provenance "drawing" or
 *     "validated" only if that system is the system of record for it.
 *     Anything derived stays "ai".
 *  2. No adapter may mark a record validated on the AI's behalf; validation
 *     always originates from an authorised human approver.
 */

import type {
  CastingConcept,
  DrawingAnalysis,
  InspectionStandard,
  UploadedDrawing,
  WorkflowRecord,
} from "@/lib/types";

export type IntegrationStatus = "planned" | "interface-defined" | "available";

export interface IntegrationDescriptor {
  id: string;
  name: string;
  category: "CAD" | "File format" | "Enterprise" | "Quality";
  status: IntegrationStatus;
  purpose: string;
  /** The seam in this codebase an adapter plugs into. */
  seam: string;
}

/** Converts a native CAD file into something the extraction stage can read. */
export interface CadConversionAdapter {
  id: string;
  /** Extensions handled, lower case, no dot. */
  handles: string[];
  /** Returns a raster/PDF preview plus, where possible, vector entities. */
  convert(file: File): Promise<{ previewDataUrl?: string; entities?: unknown }>;
}

/** Produces 3-D geometry for the casting concept instead of the 2-D section model. */
export interface ModelGenerationAdapter {
  id: string;
  /** STEP/STP or STL payload for the proposed raw casting. */
  generate(casting: CastingConcept, format: "step" | "stl"): Promise<Blob>;
}

/** Reads and writes part / BOM master data. */
export interface ErpAdapter {
  id: string;
  fetchPart(partNumber: string): Promise<{ description: string; uom: string; standardCost?: number } | null>;
  postCastingItem(casting: CastingConcept): Promise<{ itemNumber: string }>;
}

/** Reads the released drawing and its revision state. */
export interface PlmAdapter {
  id: string;
  fetchLatestRevision(drawingNumber: string): Promise<{ revision: string; releasedAt: string; url: string } | null>;
  attachReport(drawingNumber: string, report: Blob): Promise<{ documentId: string }>;
}

/** Pushes the inspection standard into shop-floor execution. */
export interface MesAdapter {
  id: string;
  publishInspectionPlan(standard: InspectionStandard): Promise<{ planId: string }>;
}

/** Supplier quality: PPAP/FAIR packages and supplier scorecards. */
export interface SupplierQualityAdapter {
  id: string;
  submitFair(record: WorkflowRecord): Promise<{ submissionId: string }>;
}

/** Digital gauges / CMM result ingestion against the generated standard. */
export interface DigitalInspectionAdapter {
  id: string;
  pullResults(standardNumber: string): Promise<
    { checkId: string; measured: string; pass: boolean; measuredAt: string }[]
  >;
}

/** Replaces the built-in rule engine with a real vision model. */
export interface ExtractionAdapter {
  id: string;
  extract(drawing: UploadedDrawing, bytes: ArrayBuffer): Promise<DrawingAnalysis>;
}

export const INTEGRATIONS: IntegrationDescriptor[] = [
  {
    id: "cad-api",
    name: "CAD APIs",
    category: "CAD",
    status: "interface-defined",
    purpose: "Read native CAD geometry instead of inferring a section model from the drawing.",
    seam: "CadConversionAdapter · src/integrations/index.ts",
  },
  {
    id: "model-3d",
    name: "3D model generation",
    category: "CAD",
    status: "interface-defined",
    purpose: "Generate a solid raw-casting model rather than the 2-D parametric section used today.",
    seam: "ModelGenerationAdapter · replaces buildRenderModel in src/lib/engine/geometry.ts",
  },
  {
    id: "step",
    name: "STEP / STP export",
    category: "File format",
    status: "planned",
    purpose: "Hand the casting concept to the pattern shop and to simulation in a neutral solid format.",
    seam: "ModelGenerationAdapter.generate(casting, 'step')",
  },
  {
    id: "stl",
    name: "STL export",
    category: "File format",
    status: "planned",
    purpose: "Feed 3-D printed pattern and core-box production.",
    seam: "ModelGenerationAdapter.generate(casting, 'stl')",
  },
  {
    id: "dwg-dxf",
    name: "DWG / DXF processing",
    category: "File format",
    status: "interface-defined",
    purpose: "Render and parse DWG/DXF uploads, which cannot be displayed natively in a browser.",
    seam: "CadConversionAdapter.convert · called from the upload handler",
  },
  {
    id: "vision-extraction",
    name: "Vision model extraction",
    category: "CAD",
    status: "interface-defined",
    purpose: "Replace the built-in demo extraction with a real drawing-reading model.",
    seam: "ExtractionAdapter · swap the body of src/app/api/analyze/route.ts",
  },
  {
    id: "erp",
    name: "ERP",
    category: "Enterprise",
    status: "interface-defined",
    purpose: "Pull part master data and create the raw-casting item once the concept is validated.",
    seam: "ErpAdapter",
  },
  {
    id: "plm",
    name: "PLM",
    category: "Enterprise",
    status: "interface-defined",
    purpose: "Confirm the drawing revision is the released one and file the report against it.",
    seam: "PlmAdapter",
  },
  {
    id: "mes",
    name: "MES",
    category: "Enterprise",
    status: "interface-defined",
    purpose: "Publish the generated inspection standard as an executable shop-floor plan.",
    seam: "MesAdapter",
  },
  {
    id: "sqm",
    name: "Supplier Quality Management",
    category: "Quality",
    status: "interface-defined",
    purpose: "Route the casting analysis report into the FAIR / PPAP submission flow.",
    seam: "SupplierQualityAdapter",
  },
  {
    id: "digital-inspection",
    name: "Digital inspection systems",
    category: "Quality",
    status: "interface-defined",
    purpose: "Close the loop by pulling CMM and gauge results back against each generated check.",
    seam: "DigitalInspectionAdapter",
  },
];
