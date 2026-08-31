"""Turn a verified drawing extraction into inspection-standard parameters.

The mapping from characteristic type to method/instrument/frequency is the
company's inspection practice; it is deliberately table-driven so a Quality
Manager can change it in one place.
"""

from __future__ import annotations

from typing import Any

# dimension_type -> (inspection method, default instrument code, instrument label)
METHOD_TABLE: dict[str, tuple[str, str, str]] = {
    "length": ("Variable measurement", "VC-150", "Vernier Caliper 0-150 mm"),
    "diameter": ("Variable measurement", "OM-25", "Outside Micrometer 0-25 mm"),
    "radius": ("Comparison gauge", "RG-SET", "Radius Gauge Set"),
    "angle": ("Angular measurement", "BP-UNI", "Universal Bevel Protractor"),
    "hole": ("Bore measurement", "BG-50", "Bore Gauge 18-50 mm"),
    "thread": ("Attribute gauging", "TPG-M", "Thread Plug Gauge (Go/No-Go)"),
    "surface_finish": ("Surface roughness test", "SRT-01", "Surface Roughness Tester"),
    "geometric": ("Coordinate measurement", "CMM-01", "CMM (Bridge type)"),
    "other": ("Visual inspection", "VIS", "Visual / Reference sample"),
}

ATTRIBUTE_TYPES = {"thread", "other"}

FREQUENCY_BY_CLASS = {
    "critical": "100% inspection",
    "major": "5 pcs per lot",
    "minor": "2 pcs per lot",
}

SAMPLING_BY_CLASS = {
    "critical": "100% — no sampling permitted",
    "major": "ISO 2859-1, Level II, AQL 0.65",
    "minor": "ISO 2859-1, Level II, AQL 1.5",
}


def build_parameters(extraction: dict[str, Any]) -> list[dict[str, Any]]:
    """Map extracted characteristics onto inspection parameters (dicts, not ORM)."""
    params: list[dict[str, Any]] = []
    units_default = extraction.get("units") or "mm"

    for seq, dim in enumerate(extraction.get("dimensions") or [], start=1):
        dtype = dim.get("dimension_type") or "other"
        method, instrument_code, instrument_label = METHOD_TABLE.get(dtype, METHOD_TABLE["other"])
        classification = dim.get("classification") or "minor"
        if dim.get("is_critical"):
            classification = "critical"

        needs_verification = bool(dim.get("requires_manual_verification"))
        reasons = dim.get("verification_reasons") or []
        is_attribute = dtype in ATTRIBUTE_TYPES or (
            dim.get("nominal_value") is None and not needs_verification
        )

        params.append(
            {
                "seq": seq,
                "parameter": dim.get("label") or f"Characteristic {seq}",
                "specification": dim.get("specification_text") or "",
                "nominal_value": dim.get("nominal_value"),
                "upper_tolerance": dim.get("upper_tolerance"),
                "lower_tolerance": dim.get("lower_tolerance"),
                "unit": dim.get("unit") or units_default,
                "inspection_method": method,
                "instrument_code": instrument_code,
                "instrument_text": instrument_label,
                "frequency": FREQUENCY_BY_CLASS.get(classification, "2 pcs per lot"),
                "sampling_plan": SAMPLING_BY_CLASS.get(classification, "ISO 2859-1, Level II"),
                "acceptance_criteria": _acceptance_text(dim),
                "classification": classification,
                "reference_dimension": dim.get("reference") or dim.get("label"),
                "remarks": _remarks(dim, reasons),
                "is_attribute": is_attribute,
                "requires_manual_verification": needs_verification,
                "source_confidence": dim.get("confidence"),
                "source_note": (dim.get("source_note") or "")[:400],
            }
        )

    # Inspection-relevant drawing notes become attribute parameters so they are
    # actually checked instead of being lost in a PDF.
    for note in extraction.get("notes") or []:
        if not note.get("is_inspection_requirement"):
            continue
        seq = len(params) + 1
        params.append(
            {
                "seq": seq,
                "parameter": f"Drawing note {seq}",
                "specification": note.get("text", "")[:240],
                "nominal_value": None,
                "upper_tolerance": None,
                "lower_tolerance": None,
                "unit": None,
                "inspection_method": "Visual inspection / document check",
                "instrument_code": "VIS",
                "instrument_text": "Visual / Reference sample",
                "frequency": "Once per lot",
                "sampling_plan": "1 pc per lot",
                "acceptance_criteria": "Conforms to drawing note",
                "classification": "major",
                "reference_dimension": "Notes",
                "remarks": None,
                "is_attribute": True,
                "requires_manual_verification": (note.get("confidence") or 0) < 0.75,
                "source_confidence": note.get("confidence"),
                "source_note": "Extracted from drawing notes block",
            }
        )

    return params


def _acceptance_text(dim: dict[str, Any]) -> str:
    if dim.get("requires_manual_verification"):
        return "Requires Manual Verification"
    nominal = dim.get("nominal_value")
    upper, lower = dim.get("upper_tolerance"), dim.get("lower_tolerance")
    unit = dim.get("unit") or "mm"
    if nominal is None:
        return dim.get("specification_text") or "As per drawing"
    if upper is None and lower is None:
        return f"As per drawing: {dim.get('specification_text')}"
    lsl = nominal + lower if lower is not None else None
    usl = nominal + upper if upper is not None else None
    if lsl is not None and usl is not None:
        return f"{_fmt(lsl)} to {_fmt(usl)} {unit}"
    if usl is not None:
        return f"Max {_fmt(usl)} {unit}"
    return f"Min {_fmt(lsl)} {unit}"


def _remarks(dim: dict[str, Any], reasons: list[str]) -> str | None:
    bits: list[str] = []
    if dim.get("gdt_symbol"):
        frame = dim["gdt_symbol"]
        if dim.get("datums"):
            frame += f" | datums {dim['datums']}"
        if dim.get("material_condition"):
            frame += f" | {dim['material_condition']}"
        bits.append(f"GD&T: {frame}")
    if reasons:
        bits.append("Requires Manual Verification — " + "; ".join(reasons))
    return " · ".join(bits) or None


def _fmt(value: float) -> str:
    return f"{value:.4f}".rstrip("0").rstrip(".")
