"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Button, Card, EmptyState, Spinner, StatTile, TableShell, Td, Th, cx } from "@/components/ui";
import { fieldValue } from "@/lib/engine";

const WORKFLOW_STEPS = [
  { href: "/upload", label: "Upload Drawing", detail: "PDF · JPG · PNG · DWG/DXF" },
  { href: "/analysis", label: "AI Analysis", detail: "Extract and correct drawing data" },
  { href: "/casting", label: "Casting Concept", detail: "Allowance · draft · parting · cores" },
  { href: "/inspection", label: "Inspection Standard", detail: "Full check list with acceptance" },
  { href: "/reports", label: "Quality Report", detail: "Sign-off ready document" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { records, hydrated, setActiveId, seedDemoData } = useStore();

  if (!hydrated) return <Spinner label="Loading workspace…" />;

  const analyses = records.filter((r) => r.analysis).length;
  const castings = records.filter((r) => r.casting).length;
  const inspections = records.filter((r) => r.inspection).length;
  const reports = records.filter((r) => r.report).length;
  const issues = records.reduce((n, r) => n + (r.feasibility?.length ?? 0), 0);
  const highIssues = records.reduce((n, r) => n + (r.feasibility?.filter((i) => i.severity === "high").length ?? 0), 0);
  const pendingValidation = records.filter((r) => r.casting && r.validation.status === "pending").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-industrial-900">Manufacturing Dashboard</h1>
          <p className="mt-1 text-sm text-industrial-600">
            AI Drawing → Casting Analysis → Casting Concept → Inspection Standard → Quality Report.
          </p>
        </div>
        <div className="flex gap-2">
          {records.length === 0 && <Button onClick={seedDemoData}>Load demo data</Button>}
          <Link href="/upload">
            <Button variant="primary">Upload Drawing</Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Total drawings uploaded" value={records.length} />
        <StatTile label="AI analyses completed" value={analyses} />
        <StatTile label="Casting models generated" value={castings} />
        <StatTile
          label="Feasibility issues"
          value={issues}
          tone={highIssues ? "alert" : issues ? "warn" : "good"}
          hint={`${highIssues} high severity`}
        />
        <StatTile label="Inspection standards" value={inspections} />
        <StatTile
          label="Pending engineering validation"
          value={pendingValidation}
          tone={pendingValidation ? "warn" : "good"}
          hint={`${reports} report${reports === 1 ? "" : "s"} generated`}
        />
      </div>

      <Card title="Workflow" subtitle="Each stage feeds the next — corrections made at any stage flow downstream">
        <ol className="grid gap-3 md:grid-cols-5">
          {WORKFLOW_STEPS.map((s, i) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex h-full flex-col gap-1 rounded-md border border-industrial-200 bg-white px-3 py-3 transition-colors hover:border-industrial-400 hover:bg-industrial-50"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-industrial-400">Step {i + 1}</span>
                <span className="text-sm font-semibold text-industrial-900">{s.label}</span>
                <span className="text-xs text-industrial-500">{s.detail}</span>
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <Card
        title="Recent drawing analysis history"
        subtitle={`${records.length} record${records.length === 1 ? "" : "s"}`}
        actions={
          <Link href="/history">
            <Button variant="ghost" className="text-xs">View full history</Button>
          </Link>
        }
      >
        {records.length === 0 ? (
          <EmptyState
            title="No drawings yet"
            description="Upload an engineering drawing, or load the demo data set to explore the full workflow."
            action={<Button onClick={seedDemoData}>Load demo data</Button>}
          />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Drawing</Th>
                <Th className="w-[150px]">Part number</Th>
                <Th className="w-[80px]">Rev</Th>
                <Th className="w-[130px]">Process</Th>
                <Th className="w-[110px]">Issues</Th>
                <Th className="w-[190px]">Stage</Th>
                <Th className="w-[160px]">Validation</Th>
                <Th className="w-[140px]">Uploaded</Th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 8).map((r) => {
                const high = r.feasibility?.filter((i) => i.severity === "high").length ?? 0;
                return (
                  <tr
                    key={r.drawing.id}
                    className="cursor-pointer hover:bg-industrial-50"
                    onClick={() => {
                      setActiveId(r.drawing.id);
                      router.push(r.analysis ? "/analysis" : "/upload");
                    }}
                  >
                    <Td className="max-w-[320px] truncate font-mono text-[12px]" >{r.drawing.fileName}</Td>
                    <Td className="font-mono">{r.analysis ? fieldValue(r.analysis, "partNumber") : "—"}</Td>
                    <Td className="font-mono">{r.analysis ? fieldValue(r.analysis, "revision") : "—"}</Td>
                    <Td className="text-xs">{r.recommendation ? (r.recommendation.insufficientInformation ? "Not determined" : r.recommendation.process) : "—"}</Td>
                    <Td>
                      {r.feasibility ? (
                        <span className={cx("font-mono text-xs", high ? "text-red-700" : "text-industrial-700")}>
                          {r.feasibility.length}
                          {high ? ` (${high} high)` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <span className="flex gap-1">
                        {(
                          [
                            ["A", !!r.analysis, "Analysed"],
                            ["C", !!r.casting, "Casting"],
                            ["I", !!r.inspection, "Inspection"],
                            ["R", !!r.report, "Report"],
                          ] as [string, boolean, string][]
                        ).map(([k, done, title]) => (
                          <span
                            key={k}
                            title={title}
                            className={cx(
                              "grid h-5 w-5 place-items-center rounded text-[10px] font-bold",
                              done ? "bg-emerald-100 text-emerald-700" : "bg-industrial-100 text-industrial-400",
                            )}
                          >
                            {k}
                          </span>
                        ))}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={cx(
                          "rounded border px-1.5 py-0.5 text-[11px] font-semibold",
                          r.validation.status === "validated"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : r.validation.status === "rejected"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-amber-200 bg-amber-50 text-amber-800",
                        )}
                      >
                        {r.validation.status === "validated" ? "Validated" : r.validation.status === "rejected" ? "Rejected" : "Pending"}
                      </span>
                    </Td>
                    <Td className="font-mono text-[11px] text-industrial-600">
                      {new Date(r.drawing.uploadedAt).toLocaleDateString()}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </Card>

      <Card title="Validation policy">
        <p className="text-sm text-industrial-700">
          The AI never marks a casting model, dimension, tolerance, material or manufacturing process as approved. A
          value is shown as <span className="font-semibold">From drawing</span> only when it was read off the print;
          everything the engine derives is shown as <span className="font-semibold">AI derived</span> and carries the
          notice &ldquo;AI Recommendation – Engineering Validation Required.&rdquo; Where the drawing is silent, the
          application prints &ldquo;Information Not Available in Drawing.&rdquo; rather than filling the gap silently.
        </p>
      </Card>
    </div>
  );
}
