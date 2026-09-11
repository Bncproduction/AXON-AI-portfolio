"""Pydantic v2 request/response models."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --------------------------------------------------------------------------- auth
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserOut(ORMModel):
    id: int
    email: str
    full_name: str
    role: str
    employee_code: str | None = None
    is_active: bool


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8)
    role: str = "viewer"
    employee_code: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8)


# --------------------------------------------------------------------------- masters
class SupplierOut(ORMModel):
    id: int
    code: str
    name: str
    contact_email: str | None = None
    contact_phone: str | None = None
    rating: str | None = None
    is_active: bool


class SupplierCreate(BaseModel):
    code: str
    name: str
    contact_email: str | None = None
    contact_phone: str | None = None
    rating: str | None = None


class InstrumentOut(ORMModel):
    id: int
    code: str
    name: str
    type: str | None = None
    least_count: str | None = None
    range_text: str | None = None
    calibration_due: date | None = None
    is_active: bool


class InstrumentCreate(BaseModel):
    code: str
    name: str
    type: str | None = None
    least_count: str | None = None
    range_text: str | None = None
    calibration_due: date | None = None


class DefectOut(ORMModel):
    id: int
    code: str
    name: str
    category: str | None = None
    severity: str


class PartOut(ORMModel):
    id: int
    part_number: str
    part_name: str
    material: str | None = None
    customer_name: str | None = None
    supplier: SupplierOut | None = None


class PartCreate(BaseModel):
    part_number: str
    part_name: str
    material: str | None = None
    customer_name: str | None = None
    supplier_id: int | None = None


# --------------------------------------------------------------------------- drawings
class DrawingRevisionOut(ORMModel):
    id: int
    drawing_id: int
    revision: str
    is_current: bool
    status: str
    extraction_confidence: float | None = None
    extraction_engine: str | None = None
    extraction_error: str | None = None
    analyzed_at: datetime | None = None
    verified_at: datetime | None = None
    created_at: datetime


class DrawingRevisionDetail(DrawingRevisionOut):
    extraction_json: dict | None = None


class DrawingOut(ORMModel):
    id: int
    drawing_number: str
    title: str | None = None
    file_name: str
    mime_type: str
    file_size: int
    status: str
    created_at: datetime
    part: PartOut | None = None
    uploaded_by: UserOut | None = None


class DrawingDetail(DrawingOut):
    revisions: list[DrawingRevisionOut] = []


class ExtractionUpdate(BaseModel):
    extraction: dict


# --------------------------------------------------------------------------- standards
class ParameterIn(BaseModel):
    id: int | None = None
    seq: int = 1
    parameter: str
    specification: str = ""
    nominal_value: float | None = None
    upper_tolerance: float | None = None
    lower_tolerance: float | None = None
    unit: str | None = None
    inspection_method: str | None = None
    instrument_id: int | None = None
    instrument_text: str | None = None
    frequency: str | None = None
    sampling_plan: str | None = None
    acceptance_criteria: str | None = None
    classification: str = "minor"
    reference_dimension: str | None = None
    remarks: str | None = None
    is_attribute: bool = False
    requires_manual_verification: bool = False
    source_confidence: float | None = None
    source_note: str | None = None


class ParameterOut(ORMModel):
    id: int
    seq: int
    parameter: str
    specification: str
    nominal_value: float | None = None
    upper_tolerance: float | None = None
    lower_tolerance: float | None = None
    unit: str | None = None
    inspection_method: str | None = None
    instrument_id: int | None = None
    instrument_text: str | None = None
    frequency: str | None = None
    sampling_plan: str | None = None
    acceptance_criteria: str | None = None
    classification: str
    reference_dimension: str | None = None
    remarks: str | None = None
    is_attribute: bool
    requires_manual_verification: bool
    source_confidence: float | None = None
    source_note: str | None = None


class StandardOut(ORMModel):
    id: int
    code: str
    title: str
    version: int
    status: str
    notes: str | None = None
    drawing_revision_id: int
    created_at: datetime
    approved_at: datetime | None = None
    part: PartOut | None = None
    created_by: UserOut | None = None
    approved_by: UserOut | None = None
    parameter_count: int = 0
    unverified_count: int = 0


class StandardDetail(StandardOut):
    parameters: list[ParameterOut] = []


class StandardUpdate(BaseModel):
    title: str | None = None
    notes: str | None = None


class ParametersReplace(BaseModel):
    parameters: list[ParameterIn]


class ApproveIn(BaseModel):
    remarks: str | None = None


# --------------------------------------------------------------------------- reports
class ReportCreate(BaseModel):
    standard_id: int
    supplier_id: int | None = None
    company_name: str | None = None
    customer_name: str | None = None
    batch_number: str | None = None
    po_number: str | None = None
    invoice_number: str | None = None
    inspection_date: date | None = None
    shift: str | None = None
    machine_number: str | None = None
    operator_name: str | None = None
    inspector_name: str | None = None
    lot_quantity: int = 0
    sample_quantity: int = 0


class ReportHeaderUpdate(BaseModel):
    supplier_id: int | None = None
    company_name: str | None = None
    customer_name: str | None = None
    batch_number: str | None = None
    po_number: str | None = None
    invoice_number: str | None = None
    inspection_date: date | None = None
    shift: str | None = None
    machine_number: str | None = None
    operator_name: str | None = None
    inspector_name: str | None = None
    lot_quantity: int | None = None
    sample_quantity: int | None = None
    accepted_quantity: int | None = None
    rejected_quantity: int | None = None
    rework_quantity: int | None = None


class ResultIn(BaseModel):
    parameter_id: int
    actual_value: float | None = None
    actual_text: str | None = None
    manual_result: str | None = None  # only honoured for attribute parameters
    defect_id: int | None = None
    defect_description: str | None = None
    remarks: str | None = None


class ResultsBulkIn(BaseModel):
    results: list[ResultIn]


class ResultOut(ORMModel):
    id: int
    seq: int
    parameter_id: int
    actual_value: float | None = None
    actual_text: str | None = None
    result: str
    deviation: float | None = None
    defect_id: int | None = None
    defect_description: str | None = None
    remarks: str | None = None
    parameter: ParameterOut


class ReportOut(ORMModel):
    id: int
    report_number: str
    standard_id: int
    status: str
    overall_result: str
    inspection_date: date | None = None
    batch_number: str | None = None
    po_number: str | None = None
    invoice_number: str | None = None
    shift: str | None = None
    machine_number: str | None = None
    operator_name: str | None = None
    inspector_name: str | None = None
    company_name: str | None = None
    customer_name: str | None = None
    drawing_revision: str | None = None
    lot_quantity: int
    sample_quantity: int
    accepted_quantity: int
    rejected_quantity: int
    rework_quantity: int
    total_parameters: int
    passed_parameters: int
    failed_parameters: int
    pending_parameters: int
    critical_failures: int
    major_failures: int
    minor_failures: int
    inspector_signature: str | None = None
    inspector_signed_at: datetime | None = None
    qa_signature: str | None = None
    qa_approved_at: datetime | None = None
    qa_remarks: str | None = None
    created_at: datetime
    part: PartOut | None = None
    supplier: SupplierOut | None = None
    drawing: DrawingOut | None = None
    qa_approver: UserOut | None = None


class ReportDetail(ReportOut):
    results: list[ResultOut] = []


class SignIn(BaseModel):
    signature: str


class QaDecisionIn(BaseModel):
    decision: str = Field(pattern="^(approved|rejected)$")
    signature: str
    remarks: str | None = None
    accepted_quantity: int | None = None
    rejected_quantity: int | None = None
    rework_quantity: int | None = None


# --------------------------------------------------------------------------- dashboard
class DashboardSummary(BaseModel):
    total_drawings: int
    total_standards: int
    total_reports: int
    completed_reports: int
    pass_rate: float
    fail_rate: float
    critical_defects: int
    parameters_checked: int
    open_reports: int
    pending_approvals: int


class NamedCount(BaseModel):
    label: str
    value: float
    secondary: float = 0


class TrendPoint(BaseModel):
    period: str
    inspections: int
    passed: int
    failed: int


class ParetoPoint(BaseModel):
    label: str
    count: int
    cumulative_pct: float


# `Token` is declared before `UserOut`; finalise the forward reference.
Token.model_rebuild()
