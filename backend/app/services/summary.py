"""Report roll-up: counts, classification breakdown and lot disposition."""

from __future__ import annotations

from dataclasses import dataclass

from app.services.evaluation import FAIL, NA, PASS, PENDING

ACCEPTED = "ACCEPTED"
ACCEPTED_WITH_DEVIATION = "ACCEPTED_WITH_DEVIATION"
REJECTED = "REJECTED"
PENDING_RESULT = "PENDING"


@dataclass(frozen=True)
class ResultRow:
    result: str
    classification: str  # critical | major | minor


@dataclass(frozen=True)
class Summary:
    total: int
    passed: int
    failed: int
    pending: int
    critical_failures: int
    major_failures: int
    minor_failures: int
    overall_result: str


def summarise(rows: list[ResultRow]) -> Summary:
    total = len(rows)
    passed = sum(1 for r in rows if r.result == PASS)
    failed = sum(1 for r in rows if r.result == FAIL)
    pending = sum(1 for r in rows if r.result == PENDING)
    na = sum(1 for r in rows if r.result == NA)

    crit = sum(1 for r in rows if r.result == FAIL and r.classification == "critical")
    major = sum(1 for r in rows if r.result == FAIL and r.classification == "major")
    minor = sum(1 for r in rows if r.result == FAIL and r.classification == "minor")

    if total == 0 or pending > 0:
        overall = PENDING_RESULT
    elif failed == 0:
        overall = ACCEPTED
    elif crit > 0 or major > 0:
        overall = REJECTED
    else:
        # Minor deviations only — a lot the Quality Manager may still accept.
        overall = ACCEPTED_WITH_DEVIATION

    del na  # counted for completeness; NA rows do not affect the disposition
    return Summary(total, passed, failed, pending, crit, major, minor, overall)
