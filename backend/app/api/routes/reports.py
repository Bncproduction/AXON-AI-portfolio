"""Digital inspection report: creation, result entry with automatic PASS/FAIL,
submission, QA approval and export."""

from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import func, select

from app.api.deps import (
    DbSession,
    RequireInspector,
    RequireQualityManager,
    RequireViewer,
    audit,
)
from app.core.config import settings
from app.models import (
    Approval,
    InspectionReport,
    InspectionResult,
    InspectionStandard,
    ReportStatus,
    StandardStatus,
)
from app.schemas import (
    QaDecisionIn,
    ReportCreate,
    ReportDetail,
    ReportHeaderUpdate,
    ReportOut,
    ResultsBulkIn,
    SignIn,
)
from app.services import exporters
from app.services.evaluation import PASS, PENDING, Spec, evaluate
from app.services.summary import ResultRow, summarise

router = APIRouter(prefix="/reports", tags=["reports"])


# --------------------------------------------------------------------------- listing
@router.get("", response_model=list[ReportOut])
def list_reports(
    db: DbSession,
    _: RequireViewer,
    q: str | None = None,
    report_status: str | None = None,
    supplier_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 200,
) -> list[InspectionReport]:
    stmt = select(InspectionReport).order_by(InspectionReport.id.desc()).limit(min(limit, 1000))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            InspectionReport.report_number.ilike(like)
            | InspectionReport.batch_number.ilike(like)
            | InspectionReport.po_number.ilike(like)
            | InspectionReport.invoice_number.ilike(like)
        )
    if report_status:
        stmt = stmt.where(InspectionReport.status == report_status)
    if supplier_id:
        stmt = stmt.where(InspectionReport.supplier_id == supplier_id)
    if date_from:
        stmt = stmt.where(InspectionReport.inspection_date >= date_from)
    if date_to:
        stmt = stmt.where(InspectionReport.inspection_date <= date_to)
    return list(db.scalars(stmt).unique())


@router.get("/{report_id}", response_model=ReportDetail)
def get_report(db: DbSession, _: RequireViewer, report_id: int) -> InspectionReport:
    return _get(db, report_id)


# --------------------------------------------------------------------------- creation
@router.post("", response_model=ReportDetail, status_code=status.HTTP_201_CREATED)
def create_report(
    db: DbSession, actor: RequireInspector, body: ReportCreate, request: Request
) -> InspectionReport:
    standard = db.get(InspectionStandard, body.standard_id)
    if standard is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inspection standard not found")
    if standard.status != StandardStatus.approved.value:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "The inspection standard must be approved before inspections can be recorded",
        )

    revision = standard.drawing_revision
    report = InspectionReport(
        report_number=_next_report_number(db),
        standard_id=standard.id,
        part_id=standard.part_id,
        drawing_id=revision.drawing_id if revision else None,
        drawing_revision=revision.revision if revision else None,
        supplier_id=body.supplier_id,
        company_name=body.company_name or settings.company_name,
        customer_name=body.customer_name
        or (standard.part.customer_name if standard.part else None),
        batch_number=body.batch_number,
        po_number=body.po_number,
        invoice_number=body.invoice_number,
        inspection_date=body.inspection_date or date.today(),
        shift=body.shift,
        machine_number=body.machine_number,
        operator_name=body.operator_name,
        inspector_id=actor.id,
        inspector_name=body.inspector_name or actor.full_name,
        lot_quantity=body.lot_quantity,
        sample_quantity=body.sample_quantity,
    )
    db.add(report)
    db.flush()

    for parameter in standard.parameters:
        db.add(
            InspectionResult(
                report_id=report.id,
                parameter_id=parameter.id,
                seq=parameter.seq,
                result=PENDING,
            )
        )
    db.flush()
    _recalculate(report)
    audit(db, actor, "report.create", "report", report.id, {"standard": standard.code}, request)
    db.commit()
    db.refresh(report)
    return report


@router.put("/{report_id}", response_model=ReportDetail)
def update_header(
    db: DbSession,
    actor: RequireInspector,
    report_id: int,
    body: ReportHeaderUpdate,
    request: Request,
) -> InspectionReport:
    report = _get_editable(db, report_id)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(report, key, value)
    audit(db, actor, "report.update", "report", report.id, request=request)
    db.commit()
    return report


# --------------------------------------------------------------------------- results
@router.put("/{report_id}/results", response_model=ReportDetail)
def save_results(
    db: DbSession,
    actor: RequireInspector,
    report_id: int,
    body: ResultsBulkIn,
    request: Request,
) -> InspectionReport:
    """Save measurements. Every row is re-evaluated server-side; the client's
    opinion of PASS/FAIL is never trusted (except an attribute verdict)."""
    report = _get_editable(db, report_id)
    by_parameter = {r.parameter_id: r for r in report.results}

    for incoming in body.results:
        row = by_parameter.get(incoming.parameter_id)
        if row is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Parameter {incoming.parameter_id} does not belong to this report",
            )
        parameter = row.parameter
        row.actual_value = incoming.actual_value
        row.actual_text = incoming.actual_text
        row.defect_id = incoming.defect_id
        row.remarks = incoming.remarks

        verdict = evaluate(
            Spec(
                nominal_value=parameter.nominal_value,
                upper_tolerance=parameter.upper_tolerance,
                lower_tolerance=parameter.lower_tolerance,
                is_attribute=parameter.is_attribute,
                requires_manual_verification=parameter.requires_manual_verification,
            ),
            actual_value=incoming.actual_value,
            actual_text=incoming.actual_text,
            manual_result=incoming.manual_result,
        )
        row.result = verdict.result
        row.deviation = verdict.deviation
        row.defect_description = incoming.defect_description or (
            None if verdict.result == PASS else verdict.reason
        )

    _recalculate(report)
    audit(
        db,
        actor,
        "report.results.save",
        "report",
        report.id,
        {"rows": len(body.results), "overall": report.overall_result},
        request,
    )
    db.commit()
    db.refresh(report)
    return report


