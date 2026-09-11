"""Drawing upload, AI analysis, extraction verification and standard generation."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.api.deps import (
    DbSession,
    RequireInspector,
    RequireQualityManager,
    RequireViewer,
    audit,
)
from app.core.config import settings
from app.models import (
    Drawing,
    DrawingRevision,
    DrawingStatus,
    InspectionParameter,
    InspectionStandard,
    Instrument,
    Part,
)
from app.schemas import (
    DrawingDetail,
    DrawingOut,
    DrawingRevisionDetail,
    ExtractionUpdate,
    StandardDetail,
)
from app.services import ai_extraction, standard_builder

log = logging.getLogger(__name__)
router = APIRouter(prefix="/drawings", tags=["drawings"])

ALLOWED_MIME = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/tiff",
    "image/webp",
}
ALLOWED_SUFFIX = {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp", ".dxf", ".dwg"}
MAX_UPLOAD_BYTES = 40 * 1024 * 1024


@router.get("", response_model=list[DrawingOut])
def list_drawings(
    db: DbSession,
    _: RequireViewer,
    q: str | None = None,
    drawing_status: str | None = None,
) -> list[Drawing]:
    stmt = select(Drawing).order_by(Drawing.id.desc())
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Drawing.drawing_number.ilike(like) | Drawing.file_name.ilike(like))
    if drawing_status:
        stmt = stmt.where(Drawing.status == drawing_status)
    return list(db.scalars(stmt).unique())


@router.get("/{drawing_id}", response_model=DrawingDetail)
def get_drawing(db: DbSession, _: RequireViewer, drawing_id: int) -> Drawing:
    drawing = db.get(Drawing, drawing_id)
    if drawing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Drawing not found")
    return drawing


@router.get("/{drawing_id}/file")
def get_drawing_file(db: DbSession, _: RequireViewer, drawing_id: int) -> FileResponse:
    drawing = db.get(Drawing, drawing_id)
    if drawing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Drawing not found")
    path = Path(drawing.file_path)
    if not path.is_file():
        raise HTTPException(status.HTTP_410_GONE, "Stored file is missing")
    return FileResponse(
        path,
        media_type=drawing.mime_type,
        filename=drawing.file_name,
        content_disposition_type="inline",
    )


@router.post("/upload", response_model=DrawingDetail, status_code=status.HTTP_201_CREATED)
async def upload_drawing(
    db: DbSession,
    actor: RequireInspector,
    request: Request,
    file: Annotated[UploadFile, File()],
    drawing_number: Annotated[str, Form()],
    revision: Annotated[str, Form()] = "-",
    title: Annotated[str | None, Form()] = None,
    part_number: Annotated[str | None, Form()] = None,
    part_name: Annotated[str | None, Form()] = None,
) -> Drawing:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIX:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Unsupported file type '{suffix}'. Allowed: {', '.join(sorted(ALLOWED_SUFFIX))}",
        )

    payload = await file.read()
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File exceeds 40 MB")
    if not payload:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is empty")

    stored_name = f"{uuid.uuid4().hex}{suffix}"
    stored_path = settings.storage_path / stored_name
    stored_path.write_bytes(payload)

    part = None
    if part_number:
        part = db.scalar(select(Part).where(Part.part_number == part_number))
        if part is None:
            part = Part(part_number=part_number, part_name=part_name or part_number)
            db.add(part)
            db.flush()

    drawing = Drawing(
        drawing_number=drawing_number.strip(),
        title=title,
        part_id=part.id if part else None,
        file_name=file.filename or stored_name,
        file_path=str(stored_path),
        mime_type=file.content_type or "application/octet-stream",
        file_size=len(payload),
        status=DrawingStatus.uploaded.value,
        uploaded_by_id=actor.id,
    )
    db.add(drawing)
    db.flush()

    db.add(
        DrawingRevision(
            drawing_id=drawing.id,
            revision=revision.strip() or "-",
            is_current=True,
            status=DrawingStatus.uploaded.value,
        )
    )
    audit(db, actor, "drawing.upload", "drawing", drawing.id, {"file": file.filename}, request)
    db.commit()
    db.refresh(drawing)
    return drawing


@router.post("/{drawing_id}/analyze", response_model=DrawingRevisionDetail)
def analyze_drawing(
    db: DbSession, actor: RequireInspector, drawing_id: int, request: Request
) -> DrawingRevision:
    """Run the AI vision pipeline on the current revision (synchronous for the MVP)."""
    drawing = db.get(Drawing, drawing_id)
    if drawing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Drawing not found")
    revision = _current_revision(db, drawing_id)

    if Path(drawing.file_path).suffix.lower() in {".dwg", ".dxf"}:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Native CAD files must be exported to PDF before AI analysis",
        )

    drawing.status = revision.status = DrawingStatus.analyzing.value
    db.commit()

    try:
        extraction = ai_extraction.extract(Path(drawing.file_path), drawing.mime_type)
    except Exception as exc:  # noqa: BLE001 — surface any pipeline failure to the user
        log.exception("Extraction failed for drawing %s", drawing_id)
        drawing.status = revision.status = DrawingStatus.failed.value
        revision.extraction_error = str(exc)[:1000]
        audit(db, actor, "drawing.analyze.failed", "drawing", drawing.id, request=request)
        db.commit()
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, f"AI extraction failed: {exc}"
        ) from exc

    revision.extraction_json = extraction
    revision.extraction_confidence = extraction.get("overall_confidence")
    revision.extraction_engine = extraction.get("engine")
    revision.extraction_error = None
    revision.analyzed_at = datetime.now(timezone.utc)
    revision.status = drawing.status = DrawingStatus.analyzed.value

    # Backfill title-block data onto the part / revision when the AI read it.
    if extraction.get("drawing_revision") and revision.revision in ("-", ""):
        revision.revision = str(extraction["drawing_revision"])[:20]
    if drawing.part and extraction.get("material") and not drawing.part.material:
        drawing.part.material = str(extraction["material"])[:160]

    audit(
        db,
        actor,
        "drawing.analyze",
        "drawing_revision",
        revision.id,
        {
            "engine": extraction.get("engine"),
            "characteristics": len(extraction.get("dimensions") or []),
            "unverified": extraction.get("unverified_count"),
        },
        request,
    )
    db.commit()
    return revision


@router.get("/revisions/{revision_id}/extraction", response_model=DrawingRevisionDetail)
def get_extraction(db: DbSession, _: RequireViewer, revision_id: int) -> DrawingRevision:
    return _get_revision(db, revision_id)


@router.put("/revisions/{revision_id}/extraction", response_model=DrawingRevisionDetail)
def update_extraction(
    db: DbSession,
    actor: RequireQualityManager,
    revision_id: int,
    body: ExtractionUpdate,
    request: Request,
) -> DrawingRevision:
    """Store the Quality Engineer's verified/corrected extraction."""
    revision = _get_revision(db, revision_id)
    revision.extraction_json = body.extraction
    revision.verified_by_id = actor.id
    revision.verified_at = datetime.now(timezone.utc)
    audit(db, actor, "extraction.verify", "drawing_revision", revision.id, request=request)
    db.commit()
    return revision


