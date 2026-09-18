import { NextResponse } from "next/server";
import { runInspectionStage } from "@/lib/pipeline";

/** Casting inspection standard generation. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.analysis || !body?.casting || !body?.recommendation || !body?.sampleProfileId) {
    return NextResponse.json(
      { error: "sampleProfileId, analysis, casting and recommendation are required" },
      { status: 400 },
    );
  }

  await new Promise((r) => setTimeout(r, 800));

  const inspection = runInspectionStage(body.sampleProfileId, body.analysis, body.casting, body.recommendation);
  return NextResponse.json({ inspection });
}
