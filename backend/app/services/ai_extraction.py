"""AI vision / OCR pipeline: engineering drawing -> structured technical data.

Design contract
---------------
The model must never invent a dimension or a tolerance. Three defences:

1. The prompt states that omission is correct and invention is a critical failure.
2. The output is constrained by a tool schema in which every numeric field is
   nullable and every entry carries a ``confidence`` and a ``source_note``.
3. :func:`postprocess` flags anything below the confidence threshold, anything
   with a missing tolerance, and anything unparseable as
   ``requires_manual_verification`` — which the PASS/FAIL engine refuses to judge.
"""

from __future__ import annotations

import base64
import json
import logging
from pathlib import Path
from typing import Any

from app.core.config import settings

log = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 4_500_000

SYSTEM_PROMPT = """You are a senior manufacturing quality engineer reading an engineering drawing.

Extract ONLY what is actually legible on the drawing.

ABSOLUTE RULES — these override any desire to be helpful:
- NEVER invent, infer, complete or "standardise" a dimension, tolerance, material or note.
- If a value is unreadable, ambiguous, cropped or simply absent, return null for it and set
  confidence to a low value with a source_note explaining what you could and could not see.
- Do NOT apply general tolerance tables from memory unless the drawing's own general-tolerance
  note is legible; if it is, quote it verbatim in general_tolerance_note.
- Never guess a decimal place. If you can read "25." but not the following digits, the value is
  null and the source_note says so.
- An incomplete but honest extraction is a success. A complete but fabricated one is a failure.

Report a confidence between 0 and 1 per item, meaning "probability this value is exactly what is
printed on the drawing". Use the units printed on the drawing (default mm if the drawing states
units in its title block)."""

USER_PROMPT = """Read every sheet of this engineering drawing and return the structured extraction.

Cover: title block (part name/number, drawing number, revision, material, scale, units, general
tolerance note), every dimension with its tolerance, every geometric tolerance (GD&T frame:
symbol, value, datums, material condition), surface finish callouts, hole specifications
(diameter, depth, quantity, counterbore/countersink), thread specifications (designation, class,
depth), and any note that states an inspection or special characteristic requirement.

Mark a characteristic as critical/major/minor only when the drawing itself indicates it (a
special-characteristic symbol, a note, or a balloon). Otherwise classify by engineering judgement
and say so in the source_note."""

EXTRACTION_TOOL: dict[str, Any] = {
    "name": "record_drawing_extraction",
    "description": "Record technical content read from an engineering drawing.",
    "input_schema": {
        "type": "object",
        "properties": {
            "part_name": {"type": ["string", "null"]},
            "part_number": {"type": ["string", "null"]},
            "drawing_number": {"type": ["string", "null"]},
            "drawing_revision": {"type": ["string", "null"]},
            "material": {"type": ["string", "null"]},
            "units": {"type": ["string", "null"], "description": "mm, inch, ..."},
            "scale": {"type": ["string", "null"]},
            "general_tolerance_note": {
                "type": ["string", "null"],
                "description": "Verbatim general-tolerance note, or null if not legible.",
            },
            "title_block_confidence": {"type": "number"},
            "dimensions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "label": {"type": "string", "description": "e.g. 'OD at flange'"},
                        "reference": {
                            "type": ["string", "null"],
                            "description": "balloon number or zone, e.g. 'B4' / '12'",
                        },
                        "dimension_type": {
                            "type": "string",
                            "enum": [
                                "length",
                                "diameter",
                                "radius",
                                "angle",
                                "hole",
                                "thread",
                                "surface_finish",
                                "geometric",
                                "other",
                            ],
                        },
                        "nominal_value": {"type": ["number", "null"]},
                        "upper_tolerance": {"type": ["number", "null"]},
                        "lower_tolerance": {"type": ["number", "null"]},
                        "unit": {"type": ["string", "null"]},
                        "specification_text": {
                            "type": "string",
                            "description": "Verbatim callout, e.g. 'Ø25.00 +0.02/-0.01'",
                        },
                        "gdt_symbol": {"type": ["string", "null"]},
                        "datums": {"type": ["string", "null"]},
                        "material_condition": {"type": ["string", "null"]},
                        "is_critical": {"type": "boolean"},
                        "classification": {
                            "type": "string",
                            "enum": ["critical", "major", "minor"],
                        },
                        "confidence": {"type": "number"},
                        "source_note": {"type": "string"},
                    },
                    "required": [
                        "label",
                        "dimension_type",
                        "specification_text",
                        "classification",
                        "confidence",
                        "source_note",
                    ],
                },
            },
            "notes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string"},
                        "is_inspection_requirement": {"type": "boolean"},
                        "confidence": {"type": "number"},
                    },
                    "required": ["text", "confidence"],
                },
            },
            "unreadable_areas": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Zones or callouts you could not read. Be explicit.",
            },
        },
        "required": ["dimensions", "title_block_confidence"],
    },
}


# --------------------------------------------------------------------------- rasterising
def rasterise(file_path: Path, mime_type: str, max_pages: int) -> list[tuple[str, bytes]]:
    """Return a list of (media_type, image_bytes) ready for the vision API."""
    if mime_type.startswith("image/"):
        return [(mime_type, file_path.read_bytes())]

    try:
        import fitz  # PyMuPDF
    except ImportError as exc:  # pragma: no cover - environment dependent
        raise RuntimeError("PyMuPDF is required to rasterise PDF drawings") from exc

    pages: list[tuple[str, bytes]] = []
    with fitz.open(file_path) as doc:
        for page in doc.pages(0, min(len(doc), max_pages)):
            pix = page.get_pixmap(dpi=200)
            data = pix.tobytes("png")
            if len(data) > MAX_IMAGE_BYTES:
                pix = page.get_pixmap(dpi=120)
                data = pix.tobytes("png")
            pages.append(("image/png", data))
    if not pages:
        raise RuntimeError("Drawing file contains no renderable pages")
    return pages


