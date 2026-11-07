/** GET /api/sample-project: a valid EvaluateRequest body to try POST /api/evaluate with (MOCK, made-up). */
import { NextResponse } from "next/server";
import { SAMPLE_PROJECT } from "@/lib/mocks/sample-project";

export function GET() {
  return NextResponse.json({ project: SAMPLE_PROJECT });
}
