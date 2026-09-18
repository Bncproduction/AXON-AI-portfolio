"use client";

/**
 * Client-side workflow store.
 *
 * State lives in React context and is persisted to localStorage so a demo
 * session survives a refresh. Swapping this for a server-backed store (PLM /
 * ERP integration) only requires reimplementing the action bodies — the
 * component API stays the same.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SETTINGS, SETTINGS_KEY, STORAGE_KEY } from "./defaults";
import { runAnalysisStage, runCastingStage, runInspectionStage } from "./pipeline";
import { SAMPLE_PROFILES, matchProfile, profileById } from "./samples";
import type {
  AppSettings,
  CastingReport,
  DrawingAnalysis,
  UploadedDrawing,
  ValidationSignoff,
  WorkflowRecord,
} from "./types";

type Stage = "idle" | "analyzing" | "generating-casting" | "generating-inspection" | "generating-report";

interface StoreValue {
  hydrated: boolean;
  records: WorkflowRecord[];
  activeId: string | null;
  active: WorkflowRecord | null;
  settings: AppSettings;
  stage: Stage;
  error: string | null;
  setActiveId: (id: string | null) => void;
  addDrawing: (file: File, previewDataUrl?: string) => UploadedDrawing;
  addSampleDrawing: (profileId: string) => UploadedDrawing;
  analyzeDrawing: (id: string) => Promise<void>;
  updateField: (id: string, key: string, value: string) => void;
  resetField: (id: string, key: string) => void;
  generateCastingConcept: (id: string) => Promise<void>;
  generateInspection: (id: string) => Promise<void>;
  generateReport: (id: string, signoff: ValidationSignoff) => CastingReport;
  setValidation: (id: string, status: "pending" | "validated" | "rejected", by: string, note: string) => void;
  deleteRecord: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  seedDemoData: () => void;
  clearAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const newId = () => `dw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function inferFileType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "application/pdf";
  if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
  if (["png"].includes(ext)) return "image/png";
  if (["dwg"].includes(ext)) return "image/vnd.dwg";
  if (["dxf"].includes(ext)) return "image/vnd.dxf";
  return "application/octet-stream";
}

export function isPreviewable(fileType: string): boolean {
  return fileType.startsWith("image/") && !fileType.includes("dwg") && !fileType.includes("dxf");
}

/** Builds a fully-worked demo record so the dashboard is never empty. */
function buildSeedRecord(
  profileId: string,
  fileName: string,
  daysAgo: number,
  opts: { validated?: boolean; withInspection?: boolean; withReport?: boolean } = {},
): WorkflowRecord {
  const profile = profileById(profileId);
  const when = new Date(Date.now() - daysAgo * 86400_000).toISOString();
  const drawing: UploadedDrawing = {
    id: `seed-${profileId}`,
    fileName,
    fileType: inferFileType(fileName),
    fileSizeBytes: 420_000 + profile.partNumber.length * 3100,
    uploadedAt: when,
    previewUnsupported: !isPreviewable(inferFileType(fileName)),
    sampleProfileId: profileId,
    uploadedBy: DEFAULT_SETTINGS.preparedBy,
  };
  const analysis = { ...runAnalysisStage(profileId, drawing.id), analyzedAt: when };
  const { casting, feasibility, defects, recommendation } = runCastingStage(profileId, analysis, DEFAULT_SETTINGS);
  const record: WorkflowRecord = {
    drawing,
    analysis,
    casting: { ...casting, generatedAt: when },
    feasibility,
    defects,
    recommendation,
    validation: opts.validated
      ? {
          status: "validated",
          validatedBy: DEFAULT_SETTINGS.engineeringApprover,
          validatedAt: when,
          note: "Casting concept and inspection standard reviewed against the released drawing.",
        }
      : { status: "pending" },
  };
  if (opts.withInspection) {
    record.inspection = { ...runInspectionStage(profileId, analysis, casting, recommendation), generatedAt: when };
  }
  if (opts.withReport && record.inspection) {
    record.report = {
      id: `rp-${drawing.id}`,
      drawingId: drawing.id,
      reportNumber: `CAR-${analysis.fields.find((f) => f.key === "partNumber")?.value ?? "UNKNOWN"}-01`,
      generatedAt: when,
      signoff: {
        preparedBy: DEFAULT_SETTINGS.preparedBy,
        date: when.slice(0, 10),
        supplier: DEFAULT_SETTINGS.supplier,
        customer: DEFAULT_SETTINGS.customer,
        qaApprover: DEFAULT_SETTINGS.qaApprover,
        qaApproved: !!opts.validated,
        engineeringApprover: DEFAULT_SETTINGS.engineeringApprover,
        engineeringApproved: !!opts.validated,
        remarks: opts.validated ? "Released for pattern manufacture." : "Awaiting engineering validation.",
      },
    };
  }
  return record;
}

