export type Role = "admin" | "quality_manager" | "inspector" | "viewer";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  employee_code?: string | null;
  is_active: boolean;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  rating?: string | null;
  is_active: boolean;
}

export interface Instrument {
  id: number;
  code: string;
  name: string;
  type?: string | null;
  least_count?: string | null;
  range_text?: string | null;
  calibration_due?: string | null;
  is_active: boolean;
}

export interface Defect {
  id: number;
  code: string;
  name: string;
  category?: string | null;
  severity: string;
}

export interface Part {
  id: number;
  part_number: string;
  part_name: string;
  material?: string | null;
  customer_name?: string | null;
  supplier?: Supplier | null;
}

export interface DrawingRevision {
  id: number;
  drawing_id: number;
  revision: string;
  is_current: boolean;
  status: string;
  extraction_confidence?: number | null;
  extraction_engine?: string | null;
  extraction_error?: string | null;
  analyzed_at?: string | null;
  verified_at?: string | null;
  created_at: string;
  extraction_json?: Extraction | null;
}

export interface Drawing {
  id: number;
  drawing_number: string;
  title?: string | null;
  file_name: string;
  mime_type: string;
  file_size: number;
  status: "uploaded" | "analyzing" | "analyzed" | "failed";
  created_at: string;
  part?: Part | null;
  uploaded_by?: User | null;
  revisions?: DrawingRevision[];
}

export interface ExtractedDimension {
  label: string;
  reference?: string | null;
  dimension_type: string;
  nominal_value: number | null;
  upper_tolerance: number | null;
  lower_tolerance: number | null;
  unit?: string | null;
  specification_text: string;
  gdt_symbol?: string | null;
  datums?: string | null;
  material_condition?: string | null;
  classification: "critical" | "major" | "minor";
  confidence: number;
  source_note: string;
  requires_manual_verification: boolean;
  verification_reasons: string[];
}

export interface Extraction {
  part_name: string | null;
  part_number: string | null;
  drawing_number: string | null;
  drawing_revision: string | null;
  material: string | null;
  units: string;
  scale?: string | null;
  general_tolerance_note?: string | null;
  title_block_confidence: number;
  header_requires_verification: Record<string, boolean>;
  dimensions: ExtractedDimension[];
  notes: { text: string; is_inspection_requirement?: boolean; confidence: number }[];
  unreadable_areas: string[];
  pages_analysed: number;
  engine: string;
  confidence_threshold: number;
  overall_confidence: number;
  unverified_count: number;
}

export interface Parameter {
  id: number;
  seq: number;
  parameter: string;
  specification: string;
  nominal_value: number | null;
  upper_tolerance: number | null;
  lower_tolerance: number | null;
  unit?: string | null;
  inspection_method?: string | null;
  instrument_id?: number | null;
  instrument_text?: string | null;
  frequency?: string | null;
  sampling_plan?: string | null;
  acceptance_criteria?: string | null;
  classification: "critical" | "major" | "minor";
  reference_dimension?: string | null;
  remarks?: string | null;
  is_attribute: boolean;
  requires_manual_verification: boolean;
  source_confidence?: number | null;
  source_note?: string | null;
}

export interface Standard {
  id: number;
  code: string;
  title: string;
  version: number;
  status: "draft" | "approved" | "archived";
  notes?: string | null;
  drawing_revision_id: number;
  created_at: string;
  approved_at?: string | null;
  part?: Part | null;
  created_by?: User | null;
  approved_by?: User | null;
  parameter_count: number;
  unverified_count: number;
  parameters?: Parameter[];
}

export type ResultValue = "PASS" | "FAIL" | "PENDING" | "NA";

export interface InspectionResultRow {
  id: number;
  seq: number;
  parameter_id: number;
  actual_value: number | null;
  actual_text: string | null;
  result: ResultValue;
  deviation: number | null;
  defect_id: number | null;
  defect_description: string | null;
  remarks: string | null;
  parameter: Parameter;
}

export interface Report {
  id: number;
  report_number: string;
  standard_id: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  overall_result: "ACCEPTED" | "ACCEPTED_WITH_DEVIATION" | "REJECTED" | "PENDING";
  inspection_date: string | null;
  batch_number: string | null;
  po_number: string | null;
  invoice_number: string | null;
  shift: string | null;
  machine_number: string | null;
  operator_name: string | null;
  inspector_name: string | null;
  company_name: string | null;
  customer_name: string | null;
  drawing_revision: string | null;
  lot_quantity: number;
  sample_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  rework_quantity: number;
  total_parameters: number;
  passed_parameters: number;
  failed_parameters: number;
  pending_parameters: number;
  critical_failures: number;
  major_failures: number;
  minor_failures: number;
  inspector_signature: string | null;
  inspector_signed_at: string | null;
  qa_signature: string | null;
  qa_approved_at: string | null;
  qa_remarks: string | null;
  created_at: string;
  part?: Part | null;
  supplier?: Supplier | null;
  drawing?: Drawing | null;
  qa_approver?: User | null;
  results?: InspectionResultRow[];
}

export interface DashboardSummary {
  total_drawings: number;
  total_standards: number;
  total_reports: number;
  completed_reports: number;
  pass_rate: number;
  fail_rate: number;
  critical_defects: number;
  parameters_checked: number;
  open_reports: number;
  pending_approvals: number;
}

export interface NamedCount {
  label: string;
  value: number;
  secondary: number;
}

export interface TrendPoint {
  period: string;
  inspections: number;
  passed: number;
  failed: number;
}

export interface ParetoPoint {
  label: string;
  count: number;
  cumulative_pct: number;
}
