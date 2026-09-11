"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { bytes, date } from "@/lib/format";
import {
  Alert,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import type { Drawing } from "@/lib/types";

export default function DrawingsPage() {
  const { can } = useAuth();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Drawing[]>(`/drawings${qs({ q, drawing_status: statusFilter })}`)
      .then(setDrawings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <>
      <PageHeader
        title="Engineering Drawings"
        subtitle="Upload a PDF or drawing image, then run the AI extraction pipeline"
        actions={
          can("inspector") && (
            <button className="btn-primary" onClick={() => setUploadOpen(true)}>
              Upload drawing
            </button>
          )
        }
      />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card
        title={`${drawings.length} drawing${drawings.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-md border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
              placeholder="Search drawing number…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="rounded-md border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="uploaded">Uploaded</option>
              <option value="analyzed">Analyzed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        }
        bodyClassName="p-0"
      >
        {loading ? (
          <Spinner />
        ) : drawings.length === 0 ? (
          <EmptyState
            title="No drawings yet"
            hint="Upload a PDF or scanned drawing to start the AI extraction workflow."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Drawing No.</th>
                  <th>Title</th>
                  <th>Part</th>
                  <th>File</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>By</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {drawings.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.drawing_number}</td>
                    <td className="max-w-[220px] truncate">{d.title ?? "—"}</td>
                    <td>{d.part?.part_number ?? "—"}</td>
                    <td className="max-w-[200px] truncate font-mono text-xs text-ink-500">
                      {d.file_name}
                    </td>
                    <td className="tabular-nums text-ink-500">{bytes(d.file_size)}</td>
                    <td>{date(d.created_at)}</td>
                    <td>{d.uploaded_by?.full_name ?? "—"}</td>
                    <td>
                      <StatusBadge value={d.status} />
                    </td>
                    <td className="text-right">
                      <Link href={`/drawings/${d.id}`} className="btn-secondary py-1">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onDone={() => {
          setUploadOpen(false);
          load();
        }}
      />
    </>
  );
}

function UploadDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drawingNumber, setDrawingNumber] = useState("");
  const [revision, setRevision] = useState("A");
  const [title, setTitle] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [partName, setPartName] = useState("");
  const [analyzeNow, setAnalyzeNow] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function pick(next: File | null) {
    setFile(next);
    if (next && !drawingNumber) setDrawingNumber(next.name.replace(/\.[^.]+$/, ""));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setError("Choose a drawing file first");
    setError(null);
    setBusy("Uploading…");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("drawing_number", drawingNumber);
      form.append("revision", revision);
      if (title) form.append("title", title);
      if (partNumber) form.append("part_number", partNumber);
      if (partName) form.append("part_name", partName);

      const drawing = await api.upload<Drawing>("/drawings/upload", form);
      if (analyzeNow) {
        setBusy("AI is reading the drawing… this can take up to a minute");
        await api.post(`/drawings/${drawing.id}/analyze`);
      }
      onDone();
      router.push(`/drawings/${drawing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={open} title="Upload engineering drawing" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition ${
            dragging ? "border-brand-500 bg-brand-50" : "border-ink-300 bg-ink-50 hover:bg-ink-100"
          }`}
        >
          <p className="text-sm font-medium text-ink-700">
            {file ? file.name : "Drop a drawing here, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            PDF, PNG, JPG, TIFF up to 40 MB. DWG/DXF are stored but must be exported to PDF for AI
            analysis.
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.webp,.dxf,.dwg"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Drawing number *">
            <input
              className="input"
              required
              value={drawingNumber}
              onChange={(e) => setDrawingNumber(e.target.value)}
            />
          </Field>
          <Field label="Revision">
            <input className="input" value={revision} onChange={(e) => setRevision(e.target.value)} />
          </Field>
          <Field label="Drawing title">
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Part number">
            <input
              className="input"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="Creates the part if it does not exist"
            />
          </Field>
          <Field label="Part name" className="sm:col-span-2">
            <input className="input" value={partName} onChange={(e) => setPartName(e.target.value)} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={analyzeNow}
            onChange={(e) => setAnalyzeNow(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300"
          />
          Run AI analysis immediately after upload
        </label>

        <div className="flex justify-end gap-2 border-t border-ink-200 pt-4">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={!!busy}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!!busy}>
            {busy ?? "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
