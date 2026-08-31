export function num(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value)
    .toFixed(digits)
    .replace(/\.?0+$/, "");
}

export function toleranceText(p: {
  upper_tolerance: number | null;
  lower_tolerance: number | null;
}): string {
  if (p.upper_tolerance === null && p.lower_tolerance === null) return "—";
  const upper = p.upper_tolerance === null ? "—" : `+${num(p.upper_tolerance)}`;
  const lower = p.lower_tolerance === null ? "—" : num(p.lower_tolerance);
  return `${upper} / ${lower}`;
}

export function limitsText(p: {
  nominal_value: number | null;
  upper_tolerance: number | null;
  lower_tolerance: number | null;
  unit?: string | null;
}): string {
  if (p.nominal_value === null) return "—";
  const lsl = p.lower_tolerance === null ? null : p.nominal_value + p.lower_tolerance;
  const usl = p.upper_tolerance === null ? null : p.nominal_value + p.upper_tolerance;
  const unit = p.unit ?? "";
  if (lsl !== null && usl !== null) return `${num(lsl)} – ${num(usl)} ${unit}`.trim();
  if (usl !== null) return `max ${num(usl)} ${unit}`.trim();
  if (lsl !== null) return `min ${num(lsl)} ${unit}`.trim();
  return "—";
}

export function date(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function bytes(size: number): string {
  if (!size) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = size;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
