"""PASS / FAIL engine.

Pure functions — no DB, no framework. This is the single place where a measured
value is judged against a specification, so it is also the single place to test.
"""

from __future__ import annotations

from dataclasses import dataclass

PASS = "PASS"
FAIL = "FAIL"
PENDING = "PENDING"
NA = "NA"


@dataclass(frozen=True)
class Spec:
    """The evaluable part of an inspection parameter."""

    nominal_value: float | None = None
    upper_tolerance: float | None = None
    lower_tolerance: float | None = None
    is_attribute: bool = False
    requires_manual_verification: bool = False


@dataclass(frozen=True)
class Evaluation:
    result: str
    deviation: float | None = None
    usl: float | None = None
    lsl: float | None = None
    reason: str = ""


def limits(spec: Spec) -> tuple[float | None, float | None]:
    """Return (lsl, usl). Either side may be None for a one-sided specification."""
    if spec.nominal_value is None:
        return None, None
    lsl = spec.nominal_value + spec.lower_tolerance if spec.lower_tolerance is not None else None
    usl = spec.nominal_value + spec.upper_tolerance if spec.upper_tolerance is not None else None
    if lsl is not None and usl is not None and lsl > usl:
        # Tolerances entered with flipped signs — normalise rather than fail everything.
        lsl, usl = usl, lsl
    return lsl, usl


def evaluate(
    spec: Spec, actual_value: float | None, actual_text: str | None = None, manual_result: str | None = None
) -> Evaluation:
    """Judge one measurement.

    Rules:
      * A parameter still flagged `requires_manual_verification` is never auto-judged.
      * Attribute (go/no-go, visual) parameters take the inspector's own verdict.
      * Variable parameters need a nominal and at least one tolerance side.
    """
    if spec.requires_manual_verification:
        return Evaluation(PENDING, reason="Specification requires manual verification")

    if spec.is_attribute:
        if manual_result in (PASS, FAIL, NA):
            return Evaluation(manual_result, reason="Attribute result recorded by inspector")
        return Evaluation(PENDING, reason="Awaiting inspector verdict")

    if actual_value is None:
        return Evaluation(PENDING, reason="No measurement recorded")

    lsl, usl = limits(spec)
    if lsl is None and usl is None:
        return Evaluation(PENDING, usl=usl, lsl=lsl, reason="No usable tolerance on specification")

    if usl is not None and actual_value > usl:
        return Evaluation(FAIL, round(actual_value - usl, 6), usl, lsl, "Above upper limit")
    if lsl is not None and actual_value < lsl:
        return Evaluation(FAIL, round(actual_value - lsl, 6), usl, lsl, "Below lower limit")
    return Evaluation(PASS, 0.0, usl, lsl, "Within specification")
