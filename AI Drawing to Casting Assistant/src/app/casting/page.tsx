"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Card, EmptyState, Spinner } from "@/components/ui";
import { CastingSummary, ComparisonPanel, DefectPanel, FeasibilityPanel, RecommendationPanel } from "@/components/panels";

const TABS = [
  { id: "concept", label: "Casting concept" },
  { id: "comparison", label: "Drawing vs Casting" },
  { id: "feasibility", label: "Casting Feasibility Analysis" },
  { id: "recommendation", label: "Casting Recommendation" },
  { id: "defects", label: "Predicted Casting Defects" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CastingPage() {
  const router = useRouter();
  const { active, generateCastingConcept, generateInspection, stage, error, hydrated } = useStore();
  const [tab, setTab] = useState<TabId>("concept");

  if (!hydrated) return <Spinner label="Loading workspace…" />;

  if (!active) {
    return (
      <EmptyState
        title="No drawing selected"
        description="Upload and analyse a drawing before generating a casting concept."
        action={
          <Link href="/upload">
            <Button variant="primary">Go to Upload Drawing</Button>
          </Link>
        }
      />
    );
  }

  if (!active.analysis) {
    return (
      <EmptyState
        title="Drawing not analysed"
        description="The casting concept is derived from the extracted drawing parameters. Run the AI analysis first."
        action={
          <Link href="/analysis">
            <Button variant="primary">Go to AI Analysis</Button>
          </Link>
        }
      />
    );
  }

  const { casting, feasibility, defects, recommendation } = active;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-industrial-900">Casting Generation</h1>
          <p className="mt-1 text-sm text-industrial-600">
            Raw casting configuration derived from the extracted drawing data, with feasibility, process recommendation
            and defect risk analysis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={stage === "generating-casting"} onClick={() => void generateCastingConcept(active.drawing.id)}>
            {stage === "generating-casting" ? <Spinner label="Generating…" /> : casting ? "Re-generate Casting" : "Generate Casting"}
          </Button>
          {casting && (
            <Button
              variant="primary"
              disabled={stage === "generating-inspection"}
              onClick={async () => {
                await generateInspection(active.drawing.id);
                router.push("/inspection");
              }}
            >
              {stage === "generating-inspection" ? <Spinner label="Generating…" /> : "Generate Casting Inspection Standard"}
            </Button>
          )}
        </div>
      </header>

      {error && <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!casting ? (
        <EmptyState
          title="No casting concept generated yet"
          description="Generate the casting to determine the raw casting envelope, machining allowance, draft, parting line and core requirement, and to run the feasibility and defect analyses."
          action={
            <Button variant="primary" disabled={stage === "generating-casting"} onClick={() => void generateCastingConcept(active.drawing.id)}>
              {stage === "generating-casting" ? <Spinner label="Generating…" /> : "Generate Casting"}
            </Button>
          }
        />
      ) : (
        <>
          <nav className="no-print flex flex-wrap gap-1 border-b border-industrial-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  tab === t.id
                    ? "-mb-px border-b-2 border-industrial-700 px-4 py-2 text-sm font-semibold text-industrial-900"
                    : "-mb-px border-b-2 border-transparent px-4 py-2 text-sm text-industrial-600 hover:text-industrial-900"
                }
              >
                {t.label}
                {t.id === "feasibility" && feasibility?.length ? (
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    {feasibility.length}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {tab === "concept" && (
            <Card title="Proposed casting" subtitle={casting.castingPartName}>
              <CastingSummary casting={casting} />
            </Card>
          )}

          {tab === "comparison" && (
            <Card title="Drawing vs casting comparison" subtitle="Left: final component drawing · Right: proposed casting">
              <ComparisonPanel record={active} />
            </Card>
          )}

          {tab === "feasibility" && feasibility && (
            <Card title="Casting Feasibility Analysis" subtitle="Issue → Location → Reason → Recommended action">
              <FeasibilityPanel issues={feasibility} />
            </Card>
          )}

          {tab === "recommendation" && recommendation && (
            <Card title="Casting Recommendation" subtitle="Process selection and casting parameters">
              <RecommendationPanel recommendation={recommendation} />
            </Card>
          )}

          {tab === "defects" && defects && (
            <Card title="Predict Potential Casting Defects" subtitle="Risk area → Possible cause → Preventive action → Inspection method">
              <DefectPanel defects={defects} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
