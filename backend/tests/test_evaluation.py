from app.services.evaluation import FAIL, NA, PASS, PENDING, Spec, evaluate, limits
from app.services.summary import ResultRow, summarise


def test_bilateral_tolerance_inside_and_outside():
    spec = Spec(nominal_value=25.0, upper_tolerance=0.021, lower_tolerance=0.0)
    assert limits(spec) == (25.0, 25.021)
    assert evaluate(spec, 25.010).result == PASS
    assert evaluate(spec, 25.021).result == PASS  # limit is inclusive
    high = evaluate(spec, 25.030)
    assert high.result == FAIL and round(high.deviation, 3) == 0.009
    low = evaluate(spec, 24.990)
    assert low.result == FAIL and round(low.deviation, 3) == -0.010


def test_one_sided_maximum():
    spec = Spec(nominal_value=0.8, upper_tolerance=0.0, lower_tolerance=None)
    assert evaluate(spec, 0.6).result == PASS
    assert evaluate(spec, 0.9).result == FAIL


def test_flipped_tolerance_signs_are_normalised():
    spec = Spec(nominal_value=10.0, upper_tolerance=-0.1, lower_tolerance=0.1)
    assert limits(spec) == (9.9, 10.1)
    assert evaluate(spec, 10.05).result == PASS


def test_unverified_specification_is_never_auto_judged():
    spec = Spec(nominal_value=10.0, upper_tolerance=0.1, lower_tolerance=-0.1,
                requires_manual_verification=True)
    verdict = evaluate(spec, 10.0)
    assert verdict.result == PENDING
    assert "manual verification" in verdict.reason.lower()


def test_specification_without_tolerance_is_pending_not_pass():
    spec = Spec(nominal_value=10.0)
    assert evaluate(spec, 10.0).result == PENDING


def test_missing_measurement_is_pending():
    assert evaluate(Spec(10.0, 0.1, -0.1), None).result == PENDING


def test_attribute_uses_inspector_verdict():
    spec = Spec(is_attribute=True)
    assert evaluate(spec, None, "Go OK", "PASS").result == PASS
    assert evaluate(spec, None, "No-Go entered", "FAIL").result == FAIL
    assert evaluate(spec, None, "Go OK", None).result == PENDING


def test_summary_dispositions():
    assert summarise([ResultRow(PASS, "major")] * 3).overall_result == "ACCEPTED"

    with_minor = summarise([ResultRow(PASS, "major"), ResultRow(FAIL, "minor")])
    assert with_minor.overall_result == "ACCEPTED_WITH_DEVIATION"
    assert with_minor.minor_failures == 1

    critical = summarise([ResultRow(PASS, "minor"), ResultRow(FAIL, "critical")])
    assert critical.overall_result == "REJECTED"
    assert critical.critical_failures == 1

    pending = summarise([ResultRow(PASS, "minor"), ResultRow(PENDING, "major")])
    assert pending.overall_result == "PENDING"

    na_only = summarise([ResultRow(PASS, "minor"), ResultRow(NA, "minor")])
    assert na_only.overall_result == "ACCEPTED"