# --------------------------------------------------------------------------- workflow
@router.post("/{report_id}/submit", response_model=ReportDetail)
def submit_report(
    db: DbSession, actor: RequireInspector, report_id: int, body: SignIn, request: Request
) -> InspectionReport:
    report = _get_editable(db, report_id)
    _recalculate(report)
    if report.pending_parameters:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{report.pending_parameters} parameter(s) still pending a result",
        )

    report.status = ReportStatus.submitted.value
    report.inspector_signature = body.signature
    report.inspector_signed_at = datetime.now(timezone.utc)
    db.add(
        Approval(
            entity_type="report",
            entity_id=report.id,
            action="submit",
            status="submitted",
            actor_id=actor.id,
        )
    )
    audit(db, actor, "report.submit", "report", report.id, request=request)
    db.commit()
    db.refresh(report)
    return report


@router.post("/{report_id}/qa-approve", response_model=ReportDetail)
def qa_decision(
    db: DbSession,
    actor: RequireQualityManager,
    report_id: int,
    body: QaDecisionIn,
    request: Request,
) -> InspectionReport:
    report = _get(db, report_id)
    if report.status != ReportStatus.submitted.value:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Only a submitted report can be approved or rejected"
        )

    for field in ("accepted_quantity", "rejected_quantity", "rework_quantity"):
        value = getattr(body, field)
        if value is not None:
            setattr(report, field, value)

    report.status = (
        ReportStatus.approved.value if body.decision == "approved" else ReportStatus.rejected.value
    )
    report.qa_approver_id = actor.id
    report.qa_signature = body.signature
    report.qa_remarks = body.remarks
    report.qa_approved_at = datetime.now(timezone.utc)
    db.add(
        Approval(
            entity_type="report",
            entity_id=report.id,
            action="qa_decision",
            status=body.decision,
            actor_id=actor.id,
            remarks=body.remarks,
        )
    )
    audit(db, actor, f"report.qa.{body.decision}", "report", report.id, request=request)
    db.commit()
    db.refresh(report)
    return report


# --------------------------------------------------------------------------- exports
@router.get("/{report_id}/export.pdf")
def export_pdf(db: DbSession, _: RequireViewer, report_id: int) -> Response:
    report = _get(db, report_id)
    return Response(
        content=exporters.to_pdf(report),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{report.report_number}.pdf"'
        },
    )


@router.get("/{report_id}/export.xlsx")
def export_xlsx(db: DbSession, _: RequireViewer, report_id: int) -> Response:
    report = _get(db, report_id)
    return Response(
        content=exporters.to_xlsx(report),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{report.report_number}.xlsx"'
        },
    )


# --------------------------------------------------------------------------- helpers
def _recalculate(report: InspectionReport) -> None:
    """Refresh the stored summary from the current result rows."""
    rows = [ResultRow(r.result, r.parameter.classification) for r in report.results]
    s = summarise(rows)
    report.total_parameters = s.total
    report.passed_parameters = s.passed
    report.failed_parameters = s.failed
    report.pending_parameters = s.pending
    report.critical_failures = s.critical_failures
    report.major_failures = s.major_failures
    report.minor_failures = s.minor_failures
    report.overall_result = s.overall_result

    # Default lot disposition; the Quality Manager can override it at approval.
    if report.status == ReportStatus.draft.value and report.lot_quantity:
        if s.overall_result == "ACCEPTED":
            report.accepted_quantity = report.lot_quantity
            report.rejected_quantity = report.rework_quantity = 0
        elif s.overall_result == "REJECTED":
            report.rejected_quantity = report.lot_quantity
            report.accepted_quantity = report.rework_quantity = 0


def _next_report_number(db: DbSession) -> str:
    year = date.today().year
    prefix = f"IR-{year}-"
    count = db.scalar(
        select(func.count(InspectionReport.id)).where(
            InspectionReport.report_number.like(f"{prefix}%")
        )
    )
    return f"{prefix}{(count or 0) + 1:05d}"


def _get(db: DbSession, report_id: int) -> InspectionReport:
    report = db.get(InspectionReport, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inspection report not found")
    return report


def _get_editable(db: DbSession, report_id: int) -> InspectionReport:
    report = _get(db, report_id)
    if report.status in (ReportStatus.approved.value, ReportStatus.rejected.value):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A closed report cannot be modified"
        )
    return report
