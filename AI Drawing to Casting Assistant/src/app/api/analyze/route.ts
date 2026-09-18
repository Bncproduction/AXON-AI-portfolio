import { NextResponse } from "next/server";
import { runAnalysisStage } from "@/lib/pipeline";

/**
 * Drawing extraction endpoint.
 *
 * The demo implementation runs the built-in rule engine. To wire a real
 * vision model, replace the body of this handler with a call to the provider
 * (the drawing bytes are available to the client and can be posted here) and
 * return the same `DrawingAnalysis` shape — no client changes required.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.drawingId || !body?.sampleProfileId) {
    return NextResponse.json({ error: "drawingId and sampleProfileId are required" }, { status: 400 });
  }

  // Simulated model latency so the loading states are exercised.
  await new Promise((r) => setTimeout(r, 900));

  const analysis = runAnalysisStage(body.sampleProfileId, body.drawingId);
  return NextResponse.json({ analysis });
}
