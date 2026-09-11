"""Inspection standard: read, edit parameter grid, approve."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import DbSession, RequireQualityManager, RequireViewer, audit
from app.models import (
    Approval,
    InspectionParameter,
    InspectionStandard,
    StandardStatus,
)
from app.schemas import (
    ApproveIn,
    ParametersReplace,
    StandardDetail,
    StandardOut,
    StandardUpdate,
)

router = APIRouter(prefix="/standards", tags=["standards"])


@router.get("", response_model=list[StandardOut])
def list_standards(
    db: DbSession, _: RequireViewer, q: str | None = None, standard_status: str | None = None
) -> list[InspectionStandard]:
    stmt = select(InspectionStandard).order_by(InspectionStandard.id.desc())
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            InspectionStandard.code.ilike(like) | InspectionStandard.title.ilike(like)
        )
    if standard_status:
        stmt = stmt.where(InspectionStandard.status == standard_status)
    return list(db.scalars(stmt).unique())


@router.get("/{standard_id}", response_model=StandardDetail)
def get_standard(db: DbSession, _: RequireViewer, standard_id: int) -> InspectionStandard:
    return _get(db, standard_id)


@router.put("/{standard_id}", response_model=StandardDetail)
def update_standard(
    db: DbSession,
    actor: RequireQualityManager,
    standard_id: int,
    body: StandardUpdate,
    request: Request,
) -> InspectionStandard:
    standard = _get_editable(db, standard_id)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(standard, key, value)
    audit(db, actor, "standard.update", "standard", standard.id, request=request)
    db.commit()
    return standard


@router.put("/{standard_id}/parameters", response_model=StandardDetail)
def replace_parameters(
    db: DbSession,
    actor: RequireQualityManager,
    standard_id: int,
    body: ParametersReplace,
    request: Request,
) -> InspectionStandard:
    """Replace the whole parameter grid — this is how the QE edits the standard.

    Editing a parameter clears its `requires_manual_verification` flag only when the
    client explicitly sends `requires_manual_verification: false`, i.e. when a human
    has actually supplied the missing value.
    """
    standard = _get_editable(db, standard_id)
    standard.parameters.clear()
    db.flush()

    for index, row in enumerate(body.parameters, start=1):
        data = row.model_dump(exclude={"id"})
        data["seq"] = index
        db.add(InspectionParameter(standard_id=standard.id, **data))

    audit(
        db,
        actor,
        "standard.parameters.replace",
        "standard",
        standard.id,
        {"count": len(body.parameters)},
        request,
    )
    db.commit()
    db.refresh(standard)
    return standard


@router.post("/{standard_id}/approve", response_model=StandardDetail)
def approve_standard(
    db: DbSession,
    actor: RequireQualityManager,
    standard_id: int,
    body: ApproveIn,
    request: Request,
) -> InspectionStandard:
    standard = _get(db, standard_id)
    if standard.status == StandardStatus.approved.value:
        raise HTTPException(status.HTTP_409_CONFLICT, "Standard is already approved")
    if not standard.parameters:
        raise HTTPException(status.HTTP_409_CONFLICT, "Standard has no inspection parameters")

    unverified = [p.seq for p in standard.parameters if p.requires_manual_verification]
    if unverified:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cannot approve: parameters still marked 'Requires Manual Verification' "
            f"at S.No {', '.join(map(str, unverified))}",
        )

    standard.status = StandardStatus.approved.value
    standard.approved_by_id = actor.id
    standard.approved_at = datetime.now(timezone.utc)
    db.add(
        Approval(
            entity_type="standard",
            entity_id=standard.id,
            action="approve",
            status="approved",
            actor_id=actor.id,
            remarks=body.remarks,
        )
    )
    audit(db, actor, "standard.approve", "standard", standard.id, request=request)
    db.commit()
    return standard


def _get(db: DbSession, standard_id: int) -> InspectionStandard:
    standard = db.get(InspectionStandard, standard_id)
    if standard is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inspection standard not found")
    return standard


def _get_editable(db: DbSession, standard_id: int) -> InspectionStandard:
    standard = _get(db, standard_id)
    if standard.status != StandardStatus.draft.value:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Only draft standards can be edited — create a new version instead",
        )
    return standard
