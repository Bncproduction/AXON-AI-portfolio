"""Seed the database with demo master data and a worked end-to-end example.

    python seed.py           # create if empty
    python seed.py --reset   # drop everything first
"""

from __future__ import annotations

import random
import sys
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal, engine
from app.models import (
    Base,
    Defect,
    Drawing,
    DrawingRevision,
    DrawingStatus,
    InspectionParameter,
    InspectionReport,
    InspectionResult,
    InspectionStandard,
    Instrument,
    Part,
    ReportStatus,
    StandardStatus,
    Supplier,
    User,
)
from app.services import standard_builder
from app.services.evaluation import Spec, evaluate
from app.services.summary import ResultRow, summarise

USERS = [
    ("admin@qip.local", "System Administrator", "admin", "EMP-001"),
    ("qm@qip.local", "Quality Manager", "quality_manager", "EMP-002"),
    ("inspector@qip.local", "Line Inspector", "inspector", "EMP-003"),
    ("viewer@qip.local", "Read Only", "viewer", "EMP-004"),
]
PASSWORD = "Password123!"

SUPPLIERS = [
    ("SUP-001", "Sharma Precision Works", "quality@sharmaprecision.in", "A"),
    ("SUP-002", "Deccan Forge & Machining", "qa@deccanforge.in", "B"),
    ("SUP-003", "Nova Metal Components", "inspection@novametal.in", "A"),
]

INSTRUMENTS = [
    ("VC-150", "Vernier Caliper 0-150 mm", "Variable", "0.02 mm", "0-150 mm"),
    ("OM-25", "Outside Micrometer 0-25 mm", "Variable", "0.001 mm", "0-25 mm"),
    ("BG-50", "Bore Gauge 18-50 mm", "Variable", "0.001 mm", "18-50 mm"),
    ("RG-SET", "Radius Gauge Set", "Attribute", "0.5 mm", "1-25 mm"),
    ("BP-UNI", "Universal Bevel Protractor", "Variable", "5'", "0-360°"),
    ("TPG-M", "Thread Plug Gauge (Go/No-Go)", "Attribute", "-", "M6-M24"),
    ("SRT-01", "Surface Roughness Tester", "Variable", "0.01 µm", "0.05-10 µm"),
    ("CMM-01", "CMM (Bridge type)", "Variable", "0.0005 mm", "600x500x400"),
    ("VIS", "Visual / Reference sample", "Attribute", "-", "-"),
]

DEFECTS = [
    ("DEF-01", "Oversize dimension", "Dimensional", "major"),
    ("DEF-02", "Undersize dimension", "Dimensional", "major"),
    ("DEF-03", "Out of roundness", "Geometric", "critical"),
    ("DEF-04", "Surface roughness high", "Surface", "minor"),
    ("DEF-05", "Thread not gauging", "Thread", "critical"),
    ("DEF-06", "Burr present", "Visual", "minor"),
    ("DEF-07", "Position out of tolerance", "Geometric", "critical"),
]

# A realistic verified extraction — exactly the shape ai_extraction.postprocess emits.
DEMO_DIMENSIONS = [
    ("Bore diameter", "1", "diameter", 25.0, 0.021, 0.0, "Ø25.000 H7 (+0.021/0)", "critical",
     "Ø", None),
    ("Overall length", "2", "length", 88.0, 0.2, -0.2, "88.0 ±0.2", "major", None, None),
    ("Flange outside diameter", "3", "diameter", 62.0, 0.1, -0.1, "Ø62.0 ±0.1", "major", None,
     None),
    ("Flange thickness", "4", "length", 8.0, 0.1, -0.1, "8.0 ±0.1", "minor", None, None),
    ("Pitch circle diameter", "5", "diameter", 48.0, 0.05, -0.05, "Ø48.00 ±0.05", "major", None,
     None),
    ("Mounting hole diameter (4x)", "6", "hole", 6.6, 0.1, 0.0, "4x Ø6.6 +0.1/0", "major", None,
     None),
    ("Chamfer", "7", "angle", 45.0, 1.0, -1.0, "45° ±1°", "minor", None, None),
    ("Corner radius", "8", "radius", 2.0, 0.3, -0.3, "R2.0 ±0.3", "minor", None, None),
    ("Bore cylindricity", "9", "geometric", 0.015, 0.0, -0.015, "⌭ 0.015", "critical", "⌭", "A"),
    ("Flange face runout to A", "10", "geometric", 0.05, 0.0, -0.05, "⌰ 0.05 A", "critical", "⌰",
     "A"),
    ("Bore surface finish", "11", "surface_finish", 0.8, 0.0, -0.8, "Ra 0.8 max", "major", None,
     None),
    ("Tapped hole thread", "12", "thread", None, None, None, "M10 x 1.5 - 6H, 20 deep",
     "critical", None, None),
]


