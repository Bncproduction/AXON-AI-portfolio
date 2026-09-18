"use client";

import { useState } from "react";
import { FIELD_GROUP_LABELS, NOT_IN_DRAWING, type DrawingAnalysis, type FieldGroup } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, ConfidenceBar, ProvenanceBadge, Td, Th, TableShell, inputClass } from "./ui";

const GROUP_ORDER: FieldGroup[] = ["identification", "material", "geometry", "tolerance", "process", "quality"];

/** Editable extraction table. Any edit flips the field's provenance to "user". */
export function ExtractionTable({ analysis, drawingId }: { analysis: DrawingAnalysis; drawingId: string }) {
  const { updateField, resetField } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-5">
      {GROUP_ORDER.map((group) => {
        const rows = analysis.fields.filter((f) => f.group === group);
        if (!rows.length) return null;
        return (
          <div key={group}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-industrial-500">
              {FIELD_GROUP_LABELS[group]}
            </h3>
            <TableShell>
              <thead>
                <tr>
                  <Th className="w-[230px]">Parameter</Th>
                  <Th>Extracted value</Th>
                  <Th className="w-[150px]">Source</Th>
                  <Th className="w-[130px]">Confidence</Th>
                  <Th className="w-[120px] no-print">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => {
                  const isEditing = editing === f.key;
                  const missing = f.value === NOT_IN_DRAWING;
                  return (
                    <tr key={f.key} className="hover:bg-industrial-50/50">
                      <Td className="font-medium text-industrial-700">{f.label}</Td>
                      <Td>
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              rows={2}
                              className={inputClass}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                onClick={() => {
                                  updateField(drawingId, f.key, draft.trim() || NOT_IN_DRAWING);
                                  setEditing(null);
                                }}
                              >
                                Save
                              </Button>
                              <Button onClick={() => setEditing(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <span className={missing ? "text-slate-500 italic" : "text-industrial-900"} title={f.basis}>
                            {f.value}
                            {f.unit && !missing ? <span className="ml-1 text-[11px] text-industrial-400">({f.unit})</span> : null}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <ProvenanceBadge provenance={f.provenance} />
                      </Td>
                      <Td>
                        <ConfidenceBar value={f.confidence} />
                      </Td>
                      <Td className="no-print">
                        <div className="flex gap-1">
                          {!isEditing && (
                            <Button
                              variant="ghost"
                              className="px-2 py-1 text-xs"
                              onClick={() => {
                                setDraft(missing ? "" : f.value);
                                setEditing(f.key);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          {f.provenance === "user" && (
                            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => resetField(drawingId, f.key)}>
                              Reset
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          </div>
        );
      })}
    </div>
  );
}
