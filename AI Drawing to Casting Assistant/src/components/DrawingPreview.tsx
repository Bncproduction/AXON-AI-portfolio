"use client";

import { useState } from "react";
import type { UploadedDrawing, WorkflowRecord } from "@/lib/types";
import { profileById } from "@/lib/samples";
import { buildRenderModel } from "@/lib/engine";
import { TechnicalView } from "./TechnicalView";
import { Button, cx } from "./ui";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DrawingMeta({ drawing }: { drawing: UploadedDrawing }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-industrial-600 sm:grid-cols-4">
      <div>
        <dt className="font-semibold uppercase tracking-wide text-industrial-500">File</dt>
        <dd className="truncate font-mono" title={drawing.fileName}>{drawing.fileName}</dd>
      </div>
      <div>
        <dt className="font-semibold uppercase tracking-wide text-industrial-500">Format</dt>
        <dd className="font-mono">{drawing.fileType || "unknown"}</dd>
      </div>
      <div>
        <dt className="font-semibold uppercase tracking-wide text-industrial-500">Size</dt>
        <dd className="font-mono">{formatBytes(drawing.fileSizeBytes)}</dd>
      </div>
      <div>
        <dt className="font-semibold uppercase tracking-wide text-industrial-500">Uploaded</dt>
        <dd className="font-mono">{new Date(drawing.uploadedAt).toLocaleString()}</dd>
      </div>
    </dl>
  );
}

/**
 * Left-hand drawing preview.
 *
 * Raster uploads render directly. PDFs render in an object element. DWG/DXF
 * cannot be rendered in the browser without a conversion service, so the
 * component falls back to a schematic section view of the component and says
 * so plainly.
 */
export function DrawingPreview({
  record,
  className,
  compact,
}: {
  record: WorkflowRecord;
  className?: string;
  compact?: boolean;
}) {
  const { drawing } = record;
  const [showSchematic, setShowSchematic] = useState(false);

  const profile = profileById(drawing.sampleProfileId);
  const schematic =
    record.casting?.render ??
    buildRenderModel({ profile, allowanceGeneral: 0.001, allowanceBores: 0.001, draftDeg: 0 });

  const hasRealPreview = !!drawing.previewDataUrl;
  const isPdf = drawing.fileType === "application/pdf";
  const renderSchematic = showSchematic || (!hasRealPreview && !isPdf) || (!hasRealPreview && isPdf);

  return (
    <div className={cx("flex h-full flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DrawingMeta drawing={drawing} />
        {hasRealPreview && (
          <Button variant="ghost" onClick={() => setShowSchematic((v) => !v)} className="no-print text-xs">
            {showSchematic ? "Show uploaded file" : "Show schematic section"}
          </Button>
        )}
      </div>

      <div className={cx("relative flex-1 overflow-hidden rounded-md border border-industrial-200 bg-white", compact ? "min-h-[280px]" : "min-h-[440px]")}>
        {!renderSchematic && hasRealPreview && !isPdf && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={drawing.previewDataUrl} alt={`Drawing ${drawing.fileName}`} className="h-full w-full object-contain" />
        )}
        {!renderSchematic && hasRealPreview && isPdf && (
          <object data={drawing.previewDataUrl} type="application/pdf" className="h-full min-h-[440px] w-full">
            <p className="p-6 text-sm text-industrial-600">
              This browser cannot display the PDF inline. The extracted content is still available on the AI Analysis page.
            </p>
          </object>
        )}
        {renderSchematic && (
          <div className="flex h-full flex-col">
            {!hasRealPreview && (
              <p className="border-b border-industrial-200 bg-industrial-50 px-3 py-2 text-[11px] text-industrial-600">
                {drawing.previewUnsupported
                  ? `${drawing.fileType.includes("dwg") || drawing.fileType.includes("dxf") ? "DWG/DXF" : "This format"} cannot be rendered in the browser without a conversion service. Showing a schematic section view of the component instead — see the DWG/DXF integration note on the Settings page.`
                  : "No rendered preview is stored for this drawing. Showing a schematic section view of the component."}
              </p>
            )}
            <div className="flex-1 p-2">
              <TechnicalView model={schematic} mode="drawing" className="h-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