def build_demo_extraction() -> dict:
    dims = []
    for (label, ref, dtype, nominal, upper, lower, spec, cls, gdt, datum) in DEMO_DIMENSIONS:
        dims.append(
            {
                "label": label,
                "reference": ref,
                "dimension_type": dtype,
                "nominal_value": nominal,
                "upper_tolerance": upper,
                "lower_tolerance": lower,
                "unit": "µm" if dtype == "surface_finish" else "mm",
                "specification_text": spec,
                "gdt_symbol": gdt,
                "datums": datum,
                "material_condition": None,
                "is_critical": cls == "critical",
                "classification": cls,
                "confidence": 0.94,
                "source_note": "Read from drawing sheet 1 title area / view",
                "requires_manual_verification": False,
                "verification_reasons": [],
            }
        )
    return {
        "part_name": "Bearing Housing Flange",
        "part_number": "PN-4471-A",
        "drawing_number": "DWG-4471",
        "drawing_revision": "C",
        "material": "EN8 Steel, hardened 45-50 HRC",
        "units": "mm",
        "scale": "1:1",
        "general_tolerance_note": "Unspecified tolerances as per ISO 2768-mK",
        "title_block_confidence": 0.96,
        "header_requires_verification": {
            "part_name": False,
            "part_number": False,
            "drawing_number": False,
            "drawing_revision": False,
            "material": False,
        },
        "dimensions": dims,
        "notes": [
            {
                "text": "All sharp edges to be deburred. No burrs permitted on bore.",
                "is_inspection_requirement": True,
                "confidence": 0.92,
            },
            {
                "text": "Material certificate to accompany every lot.",
                "is_inspection_requirement": True,
                "confidence": 0.9,
            },
        ],
        "unreadable_areas": [],
        "pages_analysed": 1,
        "engine": "seed:verified-sample",
        "confidence_threshold": 0.75,
        "overall_confidence": 0.94,
        "unverified_count": 0,
    }


def main(reset: bool = False) -> None:
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.scalar(select(User).limit(1)) and not reset:
            print("Database already seeded — pass --reset to rebuild.")
            return

        users = {}
        for email, name, role, code in USERS:
            user = User(
                email=email,
                full_name=name,
                role=role,
                employee_code=code,
                hashed_password=hash_password(PASSWORD),
            )
            db.add(user)
            users[role] = user

        suppliers = []
        for code, name, email, rating in SUPPLIERS:
            supplier = Supplier(code=code, name=name, contact_email=email, rating=rating)
            db.add(supplier)
            suppliers.append(supplier)

        instruments = {}
        for code, name, itype, lc, rng in INSTRUMENTS:
            instrument = Instrument(
                code=code,
                name=name,
                type=itype,
                least_count=lc,
                range_text=rng,
                calibration_due=date.today() + timedelta(days=random.randint(30, 300)),
            )
            db.add(instrument)
            instruments[code] = instrument

        for code, name, category, severity in DEFECTS:
            db.add(Defect(code=code, name=name, category=category, severity=severity))

        db.flush()

        part = Part(
            part_number="PN-4471-A",
            part_name="Bearing Housing Flange",
            material="EN8 Steel, hardened 45-50 HRC",
            customer_name="Apex Motors Ltd.",
            supplier_id=suppliers[0].id,
        )
        db.add(part)
        db.flush()

        drawing = Drawing(
            drawing_number="DWG-4471",
            title="Bearing Housing Flange",
            part_id=part.id,
            file_name="DWG-4471-RevC.pdf",
            file_path="(demo — no file uploaded)",
            mime_type="application/pdf",
            file_size=0,
            status=DrawingStatus.analyzed.value,
            uploaded_by_id=users["inspector"].id,
        )
        db.add(drawing)
        db.flush()

        extraction = build_demo_extraction()
        revision = DrawingRevision(
            drawing_id=drawing.id,
            revision="C",
            is_current=True,
            status=DrawingStatus.analyzed.value,
            extraction_json=extraction,
            extraction_confidence=extraction["overall_confidence"],
            extraction_engine=extraction["engine"],
            analyzed_at=datetime.now(timezone.utc),
            verified_by_id=users["quality_manager"].id,
            verified_at=datetime.now(timezone.utc),
        )
        db.add(revision)
        db.flush()

        standard = InspectionStandard(
            code="IS-DWG-4471-C-v1",
            title="Inspection Standard — Bearing Housing Flange (Rev C)",
            drawing_revision_id=revision.id,
            part_id=part.id,
            version=1,
            status=StandardStatus.approved.value,
            created_by_id=users["quality_manager"].id,
            approved_by_id=users["quality_manager"].id,
            approved_at=datetime.now(timezone.utc),
        )
        db.add(standard)
        db.flush()

        parameters = []
        for row in standard_builder.build_parameters(extraction):
            code = row.pop("instrument_code", None)
            parameter = InspectionParameter(
                standard_id=standard.id,
                instrument_id=instruments[code].id if code in instruments else None,
                **row,
            )
            db.add(parameter)
            parameters.append(parameter)
        db.flush()

        defects = list(db.scalars(select(Defect)))
        rng = random.Random(20240828)
        for index in range(24):
            _make_report(db, index, standard, parameters, part, drawing, suppliers, users,
                         defects, rng)

        db.commit()
        print(
            f"Seeded {len(USERS)} users, {len(SUPPLIERS)} suppliers, "
            f"{len(parameters)} inspection parameters and 24 inspection reports."
        )
        print(f"Login with any of: {', '.join(u[0] for u in USERS)}  /  {PASSWORD}")
    finally:
        db.close()


