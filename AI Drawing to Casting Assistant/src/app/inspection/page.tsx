"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Button, Card, EmptyState, Spinner } from "@/components/ui";
import { InspectionPanel } from "@/components/panels";

export default function InspectionPage() {
  const router = useRouter();
  const { active, generateInspection, stage, error, hydrated } = useStore();

  if (!hydrated) return <Spinner label="Loading workspace…" />;

  if (!active?.casting) {
    return (
      <EmptyState
        title="Casting concept required"
        description="The inspection standard is generated from the drawing data and the proposed casting. Generate the casting concept first."
        action={
          <Link href="/casting">
            <Button variant="primary">Go to Casting</Button>
          </Link>
        }
      />
    );
  }

  const { inspection } = active;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-industrial-900">Casting Inspection Standard</h1>
          <p className="mt-1 text-sm text-industrial-600">
            Incoming and in-process inspection plan for the raw casting, covering material, dimensions, GD&amp;T, visual,
            NDT, hardness, heat treatment, machining allowance and casting defects.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={stage === "generating-inspection"} onClick={() => void generateInspection(active.drawing.id)}>
            {stage === "generating-inspection" ? <Spinner label="Generating…" /> : inspection ? "Re-generate standard" : "Generate Casting Inspection Standard"}
          </Button>
          {inspection && (
            <>
              <Button onClick={() => window.print()} className="no-print">Print / Save as PDF</Button>
              <Button variant="primary" onClick={() => router.push("/reports")}>Go to Report</Button>
            </>
          )}
        </div>
      </header>

      {error && <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!inspection ? (
        <EmptyState
          title="No inspection standard generated yet"
          description="Generate the inspection standard to produce the full check list with specification, tolerance, method, instrument, frequency and acceptance criteria for each parameter."
          action={
            <Button variant="primary" disabled={stage === "generating-inspection"} onClick={() => void generateInspection(active.drawing.id)}>
              {stage === "generating-inspection" ? <Spinner label="Generating…" /> : "Generate Casting Inspection Standard"}
            </Button>
          }
        />
      ) : (
        <Card
          title="Inspection standard"
          subtitle={`${active.analysis ? active.analysis.fields.find((f) => f.key === "partName")?.value : ""} · raw casting`}
        >
          <InspectionPanel standard={inspection} />
          <p className="mt-5 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            ⚠ Rows marked &ldquo;AI derived&rdquo; come from standard practice for the identified material and process, not from the
            drawing. AI Recommendation – Engineering Validation Required before this standard is issued to a supplier.
          </p>
        </Card>
      )}
    </div>
  );
}
