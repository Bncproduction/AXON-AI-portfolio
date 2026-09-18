import { NextResponse } from "next/server";
import { runCastingStage } from "@/lib/pipeline";
import { DEFAULT_SETTINGS } from "@/lib/defaults";

/** Casting concept + feasibility + defect prediction + process recommendation. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.analysis || !body?.sampleProfileId) {
    return NextResponse.json({ error: "analysis and sampleProfileId are required" }, { status: 400 });
  }

  await new Promise((r) => setTimeout(r, 1100));

  const result = runCastingStage(body.sampleProfileId, body.analysis, body.settings ?? DEFAULT_SETTINGS);
  return NextResponse.json(result);
}