def _make_report(db, index, standard, parameters, part, drawing, suppliers, users, defects, rng):
    inspection_date = date.today() - timedelta(days=index * 3)
    supplier = suppliers[index % len(suppliers)]
    lot = rng.choice([100, 200, 250, 500])

    report = InspectionReport(
        report_number=f"IR-{inspection_date.year}-{index + 1:05d}",
        standard_id=standard.id,
        part_id=part.id,
        drawing_id=drawing.id,
        drawing_revision="C",
        supplier_id=supplier.id,
        company_name="Precision Components Pvt. Ltd.",
        customer_name="Apex Motors Ltd.",
        batch_number=f"BATCH-{inspection_date:%Y%m}-{index + 1:03d}",
        po_number=f"PO-{45000 + index}",
        invoice_number=f"INV-{9100 + index}",
        inspection_date=inspection_date,
        shift=rng.choice(["A", "B", "C"]),
        machine_number=rng.choice(["CNC-01", "CNC-02", "VMC-07", "HMC-03"]),
        operator_name=rng.choice(["R. Kulkarni", "S. Iyer", "M. Ahmed", "P. Das"]),
        inspector_id=users["inspector"].id,
        inspector_name=users["inspector"].full_name,
        lot_quantity=lot,
        sample_quantity=rng.choice([5, 8, 13]),
        status=ReportStatus.approved.value,
        inspector_signature=users["inspector"].full_name,
        inspector_signed_at=datetime.now(timezone.utc),
        qa_approver_id=users["quality_manager"].id,
        qa_signature=users["quality_manager"].full_name,
        qa_approved_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.flush()

    rows = []
    for parameter in parameters:
        actual_value = actual_text = manual = None
        if parameter.is_attribute:
            manual = "PASS" if rng.random() > 0.05 else "FAIL"
            actual_text = "Go/No-Go OK" if manual == "PASS" else "No-Go entered"
        elif parameter.nominal_value is not None:
            span = (parameter.upper_tolerance or 0) - (parameter.lower_tolerance or 0) or 0.1
            centre = parameter.nominal_value + (
                (parameter.upper_tolerance or 0) + (parameter.lower_tolerance or 0)
            ) / 2
            drift = span * (1.1 if rng.random() < 0.08 else 0.28)
            actual_value = round(rng.gauss(centre, drift / 2), 4)

        verdict = evaluate(
            Spec(
                parameter.nominal_value,
                parameter.upper_tolerance,
                parameter.lower_tolerance,
                parameter.is_attribute,
                parameter.requires_manual_verification,
            ),
            actual_value,
            actual_text,
            manual,
        )
        defect = rng.choice(defects) if verdict.result == "FAIL" else None
        db.add(
            InspectionResult(
                report_id=report.id,
                parameter_id=parameter.id,
                seq=parameter.seq,
                actual_value=actual_value,
                actual_text=actual_text,
                result=verdict.result,
                deviation=verdict.deviation,
                defect_id=defect.id if defect else None,
                defect_description=defect.name if defect else None,
            )
        )
        rows.append(ResultRow(verdict.result, parameter.classification))

    s = summarise(rows)
    report.total_parameters = s.total
    report.passed_parameters = s.passed
    report.failed_parameters = s.failed
    report.pending_parameters = s.pending
    report.critical_failures = s.critical_failures
    report.major_failures = s.major_failures
    report.minor_failures = s.minor_failures
    report.overall_result = s.overall_result
    if s.overall_result == "REJECTED":
        report.rejected_quantity = lot
    elif s.overall_result == "ACCEPTED_WITH_DEVIATION":
        report.accepted_quantity = int(lot * 0.9)
        report.rework_quantity = lot - int(lot * 0.9)
    else:
        report.accepted_quantity = lot


if __name__ == "__main__":
    main(reset="--reset" in sys.argv)
