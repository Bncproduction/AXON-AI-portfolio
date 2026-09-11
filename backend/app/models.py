"""SQLAlchemy ORM models for the whole domain."""

from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# --------------------------------------------------------------------------- enums
class UserRole(str, Enum):
    admin = "admin"
    quality_manager = "quality_manager"
    inspector = "inspector"
    viewer = "viewer"


ROLE_RANK: dict[str, int] = {
    UserRole.viewer: 0,
    UserRole.inspector: 1,
    UserRole.quality_manager: 2,
    UserRole.admin: 3,
}


class DrawingStatus(str, Enum):
    uploaded = "uploaded"
    analyzing = "analyzing"
    analyzed = "analyzed"
    failed = "failed"


class StandardStatus(str, Enum):
    draft = "draft"
    approved = "approved"
    archived = "archived"


class ReportStatus(str, Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"


class Classification(str, Enum):
    critical = "critical"
    major = "major"
    minor = "minor"


class ResultValue(str, Enum):
    pass_ = "PASS"
    fail = "FAIL"
    pending = "PENDING"
    na = "NA"


class OverallResult(str, Enum):
    accepted = "ACCEPTED"
    accepted_with_deviation = "ACCEPTED_WITH_DEVIATION"
    rejected = "REJECTED"
    pending = "PENDING"


# --------------------------------------------------------------------------- master data
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default=UserRole.viewer.value)
    employee_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    rating: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Instrument(Base):
    __tablename__ = "instruments"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    least_count: Mapped[str | None] = mapped_column(String(40), nullable=True)
    range_text: Mapped[str | None] = mapped_column(String(80), nullable=True)
    calibration_due: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Defect(Base):
    __tablename__ = "defects"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    severity: Mapped[str] = mapped_column(String(20), default=Classification.major.value)


class Part(Base):
    __tablename__ = "parts"

    id: Mapped[int] = mapped_column(primary_key=True)
    part_number: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    part_name: Mapped[str] = mapped_column(String(200))
    material: Mapped[str | None] = mapped_column(String(160), nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    supplier: Mapped[Supplier | None] = relationship(lazy="joined")
    drawings: Mapped[list[Drawing]] = relationship(back_populates="part")


# --------------------------------------------------------------------------- drawings
class Drawing(Base):
    __tablename__ = "drawings"

    id: Mapped[int] = mapped_column(primary_key=True)
    drawing_number: Mapped[str] = mapped_column(String(80), index=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    part_id: Mapped[int | None] = mapped_column(ForeignKey("parts.id"), nullable=True)
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    mime_type: Mapped[str] = mapped_column(String(120))
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default=DrawingStatus.uploaded.value)
    uploaded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    part: Mapped[Part | None] = relationship(back_populates="drawings", lazy="joined")
    uploaded_by: Mapped[User | None] = relationship(lazy="joined")
    revisions: Mapped[list[DrawingRevision]] = relationship(
        back_populates="drawing", cascade="all, delete-orphan", order_by="DrawingRevision.id"
    )


class DrawingRevision(Base):
    __tablename__ = "drawing_revisions"
    __table_args__ = (UniqueConstraint("drawing_id", "revision", name="uq_drawing_revision"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    drawing_id: Mapped[int] = mapped_column(ForeignKey("drawings.id", ondelete="CASCADE"))
    revision: Mapped[str] = mapped_column(String(20), default="-")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default=DrawingStatus.uploaded.value)
    extraction_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    extraction_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    extraction_engine: Mapped[str | None] = mapped_column(String(80), nullable=True)
    extraction_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    analyzed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    drawing: Mapped[Drawing] = relationship(back_populates="revisions", lazy="joined")


# --------------------------------------------------------------------------- standards
class InspectionStandard(Base):
    __tablename__ = "inspection_standards"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(240))
    drawing_revision_id: Mapped[int] = mapped_column(ForeignKey("drawing_revisions.id"))
    part_id: Mapped[int | None] = mapped_column(ForeignKey("parts.id"), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default=StandardStatus.draft.value)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    drawing_revision: Mapped[DrawingRevision] = relationship(lazy="joined")
    part: Mapped[Part | None] = relationship(lazy="joined")
    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_id], lazy="joined")
    approved_by: Mapped[User | None] = relationship(foreign_keys=[approved_by_id], lazy="joined")
    parameters: Mapped[list[InspectionParameter]] = relationship(
        back_populates="standard",
        cascade="all, delete-orphan",
        order_by="InspectionParameter.seq",
    )

    @property
    def parameter_count(self) -> int:
        return len(self.parameters)

    @property
    def unverified_count(self) -> int:
        return sum(1 for p in self.parameters if p.requires_manual_verification)


