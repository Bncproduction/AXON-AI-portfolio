"use client";

/**
 * CAD-style SVG renderer for the section views.
 *
 * mode "drawing"  — the finished machined component
 * mode "casting"  — the proposed raw casting, with the machining allowance ring,
 *                   parting line, draft arrows and core positions
 * mode "overlay"  — both superimposed
 */

import { useMemo } from "react";
import type { CastingRenderModel } from "@/lib/types";
import { cx } from "./ui";

export type ViewMode = "drawing" | "casting" | "overlay";

export interface ViewLayers {
  allowance: boolean;
  machinedSurfaces: boolean;
  asCast: boolean;
  critical: boolean;
  partingLine: boolean;
  draft: boolean;
  cores: boolean;
  datums: boolean;
  dimensions: boolean;
  inspection: boolean;
}

export const DEFAULT_LAYERS: ViewLayers = {
  allowance: true,
  machinedSurfaces: true,
  asCast: true,
  critical: true,
  partingLine: true,
  draft: true,
  cores: true,
  datums: true,
  dimensions: true,
  inspection: true,
};

const C = {
  machined: "#1d4ed8",
  machinedFill: "#dbeafe",
  asCast: "#b45309",
  asCastFill: "#fde7c7",
  allowance: "#f59e0b",
  critical: "#dc2626",
  parting: "#7c3aed",
  core: "#0f766e",
  datum: "#334155",
  dim: "#475569",
};

