"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { profileById } from "@/lib/samples";
import { Button, Card, ConfidenceBar, EmptyState, ProvenanceBadge, Spinner, TableShell, Td, Th } from "@/components/ui";
import { DrawingPreview } from "@/components/DrawingPreview";
import { ExtractionTable } from "@/components/ExtractionTable";

export default function AnalysisPage() {
  const router = useRouter();
  const { active, analyzeDrawing, generateCastingConcept, stage, error, hydrated } = useStore();

  if (!hydrated) return <Spinner label="Loading workspace…" />;

  if (!active) {
    return (
      <EmptyState
        title="No drawing selected"
        description="Upload a drawing first — the AI analysis runs against the active drawing."
        action={
          <Link href="/upload">
            <Button variant="primary">Go to Upload Drawing</Button>
          </Link>
        }
      />
    );
  }

  const { analysis } = active;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-industrial-900">AI Drawing Analysis</h1>
          <p className="mt-1 text-sm text-industrial-600">
            Extracted technical content for <span className="font-mono">{active.drawing.fileName}</span>. Every value is
            editable — corrections are recorded as user input and flow into the casting concept.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={stage === "analyzing"} onClick={() => void analyzeDrawing(active.drawing.id)}>
            {stage === "analyzing" ? <Spinner label="Analysing…" /> : analysis ? "Re-run AI analysis" : "Analyze Drawing with AI"}
          </Button>
          {analysis && (
            <Button
              variant="primary"
              disabled={stage === "generating-casting"}
              onClick={async () => {
                await generateCastingConcept(active.drawing.id);
                router.push("/casting");
              }}
            >
              {stage === "generating-casting" ? <Spinner label="Generating…" /> : "Generate Casting"}
            </Button>
          )}
        </div>
      </header>

      {error && <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card title="Uploaded drawing" subtitle="Final component drawing">
            <DrawingPreview record={active} compact />
          </Card>

          {analysis && (
            <Card title="Extraction summary">
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-industrial-600">Overall confidence</dt>
                  <dd><ConfidenceBar value={analysis.confidence} /></dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-industrial-600">Parameters extracted</dt>
                  <dd className="font-mono text-industrial-900">
                    {analysis.fields.filter((f) => f.provenance !== "unavailable").length} / {analysis.fields.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-industrial-600">Engine</dt>
                  <dd className="font-mono text-[11px] text-industrial-700">{analysis.engineVersion}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-industrial-600">Analysed at</dt>
                  <dd className="font-mono text-[11px] text-industrial-700">{new Date(analysis.analyzedAt).toLocaleString()}</dd>
                </div>
              </dl>

              {analysis.missingFields.length > 0 && (
                <div className="mt-4 rounded border border-slate-300 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Information Not Available in Drawing.
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
                    {analysis.missingFields.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-slate-500">
                    These parameters have no supporting callout on the drawing. Enter a value manually, or the casting
                    stage will flag the gap and derive a value from standard practice where it is able to.
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {!analysis ? (
            <EmptyState
              title="Drawing not analysed yet"
              description='Run "Analyze Drawing with AI" to extract the part identification, material, dimensions, tolerances, GD&T, hole and thread details, notes and quality requirements from this drawing.'
              action={
                <Button variant="primary" disabled={stage === "analyzing"} onClick={() => void analyzeDrawing(active.drawing.id)}>
                  {stage === "analyzing" ? <Spinner label="Analysing…" /> : "Analyze Drawing with AI"}
                </Button>
              }
            />
          ) : (
            <>
              <Card title="Extracted parameters" subtitle="Click Edit on any row to correct a value before generating the casting">
                <ExtractionTable analysis={analysis} drawingId={active.drawing.id} />
              </Card>

              <Card title="Critical dimensions">
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Feature</Th>
                      <Th className="w-[130px]">Nominal</Th>
                      <Th className="w-[170px]">Tolerance</Th>
                      <Th className="w-[90px]">Datum</Th>
                      <Th className="w-[110px]">Critical</Th>
                      <Th className="w-[140px]">Source</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.criticalDimensions.map((d) => (
                      <tr key={d.id} className="hover:bg-industrial-50/50">
                        <Td>{d.feature}</Td>
                        <Td className="font-mono">{d.nominal}</Td>
                        <Td className="font-mono">{d.tolerance}</Td>
                        <Td className="font-mono">{d.datum ?? "—"}</Td>
                        <Td>
                          {d.inspectionCritical ? (
                            <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                              Critical
                            </span>
                          ) : (
                            <span className="text-xs text-industrial-500">General</span>
                          )}
                        </Td>
                        <Td><ProvenanceBadge provenance={d.provenance} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              </Card>

              <Card title="GD&T features and datum references">
                <TableShell>
                  <thead>
                    <tr>
                      <Th className="w-[70px]">Symbol</Th>
                      <Th className="w-[170px]">Characteristic</Th>
                      <Th className="w-[130px]">Tolerance</Th>
                      <Th className="w-[130px]">Datum ref.</Th>
                      <Th>Applies to</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.gdt.map((g) => (
                      <tr key={g.id} className="hover:bg-industrial-50/50">
                        <Td className="text-lg leading-none">{g.symbol}</Td>
                        <Td>{g.characteristic}</Td>
                        <Td className="font-mono">{g.tolerance}</Td>
                        <Td className="font-mono">{g.datumReference}</Td>
                        <Td>{g.appliesTo}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
                <div className="mt-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-industrial-500">Datum features</h4>
                  <ul className="space-y-1 text-sm text-industrial-700">
                    {analysis.datums.map((d) => (
                      <li key={d.id} className="flex items-start gap-2">
                        <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center border border-industrial-400 bg-white font-mono text-[11px] font-bold">
                          {d.id}
                        </span>
                        {d.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card title="Hole and thread details">
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Description</Th>
                      <Th className="w-[140px]">Size</Th>
                      <Th className="w-[110px]">Depth</Th>
                      <Th className="w-[60px]">Qty</Th>
                      <Th className="w-[210px]">Thread</Th>
                      <Th className="w-[150px]">Cast / machined</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.holes.map((h) => (
                      <tr key={h.id} className="hover:bg-industrial-50/50">
                        <Td>{h.description}</Td>
                        <Td className="font-mono">{h.diameter}</Td>
                        <Td className="font-mono">{h.depth}</Td>
                        <Td className="font-mono">{h.quantity}</Td>
                        <Td className="font-mono text-xs">{h.thread ?? "—"}</Td>
                        <Td className="text-xs">
                          {h.cored && <span className="mr-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-800">Cored</span>}
                          {h.machined && <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-blue-800">Machined</span>}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Special notes">
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm text-industrial-700">
                    {analysis.specialNotes.map((n) => (
                      <li key={n.id}>{n.text}</li>
                    ))}
                  </ol>
                </Card>
                <Card title="Quality inspection requirements" subtitle="As called out on the drawing">
                  <ul className="list-disc space-y-1.5 pl-5 text-sm text-industrial-700">
                    {active.drawing.sampleProfileId && <QualityRequirements profileId={active.drawing.sampleProfileId} />}
                  </ul>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Drawing quality notes, read straight from the matched profile. */
function QualityRequirements({ profileId }: { profileId: string }) {
  return (
    <>
      {profileById(profileId).qualityRequirements.map((q) => (
        <li key={q}>{q}</li>
      ))}
    </>
  );
}