@router.post(
    "/revisions/{revision_id}/generate-standard",
    response_model=StandardDetail,
    status_code=status.HTTP_201_CREATED,
)
def generate_standard(
    db: DbSession, actor: RequireQualityManager, revision_id: int, request: Request
) -> InspectionStandard:
    revision = _get_revision(db, revision_id)
    extraction = revision.extraction_json
    if not extraction:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Run AI analysis before generating an inspection standard"
        )

    drawing = revision.drawing
    version = 1 + db.query(InspectionStandard).filter_by(drawing_revision_id=revision.id).count()
    standard = InspectionStandard(
        code=f"IS-{drawing.drawing_number}-{revision.revision}-v{version}".replace(" ", ""),
        title=f"Inspection Standard — {drawing.title or drawing.drawing_number} "
        f"(Rev {revision.revision})",
        drawing_revision_id=revision.id,
        part_id=drawing.part_id,
        version=version,
        created_by_id=actor.id,
    )
    db.add(standard)
    db.flush()

    instruments = {i.code: i.id for i in db.scalars(select(Instrument))}
    for row in standard_builder.build_parameters(extraction):
        code = row.pop("instrument_code", None)
        db.add(
            InspectionParameter(
                standard_id=standard.id, instrument_id=instruments.get(code), **row
            )
        )

    audit(db, actor, "standard.generate", "standard", standard.id, {"version": version}, request)
    db.commit()
    db.refresh(standard)
    return standard


# --------------------------------------------------------------------------- helpers
def _current_revision(db: DbSession, drawing_id: int) -> DrawingRevision:
    revision = db.scalar(
        select(DrawingRevision)
        .where(DrawingRevision.drawing_id == drawing_id, DrawingRevision.is_current.is_(True))
        .order_by(DrawingRevision.id.desc())
    )
    if revision is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Drawing has no current revision")
    return revision


def _get_revision(db: DbSession, revision_id: int) -> DrawingRevision:
    revision = db.get(DrawingRevision, revision_id)
    if revision is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Drawing revision not found")
    return revision
