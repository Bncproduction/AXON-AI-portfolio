"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { SAMPLE_PROFILES, useStore, isPreviewable } from "@/lib/store";
import { Button, Card, EmptyState, Spinner, cx } from "@/components/ui";
import { DrawingPreview, formatBytes } from "@/components/DrawingPreview";

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.dwg,.dxf";
const MAX_BYTES = 25 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!isPreviewable(file.type) && file.type !== "application/pdf") return resolve(undefined);
    if (file.size > 4 * 1024 * 1024) return resolve(undefined); // keep the session light
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

export default function UploadPage() {
  const router = useRouter();
  const { addDrawing, addSampleDrawing, active, analyzeDrawing, stage } = useStore();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["pdf", "jpg", "jpeg", "png", "dwg", "dxf"].includes(ext)) {
        setMessage(`Unsupported format ".${ext}". Accepted: PDF, JPG, PNG, DWG, DXF.`);
        return;
      }
      if (file.size > MAX_BYTES) {
        setMessage(`File is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_BYTES)}.`);
        return;
      }
      setBusy(true);
      setMessage(null);
      const preview = await readAsDataUrl(file);
      addDrawing(file, preview);
      setBusy(false);
      setMessage(`"${file.name}" uploaded. Run the AI analysis to extract its technical content.`);
    },
    [addDrawing],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-industrial-900">Upload Drawing</h1>
        <p className="mt-1 text-sm text-industrial-600">
          Upload the final component drawing. The AI extraction stage reads the title block, dimensions, tolerances,
          GD&amp;T, notes and quality requirements from it.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Step 1 — Upload drawing" subtitle="PDF, JPG, PNG · DWG/DXF accepted for metadata (no in-browser render)">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            className={cx(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors",
              dragging ? "border-industrial-500 bg-industrial-50" : "border-industrial-300 bg-industrial-50/40 hover:bg-industrial-50",
            )}
          >
            <svg viewBox="0 0 24 24" className="h-12 w-12 text-industrial-400" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-industrial-800">Drag and drop the engineering drawing here</p>
              <p className="mt-1 text-xs text-industrial-500">or click to browse · PDF, JPG, PNG, DWG, DXF · up to 25 MB</p>
            </div>
            <Button variant="primary" onClick={() => inputRef.current?.click()}>
              Upload Drawing
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {busy && <div className="mt-3"><Spinner label="Reading file…" /></div>}
          {message && <p className="mt-3 rounded border border-industrial-200 bg-industrial-50 px-3 py-2 text-xs text-industrial-700">{message}</p>}

          <div className="mt-6 border-t border-industrial-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-industrial-500">
              No drawing to hand? Load a sample
            </p>
            <p className="mt-1 text-xs text-industrial-500">
              Each sample carries a complete, realistic drawing data set so the full workflow can be exercised.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SAMPLE_PROFILES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    addSampleDrawing(p.id);
                    setMessage(`Sample drawing "${p.drawingNumber}" loaded.`);
                  }}
                  className="rounded-md border border-industrial-200 bg-white px-3 py-2 text-left transition-colors hover:border-industrial-400 hover:bg-industrial-50"
                >
                  <span className="block text-sm font-medium text-industrial-800">{p.partName}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-industrial-500">
                    {p.drawingNumber} Rev {p.revision} · {p.material.split("(")[0].trim()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card
          title="Drawing preview"
          subtitle={active ? active.drawing.fileName : "Nothing selected"}
          actions={
            active && (
              <>
                <Button
                  variant="primary"
                  disabled={stage === "analyzing"}
                  onClick={async () => {
                    await analyzeDrawing(active.drawing.id);
                    router.push("/analysis");
                  }}
                >
                  {stage === "analyzing" ? <Spinner label="Analysing…" /> : "Analyze Drawing with AI"}
                </Button>
              </>
            )
          }
        >
          {active ? (
            <DrawingPreview record={active} />
          ) : (
            <EmptyState
              title="No drawing selected"
              description="Upload a drawing or load one of the samples to see the preview here."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