class InspectionParameter(Base):
    __tablename__ = "inspection_parameters"

    id: Mapped[int] = mapped_column(primary_key=True)
    standard_id: Mapped[int] = mapped_column(
        ForeignKey("inspection_standards.id", ondelete="CASCADE")
    )
    seq: Mapped[int] = mapped_column(Integer, default=1)
    parameter: Mapped[str] = mapped_column(String(240))
    specification: Mapped[str] = mapped_column(String(240), default="")
    nominal_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    upper_tolerance: Mapped[float | None] = mapped_column(Float, nullable=True)
    lower_tolerance: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(24), nullable=True)
    inspection_method: Mapped[str | None] = mapped_column(String(160), nullable=True)
    instrument_id: Mapped[int | None] = mapped_column(ForeignKey("instruments.id"), nullable=True)
    instrument_text: Mapped[str | None] = mapped_column(String(160), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sampling_plan: Mapped[str | None] = mapped_column(String(160), nullable=True)
    acceptance_criteria: Mapped[str | None] = mapped_column(String(240), nullable=True)
    classification: Mapped[str] = mapped_column(String(20), default=Classification.minor.value)
    reference_dimension: Mapped[str | None] = mapped_column(String(120), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_attribute: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_manual_verification: Mapped[bool] = mapped_column(Boolean, default=False)
    source_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    source_note: Mapped[str | None] = mapped_column(String(400), nullable=True)

    standard: Mapped[InspectionStandard] = relationship(back_populates="parameters")
    instrument: Mapped[Instrument | None] = relationship(lazy="joined")


# --------------------------------------------------------------------------- reports
class InspectionReport(Base):
    __tablename__ = "inspection_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_number: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    standard_id: Mapped[int] = mapped_column(ForeignKey("inspection_standards.id"))
    part_id: Mapped[int | None] = mapped_column(ForeignKey("parts.id"), nullable=True)
    drawing_id: Mapped[int | None] = mapped_column(ForeignKey("drawings.id"), nullable=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True)

    company_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    drawing_revision: Mapped[str | None] = mapped_column(String(20), nullable=True)
    batch_number: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    po_number: Mapped[str | None] = mapped_column(String(80), nullable=True)
    invoice_number: Mapped[str | None] = mapped_column(String(80), nullable=True)
    inspection_date: Mapped[date | None] = mapped_column(Date, index=True, nullable=True)
    shift: Mapped[str | None] = mapped_column(String(20), nullable=True)
    machine_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    operator_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    inspector_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    inspector_name: Mapped[str | None] = mapped_column(String(120), nullable=True)

    lot_quantity: Mapped[int] = mapped_column(Integer, default=0)
    sample_quantity: Mapped[int] = mapped_column(Integer, default=0)
    accepted_quantity: Mapped[int] = mapped_column(Integer, default=0)
    rejected_quantity: Mapped[int] = mapped_column(Integer, default=0)
    rework_quantity: Mapped[int] = mapped_column(Integer, default=0)

    total_parameters: Mapped[int] = mapped_column(Integer, default=0)
    passed_parameters: Mapped[int] = mapped_column(Integer, default=0)
    failed_parameters: Mapped[int] = mapped_column(Integer, default=0)
    pending_parameters: Mapped[int] = mapped_column(Integer, default=0)
    critical_failures: Mapped[int] = mapped_column(Integer, default=0)
    major_failures: Mapped[int] = mapped_column(Integer, default=0)
    minor_failures: Mapped[int] = mapped_column(Integer, default=0)
    overall_result: Mapped[str] = mapped_column(String(30), default=OverallResult.pending.value)

    status: Mapped[str] = mapped_column(String(20), default=ReportStatus.draft.value)
    inspector_signature: Mapped[str | None] = mapped_column(String(160), nullable=True)
    inspector_signed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    qa_approver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    qa_signature: Mapped[str | None] = mapped_column(String(160), nullable=True)
    qa_approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    qa_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    standard: Mapped[InspectionStandard] = relationship(lazy="joined")
    part: Mapped[Part | None] = relationship(lazy="joined")
    drawing: Mapped[Drawing | None] = relationship(lazy="joined")
    supplier: Mapped[Supplier | None] = relationship(lazy="joined")
    inspector: Mapped[User | None] = relationship(foreign_keys=[inspector_id], lazy="joined")
    qa_approver: Mapped[User | None] = relationship(foreign_keys=[qa_approver_id], lazy="joined")
    results: Mapped[list[InspectionResult]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="InspectionResult.seq"
    )


class InspectionResult(Base):
    __tablename__ = "inspection_results"
    __table_args__ = (UniqueConstraint("report_id", "parameter_id", name="uq_report_parameter"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("inspection_reports.id", ondelete="CASCADE"))
    parameter_id: Mapped[int] = mapped_column(ForeignKey("inspection_parameters.id"))
    seq: Mapped[int] = mapped_column(Integer, default=1)
    actual_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    actual_text: Mapped[str | None] = mapped_column(String(240), nullable=True)
    result: Mapped[str] = mapped_column(String(10), default=ResultValue.pending.value)
    deviation: Mapped[float | None] = mapped_column(Float, nullable=True)
    defect_id: Mapped[int | None] = mapped_column(ForeignKey("defects.id"), nullable=True)
    defect_description: Mapped[str | None] = mapped_column(String(400), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    report: Mapped[InspectionReport] = relationship(back_populates="results")
    parameter: Mapped[InspectionParameter] = relationship(lazy="joined")
    defect: Mapped[Defect | None] = relationship(lazy="joined")


# --------------------------------------------------------------------------- governance
class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(40), index=True)
    entity_id: Mapped[int] = mapped_column(Integer, index=True)
    action: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20))
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    actor: Mapped[User | None] = relationship(lazy="joined")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    entity_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(60), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