export function TechnicalView({
  model,
  mode,
  layers = DEFAULT_LAYERS,
  title,
  className,
}: {
  model: CastingRenderModel;
  mode: ViewMode;
  layers?: ViewLayers;
  title?: string;
  className?: string;
}) {
  const vb = model.viewBox;
  const u = vb.w / 100; // 1 unit = 1% of the view width, used to scale annotations
  const font = 2.4 * u;
  const stroke = 0.28 * u;

  const showCasting = mode !== "drawing";
  const showMachined = mode !== "casting" || true; // the finished contour is always useful as a reference

  const arrowId = useMemo(() => `arrow-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <figure className={cx("flex h-full flex-col", className)}>
      {title && (
        <figcaption className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-industrial-600">
          <span>{title}</span>
          <span className="font-mono text-[10px] font-normal normal-case text-industrial-400">
            Section view · dimensions in mm · not to scale
          </span>
        </figcaption>
      )}
      <div className="cad-grid flex-1 overflow-hidden rounded-md border border-industrial-200">
        <svg
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          className="h-full w-full"
          role="img"
          aria-label={title ?? "Technical section view"}
        >
          <defs>
            <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={C.dim} />
            </marker>
            <pattern id="hatch-machined" width={1.6 * u} height={1.6 * u} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2={1.6 * u} stroke={C.machined} strokeWidth={0.22 * u} opacity="0.45" />
            </pattern>
            <pattern id="hatch-allowance" width={1.3 * u} height={1.3 * u} patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2={1.3 * u} stroke={C.allowance} strokeWidth={0.3 * u} opacity="0.8" />
            </pattern>
          </defs>

          {/* Raw casting body */}
          {showCasting && layers.asCast && (
            <path d={model.castingPath} fill={C.asCastFill} stroke={C.asCast} strokeWidth={stroke * 1.6} strokeLinejoin="round" />
          )}

          {/* Machining allowance ring = casting outline minus machined outline */}
          {showCasting && layers.allowance && (
            <path
              d={`${model.castingPath} ${model.machinedPath}`}
              fillRule="evenodd"
              fill="url(#hatch-allowance)"
              stroke="none"
            />
          )}

          {/* Finished machined body */}
          {showMachined && (
            <path
              d={model.machinedPath}
              fill={mode === "drawing" ? "url(#hatch-machined)" : C.machinedFill}
              fillOpacity={mode === "overlay" ? 0.75 : 1}
              stroke={C.machined}
              strokeWidth={stroke * 1.8}
              strokeDasharray={mode === "casting" ? `${1.4 * u} ${0.9 * u}` : undefined}
              strokeLinejoin="round"
            />
          )}

          {/* Features: bores, cored holes, pockets */}
          {model.features.map((f) => {
            const isCored = f.kind === "cored-hole";
            if (isCored && !showCasting) return null;
            if (!isCored && mode === "casting" && !layers.machinedSurfaces) return null;
            return (
              <path
                key={f.id}
                d={f.path}
                fill={isCored ? C.asCastFill : "#ffffff"}
                stroke={isCored ? C.asCast : C.machined}
                strokeWidth={stroke * 1.4}
                strokeDasharray={isCored ? `${1.2 * u} ${0.8 * u}` : undefined}
              >
                <title>{f.label}</title>
              </path>
            );
          })}

          {/* Parting line */}
          {showCasting && layers.partingLine && (
            <g>
              <line
                x1={model.partingLine.x1}
                y1={model.partingLine.y1}
                x2={model.partingLine.x2}
                y2={model.partingLine.y2}
                stroke={C.parting}
                strokeWidth={stroke * 1.4}
                strokeDasharray={`${2.4 * u} ${1 * u} ${0.5 * u} ${1 * u}`}
              />
              <text
                x={model.partingLine.x2}
                y={model.partingLine.y2 - 1.1 * u}
                textAnchor="end"
                fontSize={font * 0.85}
                fill={C.parting}
                fontWeight="600"
              >
                PL — parting line
              </text>
            </g>
          )}

          {/* Draft arrows */}
          {showCasting &&
            layers.draft &&
            model.draftArrows.map((d, i) => (
              <g key={`draft-${i}`}>
                <line
                  x1={d.x}
                  y1={d.y}
                  x2={d.x + d.dx * u * 0.22}
                  y2={d.y + d.dy * u * 0.22}
                  stroke={C.asCast}
                  strokeWidth={stroke * 1.2}
                  markerEnd={`url(#${arrowId})`}
                />
                <text
                  x={d.x + d.dx * u * 0.3}
                  y={d.y - 0.6 * u}
                  textAnchor={d.dx < 0 ? "end" : "start"}
                  fontSize={font * 0.8}
                  fill={C.asCast}
                >
                  {d.label}
                </text>
              </g>
            ))}

          {/* Cores */}
          {showCasting &&
            layers.cores &&
            model.cores.map((c, i) => (
              <g key={`core-${i}`}>
                <circle cx={c.x} cy={c.y} r={Math.max(c.r, 2 * u)} fill={C.core} fillOpacity="0.1" stroke={C.core} strokeWidth={stroke} strokeDasharray={`${0.9 * u} ${0.7 * u}`} />
                <text x={c.x} y={c.y + font * 0.35} textAnchor="middle" fontSize={font * 0.8} fill={C.core} fontWeight="700">
                  C{i + 1}
                  <title>{c.label}</title>
                </text>
              </g>
            ))}

          {/* Datums */}
          {layers.datums &&
            model.datums.map((d, i) => (
              <g key={`datum-${i}`}>
                <rect
                  x={d.x - 1.6 * u}
                  y={d.y - 1.6 * u}
                  width={3.2 * u}
                  height={3.2 * u}
                  fill="#ffffff"
                  stroke={C.datum}
                  strokeWidth={stroke * 1.2}
                />
                <text x={d.x} y={d.y + font * 0.38} textAnchor="middle" fontSize={font} fill={C.datum} fontWeight="700">
                  {d.label}
                </text>
              </g>
            ))}

          {/* Dimensions */}
          {layers.dimensions &&
            model.dimensions.map((d) => {
              if (d.critical && !layers.critical) return null;
              if (mode === "drawing" && d.scope === "casting") return null;
              if (mode === "casting" && d.scope === "part") return null;
              const mx = (d.x1 + d.x2) / 2;
              const my = (d.y1 + d.y2) / 2;
              const colour = d.critical ? C.critical : C.dim;
              return (
                <g key={d.id}>
                  <line
                    x1={d.x1}
                    y1={d.y1}
                    x2={d.x2}
                    y2={d.y2}
                    stroke={colour}
                    strokeWidth={stroke}
                    markerStart={`url(#${arrowId})`}
                    markerEnd={`url(#${arrowId})`}
                  />
                  <rect
                    x={mx - d.text.length * font * 0.31}
                    y={my - font * 0.85}
                    width={d.text.length * font * 0.62}
                    height={font * 1.4}
                    fill="#ffffff"
                    fillOpacity="0.92"
                    rx={0.4 * u}
                  />
                  <text x={mx} y={my + font * 0.35} textAnchor="middle" fontSize={font * 0.92} fill={colour} fontWeight={d.critical ? "700" : "500"}>
                    {d.text}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>
    </figure>
  );
}

export function ViewLegend({ mode }: { mode: ViewMode }) {
  const items: { colour: string; label: string; dashed?: boolean; hatch?: boolean }[] = [
    { colour: C.machined, label: "Machined surface" },
    { colour: C.asCast, label: "As-cast surface" },
    { colour: C.allowance, label: "Machining allowance", hatch: true },
    { colour: C.critical, label: "Critical dimension" },
    { colour: C.parting, label: "Parting line", dashed: true },
    { colour: C.core, label: "Core location", dashed: true },
    { colour: C.datum, label: "Datum reference" },
  ];
  const visible = mode === "drawing" ? items.filter((i) => !["Machining allowance", "Parting line", "Core location"].includes(i.label)) : items;
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-industrial-600">
      {visible.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-5 rounded-sm"
            style={{
              background: i.hatch
                ? `repeating-linear-gradient(-45deg, ${i.colour}, ${i.colour} 2px, transparent 2px, transparent 4px)`
                : i.dashed
                  ? `repeating-linear-gradient(90deg, ${i.colour}, ${i.colour} 4px, transparent 4px, transparent 7px)`
                  : i.colour,
            }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