function buildSeedData(): WorkflowRecord[] {
  return [
    buildSeedRecord("pump-housing-gg25", "DRG-PH-4820_RevC_Pump_Housing.pdf", 2, {
      validated: true,
      withInspection: true,
      withReport: true,
    }),
    buildSeedRecord("bearing-cap-sg500", "DRG-BC-2210_RevB_Bearing_Cover.pdf", 5, {
      withInspection: true,
    }),
    buildSeedRecord("mounting-bracket-a356", "DRG-MB-7715_RevA_Bracket.dwg", 9, {}),
  ];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<WorkflowRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once on mount.
  useEffect(() => {
    try {
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (rawSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) });
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { records: WorkflowRecord[]; activeId: string | null };
        setRecords(parsed.records ?? []);
        setActiveId(parsed.activeId ?? parsed.records?.[0]?.drawing.id ?? null);
      } else {
        const seeded = buildSeedData();
        setRecords(seeded);
        setActiveId(seeded[0].drawing.id);
      }
    } catch {
      const seeded = buildSeedData();
      setRecords(seeded);
      setActiveId(seeded[0].drawing.id);
    }
    setHydrated(true);
  }, []);

  // Persist. Preview data URLs are dropped to stay within the storage quota.
  useEffect(() => {
    if (!hydrated) return;
    try {
      const slim = records.map((r) => ({
        ...r,
        drawing: {
          ...r.drawing,
          previewDataUrl: r.drawing.previewDataUrl && r.drawing.previewDataUrl.length < 400_000
            ? r.drawing.previewDataUrl
            : undefined,
        },
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ records: slim, activeId }));
    } catch {
      /* quota exceeded — the session still works, it just will not survive a refresh */
    }
  }, [records, activeId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings, hydrated]);

  const patchRecord = useCallback((id: string, patch: (r: WorkflowRecord) => WorkflowRecord) => {
    setRecords((prev) => prev.map((r) => (r.drawing.id === id ? patch(r) : r)));
  }, []);

  const addDrawing = useCallback<StoreValue["addDrawing"]>((file, previewDataUrl) => {
    const fileType = file.type || inferFileType(file.name);
    const profile = matchProfile(file.name, file.size);
    const drawing: UploadedDrawing = {
      id: newId(),
      fileName: file.name,
      fileType,
      fileSizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      previewDataUrl,
      previewUnsupported: !isPreviewable(fileType),
      sampleProfileId: profile.id,
      uploadedBy: DEFAULT_SETTINGS.preparedBy,
    };
    setRecords((prev) => [{ drawing, validation: { status: "pending" } }, ...prev]);
    setActiveId(drawing.id);
    setError(null);
    return drawing;
  }, []);

  const addSampleDrawing = useCallback<StoreValue["addSampleDrawing"]>((profileId) => {
    const profile = profileById(profileId);
    const fileName = `${profile.drawingNumber}_Rev${profile.revision}_${profile.partName.replace(/[^A-Za-z0-9]+/g, "_")}.pdf`;
    const drawing: UploadedDrawing = {
      id: newId(),
      fileName,
      fileType: "application/pdf",
      fileSizeBytes: 512_000,
      uploadedAt: new Date().toISOString(),
      previewUnsupported: true,
      sampleProfileId: profile.id,
      uploadedBy: DEFAULT_SETTINGS.preparedBy,
    };
    setRecords((prev) => [{ drawing, validation: { status: "pending" } }, ...prev]);
    setActiveId(drawing.id);
    setError(null);
    return drawing;
  }, []);

  const analyzeDrawing = useCallback<StoreValue["analyzeDrawing"]>(
    async (id) => {
      const record = records.find((r) => r.drawing.id === id);
      if (!record) return;
      setStage("analyzing");
      setError(null);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ drawingId: id, sampleProfileId: record.drawing.sampleProfileId }),
        });
        if (!res.ok) throw new Error(`Extraction failed (${res.status})`);
        const { analysis } = (await res.json()) as { analysis: DrawingAnalysis };
        patchRecord(id, (r) => ({
          ...r,
          analysis,
          casting: undefined,
          feasibility: undefined,
          defects: undefined,
          recommendation: undefined,
          inspection: undefined,
          report: undefined,
          validation: { status: "pending" },
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Extraction failed");
      } finally {
        setStage("idle");
      }
    },
    [records, patchRecord],
  );

  const updateField = useCallback<StoreValue["updateField"]>(
    (id, key, value) => {
      patchRecord(id, (r) =>
        r.analysis
          ? {
              ...r,
              analysis: {
                ...r.analysis,
                fields: r.analysis.fields.map((f) =>
                  f.key === key
                    ? { ...f, value, provenance: "user", confidence: undefined, basis: "Edited by user in this session." }
                    : f,
                ),
              },
            }
          : r,
      );
    },
    [patchRecord],
  );

  const resetField = useCallback<StoreValue["resetField"]>(
    (id, key) => {
      const record = records.find((r) => r.drawing.id === id);
      if (!record?.analysis) return;
      const fresh = runAnalysisStage(record.drawing.sampleProfileId, id).fields.find((f) => f.key === key);
      if (!fresh) return;
      patchRecord(id, (r) =>
        r.analysis
          ? { ...r, analysis: { ...r.analysis, fields: r.analysis.fields.map((f) => (f.key === key ? fresh : f)) } }
          : r,
      );
    },
    [records, patchRecord],
  );

  const generateCastingConcept = useCallback<StoreValue["generateCastingConcept"]>(
    async (id) => {
      const record = records.find((r) => r.drawing.id === id);
      if (!record?.analysis) {
        setError("Run the AI drawing analysis before generating a casting concept.");
        return;
      }
      setStage("generating-casting");
      setError(null);
      try {
        const res = await fetch("/api/casting", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sampleProfileId: record.drawing.sampleProfileId,
            analysis: record.analysis,
            settings,
          }),
        });
        if (!res.ok) throw new Error(`Casting generation failed (${res.status})`);
        const data = await res.json();
        patchRecord(id, (r) => ({
          ...r,
          casting: data.casting,
          feasibility: data.feasibility,
          defects: data.defects,
          recommendation: data.recommendation,
          inspection: undefined,
          report: undefined,
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Casting generation failed");
      } finally {
        setStage("idle");
      }
    },
    [records, settings, patchRecord],
  );

  const generateInspection = useCallback<StoreValue["generateInspection"]>(
    async (id) => {
      const record = records.find((r) => r.drawing.id === id);
      if (!record?.analysis || !record.casting || !record.recommendation) {
        setError("Generate the casting concept before generating the inspection standard.");
        return;
      }
      setStage("generating-inspection");
      setError(null);
      try {
        const res = await fetch("/api/inspection", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sampleProfileId: record.drawing.sampleProfileId,
            analysis: record.analysis,
            casting: record.casting,
            recommendation: record.recommendation,
          }),
        });
        if (!res.ok) throw new Error(`Inspection generation failed (${res.status})`);
        const { inspection } = await res.json();
        patchRecord(id, (r) => ({ ...r, inspection }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Inspection generation failed");
      } finally {
        setStage("idle");
      }
    },
    [records, patchRecord],
  );

  const generateReport = useCallback<StoreValue["generateReport"]>(
    (id, signoff) => {
      const record = records.find((r) => r.drawing.id === id);
      const partNumber = record?.analysis?.fields.find((f) => f.key === "partNumber")?.value ?? "UNKNOWN";
      const report: CastingReport = {
        id: `rp-${id}`,
        drawingId: id,
        reportNumber: `CAR-${partNumber}-${String(records.filter((r) => r.report).length + 1).padStart(2, "0")}`,
        generatedAt: new Date().toISOString(),
        signoff,
      };
      patchRecord(id, (r) => ({ ...r, report }));
      return report;
    },
    [records, patchRecord],
  );

  const setValidation = useCallback<StoreValue["setValidation"]>(
    (id, status, by, note) => {
      patchRecord(id, (r) => ({
        ...r,
        validation: { status, validatedBy: by, validatedAt: new Date().toISOString(), note },
      }));
    },
    [patchRecord],
  );

  const deleteRecord = useCallback<StoreValue["deleteRecord"]>((id) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.drawing.id !== id);
      setActiveId((current) => (current === id ? next[0]?.drawing.id ?? null : current));
      return next;
    });
  }, []);

  const updateSettings = useCallback<StoreValue["updateSettings"]>((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const seedDemoData = useCallback(() => {
    const seeded = buildSeedData();
    setRecords(seeded);
    setActiveId(seeded[0].drawing.id);
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
    setActiveId(null);
  }, []);

  const active = useMemo(
    () => records.find((r) => r.drawing.id === activeId) ?? null,
    [records, activeId],
  );

  const value = useMemo<StoreValue>(
    () => ({
      hydrated,
      records,
      activeId,
      active,
      settings,
      stage,
      error,
      setActiveId,
      addDrawing,
      addSampleDrawing,
      analyzeDrawing,
      updateField,
      resetField,
      generateCastingConcept,
      generateInspection,
      generateReport,
      setValidation,
      deleteRecord,
      updateSettings,
      seedDemoData,
      clearAll,
    }),
    [
      hydrated,
      records,
      activeId,
      active,
      settings,
      stage,
      error,
      addDrawing,
      addSampleDrawing,
      analyzeDrawing,
      updateField,
      resetField,
      generateCastingConcept,
      generateInspection,
      generateReport,
      setValidation,
      deleteRecord,
      updateSettings,
      seedDemoData,
      clearAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export { SAMPLE_PROFILES };
