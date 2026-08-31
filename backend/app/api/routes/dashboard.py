"""Dashboard and analytics aggregations."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.deps import DbSession, RequireViewer
from app.models import (
    Drawing,
    InspectionParameter,
    InspectionReport,
    InspectionResult,
    InspectionStandard,
    Part,
    ReportStatus,
    Supplier,
    User,
)
from app.schemas import DashboardSummary, NamedCount, ParetoPoint, TrendPoint

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

CLOSED = (ReportStatus.approved.value, ReportStatus.rejected.value)


@router.get("/summary", response_model=DashboardSummary)
def summary(db: DbSession, _: RequireViewer) -> DashboardSummary:
    total_drawings = db.scalar(select(func.count(Drawing.id))) or 0
    total_standards = db.scalar(select(func.count(InspectionStandard.id))) or 0
    total_reports = db.scalar(select(func.count(InspectionReport.id))) or 0
    completed = (
        db.scalar(
            select(func.count(InspectionReport.id)).where(InspectionReport.status.in_(CLOSED))
        )
        or 0
    )
    open_reports = total_reports - completed
    pending_approvals = (
        db.scalar(
            select(func.count(InspectionReport.id)).where(
                InspectionReport.status == ReportStatus.submitted.value
            )
        )
        or 0
    )

    passed = db.scalar(select(func.coalesce(func.sum(InspectionReport.passed_parameters), 0))) or 0
    failed = db.scalar(select(func.coalesce(func.sum(InspectionReport.failed_parameters), 0))) or 0
    critical = (
        db.scalar(select(func.coalesce(func.sum(InspectionReport.critical_failures), 0))) or 0
    )
    checked = passed + failed

    return DashboardSummary(
        total_drawings=total_drawings,
        total_standards=total_standards,
        total_reports=total_reports,
        completed_reports=completed,
        pass_rate=round(passed / checked * 100, 2) if checked else 0.0,
        fail_rate=round(failed / checked * 100, 2) if checked else 0.0,
        critical_defects=int(critical),
        parameters_checked=int(checked),
        open_reports=open_reports,
        pending_approvals=pending_approvals,
    )


@router.get("/trends", response_model=list[TrendPoint])
def trends(
    db: DbSession,
    _: RequireViewer,
    granularity: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    days: int = 90,
) -> list[TrendPoint]:
    since = date.today() - timedelta(days=max(days, 1))
    rows = db.execute(
        select(
            InspectionReport.inspection_date,
            InspectionReport.overall_result,
            InspectionReport.failed_parameters,
        ).where(InspectionReport.inspection_date >= since)
    ).all()

    buckets: dict[str, dict[str, int]] = defaultdict(
        lambda: {"inspections": 0, "passed": 0, "failed": 0}
    )
    for inspection_date, overall, failed_params in rows:
        if inspection_date is None:
            continue
        key = _bucket(inspection_date, granularity)
        buckets[key]["inspections"] += 1
        if overall == "ACCEPTED":
            buckets[key]["passed"] += 1
        elif failed_params:
            buckets[key]["failed"] += 1

    return [
        TrendPoint(period=key, **value) for key, value in sorted(buckets.items())
    ]


def _bucket(value: date, granularity: str) -> str:
    if granularity == "monthly":
        return value.strftime("%Y-%m")
    if granularity == "weekly":
        iso = value.isocalendar()
        return f"{iso.year}-W{iso.week:02d}"
    return value.isoformat()


@router.get("/pareto", response_model=list[ParetoPoint])
def pareto(db: DbSession, _: RequireViewer, limit: int = 10) -> list[ParetoPoint]:
    """Failure counts by inspection parameter, ordered and cumulated."""
    rows = db.execute(
        select(InspectionParameter.parameter, func.count(InspectionResult.id))
        .select_from(InspectionResult)
        .join(InspectionParameter, InspectionParameter.id == InspectionResult.parameter_id)
        .where(InspectionResult.result == "FAIL")
        .group_by(InspectionParameter.parameter)
        .order_by(func.count(InspectionResult.id).desc())
    ).all()

    total = sum(count for _label, count in rows)
    out: list[ParetoPoint] = []
    running = 0
    for label, count in rows[:limit]:
        running += count
        out.append(
            ParetoPoint(
                label=label,
                count=count,
                cumulative_pct=round(running / total * 100, 2) if total else 0.0,
            )
        )
    return out


@router.get("/suppliers", response_model=list[NamedCount])
def supplier_performance(db: DbSession, _: RequireViewer) -> list[NamedCount]:
    rows = db.execute(
        select(
            Supplier.name,
            func.count(InspectionReport.id),
            func.coalesce(func.sum(InspectionReport.passed_parameters), 0),
            func.coalesce(func.sum(InspectionReport.failed_parameters), 0),
        )
        .join(InspectionReport, InspectionReport.supplier_id == Supplier.id)
        .group_by(Supplier.name)
        .order_by(func.count(InspectionReport.id).desc())
    ).all()
    return [
        NamedCount(
            label=name,
            value=round(passed / (passed + failed) * 100, 2) if (passed + failed) else 0.0,
            secondary=reports,
        )
        for name, reports, passed, failed in rows
    ]


@router.get("/inspectors", response_model=list[NamedCount])
def inspector_performance(db: DbSession, _: RequireViewer) -> list[NamedCount]:
    rows = db.execute(
        select(
            User.full_name,
            func.count(InspectionReport.id),
            func.coalesce(func.sum(InspectionReport.failed_parameters), 0),
        )
        .join(InspectionReport, InspectionReport.inspector_id == User.id)
        .group_by(User.full_name)
        .order_by(func.count(InspectionReport.id).desc())
    ).all()
    return [
        NamedCount(label=name, value=reports, secondary=failures)
        for name, reports, failures in rows
    ]


@router.get("/parts", response_model=list[NamedCount])
def part_defect_analysis(db: DbSession, _: RequireViewer, limit: int = 10) -> list[NamedCount]:
    rows = db.execute(
        select(
            Part.part_number,
            func.coalesce(func.sum(InspectionReport.failed_parameters), 0),
            func.count(InspectionReport.id),
        )
        .join(InspectionReport, InspectionReport.part_id == Part.id)
        .group_by(Part.part_number)
        .order_by(func.coalesce(func.sum(InspectionReport.failed_parameters), 0).desc())
        .limit(limit)
    ).all()
    return [
        NamedCount(label=part_number, value=failures, secondary=reports)
        for part_number, failures, reports in rows
    ]


@router.get("/defect-types", response_model=list[NamedCount])
def defect_types(db: DbSession, _: RequireViewer, limit: int = 10) -> list[NamedCount]:
    rows = db.execute(
        select(InspectionParameter.classification, InspectionResult.id)
        .select_from(InspectionResult)
        .join(InspectionParameter, InspectionParameter.id == InspectionResult.parameter_id)
        .where(InspectionResult.result == "FAIL")
    ).all()
    counter = Counter(classification for classification, _ in rows)
    return [
        NamedCount(label=key, value=value)
        for key, value in counter.most_common(limit)
    ]
