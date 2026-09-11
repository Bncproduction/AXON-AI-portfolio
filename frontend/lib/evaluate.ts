import type { Parameter, ResultValue } from "./types";

/**
 * Client-side mirror of `app/services/evaluation.py`, used only to give the
 * inspector instant feedback while typing. The server re-evaluates every row on
 * save and its verdict is the one that is stored.
 */
export interface LocalVerdict {
  result: ResultValue;
  deviation: number | null;
  reason: string;
}

export function limits(p: Parameter): [number | null, number | null] {
  if (p.nominal_value === null) return [null, null];
  let lsl = p.lower_tolerance === null ? null : p.nominal_value + p.lower_tolerance;
  let usl = p.upper_tolerance === null ? null : p.nominal_value + p.upper_tolerance;
  if (lsl !== null && usl !== null && lsl > usl) [lsl, usl] = [usl, lsl];
  return [lsl, usl];
}

export function evaluate(
  p: Parameter,
  actualValue: number | null,
  manualResult?: ResultValue | null,
): LocalVerdict {
  if (p.requires_manual_verification) {
    return { result: "PENDING", deviation: null, reason: "Specification requires manual verification" };
  }
  if (p.is_attribute) {
    if (manualResult === "PASS" || manualResult === "FAIL" || manualResult === "NA") {
      return { result: manualResult, deviation: null, reason: "Attribute verdict" };
    }
    return { result: "PENDING", deviation: null, reason: "Awaiting inspector verdict" };
  }
  if (actualValue === null || Number.isNaN(actualValue)) {
    return { result: "PENDING", deviation: null, reason: "No measurement recorded" };
  }

  const [lsl, usl] = limits(p);
  if (lsl === null && usl === null) {
    return { result: "PENDING", deviation: null, reason: "No usable tolerance on specification" };
  }
  if (usl !== null && actualValue > usl) {
    return { result: "FAIL", deviation: round(actualValue - usl), reason: "Above upper limit" };
  }
  if (lsl !== null && actualValue < lsl) {
    return { result: "FAIL", deviation: round(actualValue - lsl), reason: "Below lower limit" };
  }
  return { result: "PASS", deviation: 0, reason: "Within specification" };
}

function round(value: number) {
  return Math.round(value * 1e6) / 1e6;
}
