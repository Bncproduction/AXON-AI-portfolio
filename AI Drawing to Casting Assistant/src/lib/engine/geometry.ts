/**
 * 2-D section geometry generator for the CAD-style comparison view.
 *
 * This is deliberately a simple parametric archetype builder, not a CAD kernel.
 * It produces a `CastingRenderModel` (machined outline + raw casting outline
 * grown by the machining allowance, plus annotations). A real STEP/STL
 * generator can replace `buildRenderModel` without touching any UI code —
 * see `src/integrations/cad.ts`.
 */

import type { CastingRenderModel } from "@/lib/types";
import type { SampleProfile } from "@/lib/samples";

interface BuildInput {
  profile: SampleProfile;
  allowanceGeneral: number;
  allowanceBores: number;
  draftDeg: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Builds an SVG path from an explicit point list. */
function poly(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${r2(x)},${r2(y)}`).join(" ") + " Z";
}

/** Circle as two arcs, so it can be used inside a compound path. */
function circle(cx: number, cy: number, r: number): string {
  return `M${r2(cx - r)},${r2(cy)} a${r2(r)},${r2(r)} 0 1,0 ${r2(r * 2)},0 a${r2(r)},${r2(r)} 0 1,0 ${r2(-r * 2)},0 Z`;
}

function rect(x: number, y: number, w: number, h: number): string {
  return poly([
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]);
}

export function buildRenderModel({
  profile,
  allowanceGeneral,
  allowanceBores,
  draftDeg,
}: BuildInput): CastingRenderModel {
  const L = profile.envelope.length;
  const H = profile.envelope.height;
  const a = allowanceGeneral;

  switch (profile.archetype) {
    case "housing":
      return housing(L, H, a, allowanceBores, draftDeg, profile);
    case "flanged-cover":
      return flangedCover(L, H, a, allowanceBores, draftDeg, profile);
    case "bracket":
      return bracket(L, H, a, allowanceBores, draftDeg, profile);
    case "impeller":
    default:
      return impeller(L, H, a, allowanceBores, draftDeg, profile);
  }
}

function frame(L: number, H: number, a: number) {
  const pad = Math.max(28, a * 6);
  return { x: -pad, y: -pad, w: L + pad * 2, h: H + pad * 2 };
}

function housing(
  L: number,
  H: number,
  a: number,
  ab: number,
  draft: number,
  profile: SampleProfile,
): CastingRenderModel {
  const base = 22; // mounting foot thickness
  const inset = L * 0.11; // body inset from the foot edges
  const bodyTop = 0;
  const bodyBottom = H - base;

  const machinedPath = poly([
    [inset, bodyTop],
    [L - inset, bodyTop],
    [L - inset, bodyBottom],
    [L, bodyBottom],
    [L, H],
    [0, H],
    [0, bodyBottom],
    [inset, bodyBottom],
  ]);

  const castingPath = poly([
    [inset - a, bodyTop - a],
    [L - inset + a, bodyTop - a],
    [L - inset + a, bodyBottom - a],
    [L + a, bodyBottom - a],
    [L + a, H + a],
    [-a, H + a],
    [-a, bodyBottom - a],
    [inset - a, bodyBottom - a],
  ]);

  const boreR = 55;
  const cx = L / 2;
  const cy = H * 0.42;

  return {
    machinedPath,
    castingPath,
    features: [
      { id: "suction", path: circle(cx, cy, boreR), kind: "machined-bore", label: "Ø110 H7 suction bore" },
      { id: "suction-core", path: circle(cx, cy, boreR - ab), kind: "cored-hole", label: "Cored Ø104 as-cast" },
      { id: "bearing", path: circle(cx, H * 0.78, 31), kind: "machined-bore", label: "Ø62 H6 bearing seat" },
      { id: "discharge", path: rect(L - inset - 46, H * 0.16, 40, 40), kind: "pocket", label: "Ø80 H7 discharge" },
    ],
    partingLine: { x1: -a - 18, y1: cy, x2: L + a + 18, y2: cy },
    draftArrows: [
      { x: inset - a, y: H * 0.2, dx: -14, dy: 0, label: `${draft}° draft` },
      { x: L - inset + a, y: H * 0.2, dx: 14, dy: 0, label: `${draft}° draft` },
      { x: L * 0.2, y: H + a, dx: 0, dy: 14, label: `${draft}° draft` },
    ],
    cores: [
      { x: cx, y: cy, r: boreR - ab, label: "Core 1 — volute passage" },
      { x: cx, y: H * 0.78, r: 22, label: "Core 2 — bearing bore" },
    ],
    datums: profile.datums.map((d, i) => ({
      x: i === 0 ? cx : i === 1 ? L * 0.12 : L * 0.86,
      y: i === 0 ? H * 0.78 : H - base / 2,
      label: d.id,
    })),
    dimensions: [
      { id: "d1", x1: -a, y1: H + a + 20, x2: L + a, y2: H + a + 20, text: `${r2(L + 2 * a)} raw`, critical: false, scope: "casting" },
      { id: "d2", x1: L + a + 22, y1: -a, x2: L + a + 22, y2: H + a, text: `${r2(H + 2 * a)} raw`, critical: false, scope: "casting" },
      { id: "d0", x1: 0, y1: H + 20, x2: L, y2: H + 20, text: `${L} finished`, critical: false, scope: "part" },
      { id: "d3", x1: cx - boreR, y1: cy, x2: cx + boreR, y2: cy, text: "Ø110 H7", critical: true, scope: "both" },
      { id: "d4", x1: cx - 31, y1: H * 0.78, x2: cx + 31, y2: H * 0.78, text: "Ø62 H6", critical: true, scope: "both" },
    ],
    viewBox: frame(L, H, a),
  };
}

function flangedCover(
  L: number,
  H: number,
  a: number,
  ab: number,
  draft: number,
  profile: SampleProfile,
): CastingRenderModel {
  const flangeT = H * 0.3;
  const hubW = L * 0.55;
  const hubX = (L - hubW) / 2;

  const machinedPath = poly([
    [0, 0],
    [L, 0],
    [L, flangeT],
    [hubX + hubW, flangeT],
    [hubX + hubW, H],
    [hubX, H],
    [hubX, flangeT],
    [0, flangeT],
  ]);

  const castingPath = poly([
    [-a, -a],
    [L + a, -a],
    [L + a, flangeT + a],
    [hubX + hubW + a, flangeT + a],
    [hubX + hubW + a, H + a],
    [hubX - a, H + a],
    [hubX - a, flangeT + a],
    [-a, flangeT + a],
  ]);

  const cx = L / 2;
  const boreR = 42.5;

  return {
    machinedPath,
    castingPath,
    features: [
      { id: "seal", path: rect(cx - boreR, -a, boreR * 2, H + a * 2), kind: "machined-bore", label: "Ø85 H8 seal bore" },
      { id: "core", path: rect(cx - (boreR - ab), -a, (boreR - ab) * 2, H + a * 2), kind: "cored-hole", label: "Cored bore, as-cast" },
      { id: "bolt-l", path: rect(L * 0.07, -a, 11, flangeT + a), kind: "machined-bore", label: "Ø11 bolt hole" },
      { id: "bolt-r", path: rect(L * 0.87, -a, 11, flangeT + a), kind: "machined-bore", label: "Ø11 bolt hole" },
    ],
    partingLine: { x1: -a - 18, y1: flangeT, x2: L + a + 18, y2: flangeT },
    draftArrows: [
      { x: hubX - a, y: H * 0.8, dx: -14, dy: 0, label: `${draft}° draft` },
      { x: hubX + hubW + a, y: H * 0.8, dx: 14, dy: 0, label: `${draft}° draft` },
    ],
    cores: [{ x: cx, y: H / 2, r: boreR - ab, label: "Core 1 — central bore" }],
    datums: profile.datums.map((d, i) => ({
      x: i === 0 ? cx : L * 0.18,
      y: i === 0 ? H * 0.72 : flangeT,
      label: d.id,
    })),
    dimensions: [
      { id: "d1", x1: -a, y1: H + a + 20, x2: L + a, y2: H + a + 20, text: `Ø${r2(L + 2 * a)} raw`, critical: false, scope: "casting" },
      { id: "d0", x1: 0, y1: H + 20, x2: L, y2: H + 20, text: `Ø${L} finished`, critical: false, scope: "part" },
      { id: "d2", x1: cx - boreR, y1: H * 0.62, x2: cx + boreR, y2: H * 0.62, text: "Ø85 H8", critical: true, scope: "both" },
      { id: "d3", x1: L + a + 22, y1: -a, x2: L + a + 22, y2: flangeT, text: `${r2(flangeT)} flange`, critical: true, scope: "both" },
    ],
    viewBox: frame(L, H, a),
  };
}

function bracket(
  L: number,
  H: number,
  a: number,
  ab: number,
  draft: number,
  profile: SampleProfile,
): CastingRenderModel {
  const web = H * 0.26;
  const armW = L * 0.28;

  const machinedPath = poly([
    [0, 0],
    [armW, 0],
    [armW, H - web],
    [L, H - web],
    [L, H],
    [0, H],
  ]);

  const castingPath = poly([
    [-a, -a],
    [armW + a, -a],
    [armW + a, H - web - a],
    [L + a, H - web - a],
    [L + a, H + a],
    [-a, H + a],
  ]);

  const pivotR = 16;
  const pivotX = armW / 2;
  const pivotY = H * 0.26;

  return {
    machinedPath,
    castingPath,
    features: [
      { id: "pivot", path: circle(pivotX, pivotY, pivotR), kind: "machined-bore", label: "Ø32 H7 pivot bore" },
      { id: "pivot-core", path: circle(pivotX, pivotY, pivotR - ab), kind: "cored-hole", label: "Cored pivot, as-cast" },
      { id: "slot", path: rect(L * 0.55, H - web + 6, 48, 14), kind: "pocket", label: "14 wide adjustment slot" },
      { id: "pad", path: rect(L * 0.34, H - web - 2, 26, 12), kind: "pocket", label: "Machined mounting pad" },
    ],
    partingLine: { x1: -a - 18, y1: H - web, x2: L + a + 18, y2: H - web },
    draftArrows: [
      { x: -a, y: H * 0.25, dx: -14, dy: 0, label: `${draft}° draft` },
      { x: armW + a, y: H * 0.25, dx: 14, dy: 0, label: `${draft}° draft` },
      { x: L * 0.75, y: H + a, dx: 0, dy: 14, label: `${draft}° draft` },
    ],
    cores: [{ x: pivotX, y: pivotY, r: pivotR - ab, label: "Core 1 — pivot bore" }],
    datums: profile.datums.map((d, i) => ({
      x: i === 0 ? pivotX : i === 1 ? L * 0.4 : L * 0.62,
      y: i === 0 ? pivotY : H - web,
      label: d.id,
    })),
    dimensions: [
      { id: "d1", x1: -a, y1: H + a + 20, x2: L + a, y2: H + a + 20, text: `${r2(L + 2 * a)} raw`, critical: false, scope: "casting" },
      { id: "d0", x1: 0, y1: H + 20, x2: L, y2: H + 20, text: `${L} finished`, critical: false, scope: "part" },
      { id: "d2", x1: pivotX - pivotR, y1: pivotY, x2: pivotX + pivotR, y2: pivotY, text: "Ø32 H7", critical: true, scope: "both" },
      { id: "d3", x1: pivotX, y1: pivotY, x2: pivotX, y2: H - web, text: "84 ±0.15", critical: true, scope: "both" },
    ],
    viewBox: frame(L, H, a),
  };
}

function impeller(
  L: number,
  H: number,
  a: number,
  ab: number,
  draft: number,
  profile: SampleProfile,
): CastingRenderModel {
  const shroudT = H * 0.22;
  const hubW = L * 0.3;
  const hubX = (L - hubW) / 2;

  const machinedPath = poly([
    [0, 0],
    [L, 0],
    [L, shroudT],
    [hubX + hubW, shroudT],
    [hubX + hubW, H - shroudT],
    [L, H - shroudT],
    [L, H],
    [0, H],
    [0, H - shroudT],
    [hubX, H - shroudT],
    [hubX, shroudT],
    [0, shroudT],
  ]);

  const castingPath = poly([
    [-a, -a],
    [L + a, -a],
    [L + a, shroudT + a],
    [hubX + hubW + a, shroudT + a],
    [hubX + hubW + a, H - shroudT - a],
    [L + a, H - shroudT - a],
    [L + a, H + a],
    [-a, H + a],
    [-a, H - shroudT - a],
    [hubX - a, H - shroudT - a],
    [hubX - a, shroudT + a],
    [-a, shroudT + a],
  ]);

  const cx = L / 2;
  const boreR = 20;

  return {
    machinedPath,
    castingPath,
    features: [
      { id: "shaft", path: rect(cx - boreR, -a, boreR * 2, H + a * 2), kind: "machined-bore", label: "Ø40 H7 shaft bore" },
      { id: "shaft-core", path: rect(cx - (boreR - ab), -a, (boreR - ab) * 2, H + a * 2), kind: "cored-hole", label: "Cored shaft bore" },
      { id: "vane-l", path: rect(L * 0.1, shroudT, 34, H - shroudT * 2), kind: "cored-hole", label: "Vane passage (cored)" },
      { id: "vane-r", path: rect(L * 0.76, shroudT, 34, H - shroudT * 2), kind: "cored-hole", label: "Vane passage (cored)" },
    ],
    partingLine: { x1: -a - 18, y1: H / 2, x2: L + a + 18, y2: H / 2 },
    draftArrows: [
      { x: hubX - a, y: H * 0.5, dx: -14, dy: 0, label: `${draft}° draft` },
      { x: hubX + hubW + a, y: H * 0.5, dx: 14, dy: 0, label: `${draft}° draft` },
    ],
    cores: [
      { x: cx, y: H / 2, r: boreR - ab, label: "Core 1 — shaft bore" },
      { x: L * 0.17, y: H / 2, r: 17, label: "Core 2 — vane passage" },
      { x: L * 0.83, y: H / 2, r: 17, label: "Core 3 — vane passage" },
    ],
    datums: profile.datums.map((d, i) => ({
      x: i === 0 ? cx : L * 0.3,
      y: i === 0 ? H * 0.3 : shroudT,
      label: d.id,
    })),
    dimensions: [
      { id: "d1", x1: -a, y1: H + a + 20, x2: L + a, y2: H + a + 20, text: `Ø${r2(L + 2 * a)} raw`, critical: true, scope: "casting" },
      { id: "d0", x1: 0, y1: H + 20, x2: L, y2: H + 20, text: `Ø${L} ±0.30`, critical: true, scope: "part" },
      { id: "d2", x1: cx - boreR, y1: H * 0.68, x2: cx + boreR, y2: H * 0.68, text: "Ø40 H7", critical: true, scope: "both" },
    ],
    viewBox: frame(L, H, a),
  };
}
