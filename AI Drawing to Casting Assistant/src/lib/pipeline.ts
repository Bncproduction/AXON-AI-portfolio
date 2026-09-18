/**
 * Stage orchestration shared by the API routes and the demo seeder.
 * Keeping it here means the browser and the server run identical logic.
 */

import {
  analyseFeasibility,
  analyseProfile,
  generateCasting,
  generateInspectionStandard,
  predictDefects,
  recommendProcess,
} from "./engine";
import { profileById } from "./samples";
import type {
  AppSettings,
  CastingConcept,
  DefectRisk,
  DrawingAnalysis,
  FeasibilityIssue,
  InspectionStandard,
  ProcessRecommendation,
} from "./types";

export function runAnalysisStage(sampleProfileId: string, drawingId: string): DrawingAnalysis {
  return analyseProfile(profileById(sampleProfileId), drawingId);
}

export interface CastingStageResult {
  casting: CastingConcept;
  feasibility: FeasibilityIssue[];
  defects: DefectRisk[];
  recommendation: ProcessRecommendation;
}

export function runCastingStage(
  sampleProfileId: string,
  analysis: DrawingAnalysis,
  settings: AppSettings,
): CastingStageResult {
  const profile = profileById(sampleProfileId);
  const casting = generateCasting(profile, analysis, settings);
  const feasibility = analyseFeasibility(profile, analysis, casting);
  const defects = predictDefects(profile, casting);
  const recommendation = recommendProcess(profile, analysis, casting);
  return { casting, feasibility, defects, recommendation };
}

export function runInspectionStage(
  sampleProfileId: string,
  analysis: DrawingAnalysis,
  casting: CastingConcept,
  recommendation: ProcessRecommendation,
): InspectionStandard {
  return generateInspectionStandard(profileById(sampleProfileId), analysis, casting, recommendation);
}
