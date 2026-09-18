import type { AppSettings } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  preparedBy: "A. Rahman, Casting Engineer",
  organisation: "Precision Castings & Machining Pvt. Ltd.",
  supplier: "Vulcan Foundry Works, Unit 3",
  customer: "Meridian Fluid Systems",
  qaApprover: "S. Iyer, QA Manager",
  engineeringApprover: "K. Vasudevan, Head of Engineering",
  defaultUnits: "mm",
  defaultAllowance: { general: 2.5, criticalFaces: 3, bores: 2 },
  defaultDraftAngleDeg: 1.5,
  aiProvider: "built-in-demo",
  aiModel: "claude-opus-5",
  requireEngineeringValidation: true,
};

export const STORAGE_KEY = "dca.workflow.v1";
export const SETTINGS_KEY = "dca.settings.v1";
