"""The AI must never silently supply a dimension it did not read."""

from app.services import ai_extraction, standard_builder


def _raw(**overrides):
    dim = {
        "label": "Bore diameter",
        "dimension_type": "diameter",
        "nominal_value": 25.0,
        "upper_tolerance": 0.02,
        "lower_tolerance": -0.01,
        "specification_text": "Ø25.00 +0.02/-0.01",
        "classification": "critical",
        "confidence": 0.95,
        "source_note": "Read from front view",
    }
    dim.update(overrides)
    return {"dimensions": [dim], "title_block_confidence": 0.9, "units": "mm"}


def test_confident_complete_dimension_is_not_flagged():
    out = ai_extraction.postprocess(_raw(), engine="test")
    assert out["dimensions"][0]["requires_manual_verification"] is False
    assert out["unverified_count"] == 0


def test_low_confidence_is_flagged():
    out = ai_extraction.postprocess(_raw(confidence=0.4), engine="test")
    assert out["dimensions"][0]["requires_manual_verification"] is True


def test_missing_nominal_is_flagged():
    out = ai_extraction.postprocess(_raw(nominal_value=None), engine="test")
    dim = out["dimensions"][0]
    assert dim["requires_manual_verification"] is True
    assert "Nominal value not read" in " ".join(dim["verification_reasons"])


def test_missing_tolerance_is_flagged_rather_than_defaulted():
    out = ai_extraction.postprocess(
        _raw(upper_tolerance=None, lower_tolerance=None), engine="test"
    )
    dim = out["dimensions"][0]
    assert dim["upper_tolerance"] is None and dim["lower_tolerance"] is None
    assert "No tolerance read from drawing" in dim["verification_reasons"]


def test_flagged_dimension_becomes_a_parameter_needing_verification():
    out = ai_extraction.postprocess(_raw(confidence=0.2), engine="test")
    params = standard_builder.build_parameters(out)
    assert params[0]["requires_manual_verification"] is True
    assert params[0]["acceptance_criteria"] == "Requires Manual Verification"


def test_offline_extractor_flags_everything():
    from pathlib import Path

    out = ai_extraction.postprocess(
        ai_extraction.offline_extraction(Path("DWG-0001.pdf")), engine="offline-stub"
    )
    assert out["unverified_count"] == len(out["dimensions"]) == 1
    assert out["dimensions"][0]["nominal_value"] is None


def test_acceptance_criteria_ranges():
    out = ai_extraction.postprocess(_raw(), engine="test")
    params = standard_builder.build_parameters(out)
    assert params[0]["acceptance_criteria"] == "24.99 to 25.02 mm"