# --------------------------------------------------------------------------- extraction
def extract(file_path: Path, mime_type: str) -> dict[str, Any]:
    """Run the vision extraction. Falls back to the offline stub without an API key."""
    if not settings.anthropic_api_key:
        log.warning("ANTHROPIC_API_KEY not set — using offline extractor")
        return postprocess(offline_extraction(file_path), engine="offline-stub")

    from anthropic import Anthropic

    images = rasterise(file_path, mime_type, settings.ai_max_pages)
    content: list[dict[str, Any]] = [{"type": "text", "text": USER_PROMPT}]
    for media_type, data in images:
        content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": base64.b64encode(data).decode("ascii"),
                },
            }
        )

    client = Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model=settings.ai_model,
        max_tokens=8000,
        system=SYSTEM_PROMPT,
        tools=[EXTRACTION_TOOL],
        tool_choice={"type": "tool", "name": EXTRACTION_TOOL["name"]},
        messages=[{"role": "user", "content": content}],
    )

    payload: dict[str, Any] | None = None
    for block in message.content:
        if getattr(block, "type", None) == "tool_use":
            payload = dict(block.input)
            break
    if payload is None:
        raise RuntimeError("Vision model returned no structured extraction")

    payload["_pages_analysed"] = len(images)
    return postprocess(payload, engine=f"anthropic:{settings.ai_model}")


# --------------------------------------------------------------------------- post-processing
def postprocess(raw: dict[str, Any], engine: str) -> dict[str, Any]:
    """Normalise, then flag everything that is not confidently known."""
    threshold = settings.ai_confidence_threshold
    dims: list[dict[str, Any]] = []

    for item in raw.get("dimensions") or []:
        d = dict(item)
        d.setdefault("classification", "minor")
        d.setdefault("confidence", 0.0)
        d.setdefault("source_note", "")
        d["unit"] = d.get("unit") or raw.get("units") or "mm"

        reasons: list[str] = []
        confidence = _as_float(d.get("confidence")) or 0.0
        if confidence < threshold:
            reasons.append(f"AI confidence {confidence:.2f} below {threshold:.2f}")

        is_variable = d.get("dimension_type") not in {"other"}
        nominal = _as_float(d.get("nominal_value"))
        upper = _as_float(d.get("upper_tolerance"))
        lower = _as_float(d.get("lower_tolerance"))
        d["nominal_value"], d["upper_tolerance"], d["lower_tolerance"] = nominal, upper, lower

        if is_variable and nominal is None:
            reasons.append("Nominal value not read from drawing")
        if is_variable and nominal is not None and upper is None and lower is None:
            reasons.append("No tolerance read from drawing")
        if not (d.get("specification_text") or "").strip():
            reasons.append("Specification text missing")

        d["requires_manual_verification"] = bool(reasons)
        d["verification_reasons"] = reasons
        dims.append(d)

    title_conf = _as_float(raw.get("title_block_confidence")) or 0.0
    header_fields = [
        "part_name",
        "part_number",
        "drawing_number",
        "drawing_revision",
        "material",
    ]
    header_flags = {
        f: (raw.get(f) in (None, "") or title_conf < threshold) for f in header_fields
    }

    confidences = [_as_float(d.get("confidence")) or 0.0 for d in dims]
    overall = round(sum(confidences) / len(confidences), 4) if confidences else 0.0

    return {
        **{f: raw.get(f) for f in header_fields},
        "units": raw.get("units") or "mm",
        "scale": raw.get("scale"),
        "general_tolerance_note": raw.get("general_tolerance_note"),
        "title_block_confidence": title_conf,
        "header_requires_verification": header_flags,
        "dimensions": dims,
        "notes": raw.get("notes") or [],
        "unreadable_areas": raw.get("unreadable_areas") or [],
        "pages_analysed": raw.get("_pages_analysed", 1),
        "engine": engine,
        "confidence_threshold": threshold,
        "overall_confidence": overall,
        "unverified_count": sum(1 for d in dims if d["requires_manual_verification"]),
    }


def _as_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


# --------------------------------------------------------------------------- offline stub
def offline_extraction(file_path: Path) -> dict[str, Any]:
    """Deterministic sample used when no API key is configured.

    Confidence is deliberately 0 on every item, so the whole extraction lands in
    the verification queue instead of masquerading as read data.
    """
    stem = file_path.stem[:40]
    return {
        "part_name": None,
        "part_number": None,
        "drawing_number": stem or None,
        "drawing_revision": None,
        "material": None,
        "units": "mm",
        "title_block_confidence": 0.0,
        "general_tolerance_note": None,
        "dimensions": [
            {
                "label": "Placeholder characteristic 1",
                "reference": "1",
                "dimension_type": "length",
                "nominal_value": None,
                "upper_tolerance": None,
                "lower_tolerance": None,
                "specification_text": "Not extracted — offline mode",
                "classification": "major",
                "confidence": 0.0,
                "source_note": "No AI provider configured; nothing was read from the drawing.",
            }
        ],
        "notes": [],
        "unreadable_areas": ["Entire drawing — AI extraction not configured"],
        "_pages_analysed": 0,
    }
