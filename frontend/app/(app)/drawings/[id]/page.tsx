"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import DrawingPreview from "@/components/DrawingPreview";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import type { Drawing, DrawingRevision, ExtractedDimension, Extraction, Standard } from "@/lib/types";

const HEADER_FIELDS: [keyof Extraction, string][] = [
  ["part_name", "Part Name"],
  ["part_number", "Part Number"],
  ["drawing_number", "Drawing Number"],
  ["drawing_revision", "Drawing Revision"],
  ["material", "Material"],
  ["units", "Units"],
];

export default function DrawingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();

  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [revision, setRevision] = useState<DrawingRevision | null>(null);
  const [draft, setDraft] = useState<Extraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<Drawing>(`/drawings/${id}`);
      setDrawing(d);
      const current = d.revisions?.find((r) => r.is_current) ?? d.revisions?.at(-1) ?? null;
      if (current) {
        const full = await api.get<DrawingRevision>(`/drawings/revisions/${current.id}/extraction`);
        setRevision(full);
        setDraft(full.extraction_json ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drawing");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const unverified = useMemo(
    () => draft?.dimensions.filter((d) => d.requires_manual_verification).length ?? 0,
    [draft],
  );

  async function analyze() {
    setBusy("AI is reading the drawing…");
    setError(null);
    setNotice(null);
    try {
      await api.post(`/drawings/${id}/analyze`);
      await load();
      setNotice("AI analysis complete. Review every extracted characteristic before generating the standard.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveExtraction() {
    if (!revision || !draft) return;
    setBusy("Saving…");
    setError(null);
    try {
      const saved = await api.put<DrawingRevision>(
        `/drawings/revisions/${revision.id}/extraction`,
        { extraction: recount(draft) },
      );
      setRevision(saved);
      setNotice("Verified extraction saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateStandard() {
    if (!revision) return;
    setBusy("Generating inspection standard…");
    setError(null);
    try {
      if (draft) {
        await api.put(`/drawings/revisions/${revision.id}/extraction`, {
          extraction: recount(draft),
        });
      }
      const standard = await api.post<Standard>(
        `/drawings/revisions/${revision.id}/generate-standard`,
      );
      router.push(`/standards/${standard.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the standard");
      setBusy(null);
    }
  }

  function patchDimension(index: number, patch: Partial<ExtractedDimension>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const dimensions = prev.dimensions.map((d, i) => (i === index ? { ...d, ...patch } : d));
      return { ...prev, dimensions };
    });
  }

  if (loading) return <Spinner />;
  if (!drawing) return <Alert>{error ?? "Drawing not found"}</Alert>;

  return (
    <>
      <PageHeader
        title={drawing.drawing_number}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {drawing.title ?? "Untitled drawing"} · Rev {revision?.revision ?? "—"}
            <StatusBadge value={drawing.status} />
            {revision?.extraction_engine && (
              <Badge tone="blue">Engine: {revision.extraction_engine}</Badge>
            )}
          </span>
        }
        actions={
          <>
            <Link href="/drawings" className="btn-secondary">
              Back
            </Link>
            {can("inspector") && (
              <button className="btn-secondary" onClick={analyze} disabled={!!busy}>
                {drawing.status === "analyzed" ? "Re-run AI analysis" : "Run AI analysis"}
              </button>
            )}
            {can("quality_manager") && draft && (
              <>
                <button className="btn-secondary" onClick={saveExtraction} disabled={!!busy}>
                  Save verification
                </button>
                <button className="btn-primary" onClick={generateStandard} disabled={!!busy}>
                  Generate inspection standard
                </button>
              </>
            )}
          </>
        }
      />

      <div className="mb-4 space-y-3">
        {busy && <Alert tone="blue">{busy}</Alert>}
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="green">{notice}</Alert>}
        {revision?.extraction_error && (
          <Alert>Last analysis failed: {revision.extraction_error}</Alert>
        )}
        {draft && unverified > 0 && (
          <Alert tone="amber">
            <strong>{unverified}</strong> characteristic{unverified === 1 ? "" : "s"} could not be
            read confidently and {unverified === 1 ? "is" : "are"} marked{" "}
            <em>Requires Manual Verification</em>. Supply the missing values and tick “Verified”, or
            the inspection standard cannot be approved.
          </Alert>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2" title="Drawing preview" bodyClassName="p-0">
          {drawing.file_size > 0 ? (
            <DrawingPreview drawingId={drawing.id} mimeType={drawing.mime_type} />
          ) : (
            <EmptyState
              title="No file stored"
              hint="This demo record was seeded without an uploaded file."
            />
          )}
        </Card>

        <div className="space-y-6 xl:col-span-3">
          <Card
            title="Title block — extracted"
            actions={
              revision?.analyzed_at && (
                <span className="text-xs text-ink-400">
                  Analyzed {dateTime(revision.analyzed_at)}
                  {revision.verified_at && ` · Verified ${dateTime(revision.verified_at)}`}
                </span>
              )
            }
          >
            {!draft ? (
              <EmptyState
                title="Not analyzed yet"
                hint="Run the AI analysis to extract dimensions, tolerances and GD&T from this drawing."
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {HEADER_FIELDS.map(([key, label]) => {
                    const flagged = draft.header_requires_verification?.[key as string];
                    return (
                      <Field key={key} label={label}>
                        <input
                          className={`input ${flagged ? "border-amber-400 bg-amber-50" : ""}`}
                          value={(draft[key] as string) ?? ""}
                          placeholder={flagged ? "Requires manual verification" : ""}
                          disabled={!can("quality_manager")}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              [key]: e.target.value,
                              header_requires_verification: {
                                ...draft.header_requires_verification,
                                [key]: e.target.value.trim() === "",
                              },
                            })
                          }
                        />
                      </Field>
                    );
                  })}
                </div>

                <dl className="mt-5 grid gap-3 border-t border-ink-200 pt-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="field">General tolerance note</dt>
                    <dd className="mt-1 text-ink-700">
                      {draft.general_tolerance_note ?? (
                        <span className="text-amber-700">Not legible — verify manually</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="field">Extraction confidence</dt>
                    <dd className="mt-1 text-ink-700">
                      {(draft.overall_confidence * 100).toFixed(0)}% average across{" "}
                      {draft.dimensions.length} characteristics (threshold{" "}
                      {(draft.confidence_threshold * 100).toFixed(0)}%)
                    </dd>
                  </div>
                  {draft.unreadable_areas.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="field">Reported unreadable areas</dt>
                      <dd className="mt-1 text-amber-700">{draft.unreadable_areas.join(" · ")}</dd>
                    </div>
                  )}
                  {draft.notes.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="field">Drawing notes</dt>
                      <dd className="mt-1 space-y-1 text-ink-700">
                        {draft.notes.map((n, i) => (
                          <p key={i}>
                            {n.is_inspection_requirement && <Badge tone="blue">Inspection</Badge>}{" "}
                            {n.text}
                          </p>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </>
            )}
          </Card>
        </div>
      </div>

      {draft && (
        <Card
          className="mt-6"
          title={`Extracted characteristics (${draft.dimensions.length})`}
          actions={
            <span className="text-xs text-ink-500">
              Amber rows need a value before the standard can be approved
            </span>
          }
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th className="min-w-[180px]">Characteristic</th>
                  <th className="min-w-[160px]">Callout on drawing</th>
                  <th>Type</th>
                  <th className="w-28">Nominal</th>
                  <th className="w-24">Upper tol.</th>
                  <th className="w-24">Lower tol.</th>
                  <th className="w-20">Unit</th>
                  <th className="w-28">Class</th>
                  <th className="w-20">Conf.</th>
                  <th className="w-24">Verified</th>
                </tr>
              </thead>
              <tbody>
                {draft.dimensions.map((dim, index) => {
                  const flagged = dim.requires_manual_verification;
                  const editable = can("quality_manager");
                  return (
                    <tr key={index} className={flagged ? "bg-amber-50/70" : undefined}>
                      <td className="tabular-nums text-ink-400">{dim.reference ?? index + 1}</td>
                      <td>
                        <input
                          className="cell-input"
                          value={dim.label}
                          disabled={!editable}
                          onChange={(e) => patchDimension(index, { label: e.target.value })}
                        />
                        {flagged && dim.verification_reasons?.length > 0 && (
                          <p className="mt-1 text-xs text-amber-700">
                            {dim.verification_reasons.join("; ")}
                          </p>
                        )}
                        {dim.gdt_symbol && (
                          <p className="mt-1 text-xs text-ink-500">
                            GD&amp;T {dim.gdt_symbol}
                            {dim.datums ? ` | datums ${dim.datums}` : ""}
                          </p>
                        )}
                      </td>
                      <td>
                        <input
                          className="cell-input font-mono text-xs"
                          value={dim.specification_text}
                          disabled={!editable}
                          onChange={(e) =>
                            patchDimension(index, { specification_text: e.target.value })
                          }
                        />
                      </td>
                      <td className="text-xs text-ink-500">{dim.dimension_type}</td>
                      <NumberCell
                        value={dim.nominal_value}
                        disabled={!editable}
                        onChange={(v) => patchDimension(index, { nominal_value: v })}
                      />
                      <NumberCell
                        value={dim.upper_tolerance}
                        disabled={!editable}
                        onChange={(v) => patchDimension(index, { upper_tolerance: v })}
                      />
                      <NumberCell
                        value={dim.lower_tolerance}
                        disabled={!editable}
                        onChange={(v) => patchDimension(index, { lower_tolerance: v })}
                      />
                      <td>
                        <input
                          className="cell-input"
                          value={dim.unit ?? ""}
                          disabled={!editable}
                          onChange={(e) => patchDimension(index, { unit: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className="cell-input"
                          value={dim.classification}
                          disabled={!editable}
                          onChange={(e) =>
                            patchDimension(index, {
                              classification: e.target.value as ExtractedDimension["classification"],
                            })
                          }
                        >
                          <option value="critical">Critical</option>
                          <option value="major">Major</option>
                          <option value="minor">Minor</option>
                        </select>
                      </td>
                      <td className="tabular-nums text-xs text-ink-500">
                        {(dim.confidence * 100).toFixed(0)}%
                      </td>
                      <td>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-ink-300"
                            checked={!flagged}
                            disabled={!editable}
                            onChange={(e) =>
                              patchDimension(index, {
                                requires_manual_verification: !e.target.checked,
                                verification_reasons: e.target.checked
                                  ? []
                                  : ["Marked for manual verification by Quality Engineer"],
                              })
                            }
                          />
                          {flagged ? <span className="text-amber-700">Pending</span> : "Verified"}
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function NumberCell({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <td>
      <input
        className="cell-input text-right tabular-nums"
        type="number"
        step="any"
        value={value ?? ""}
        placeholder="—"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </td>
  );
}

/** Keep the derived counters honest after the engineer edits the extraction. */
function recount(extraction: Extraction): Extraction {
  return {
    ...extraction,
    unverified_count: extraction.dimensions.filter((d) => d.requires_manual_verification).length,
  };
}
