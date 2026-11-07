/** GET /api/health: liveness + which parts of the backend are real vs mocked. */
import { NextResponse } from "next/server";
import { ENGINE_VERSION } from "@/lib/schemas";

export function GET() {
  return NextResponse.json({
    ok: true,
    engine_version: ENGINE_VERSION,
    routes: {
      "POST /api/evaluate": "mock",
      "GET /api/sample-project": "mock",
    },
  });
}
