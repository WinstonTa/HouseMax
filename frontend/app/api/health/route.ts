/** GET /api/health: liveness + which backend routes are live. */
import { NextResponse } from "next/server";
import { ENGINE_VERSION } from "@/lib/backend/schemas";

export function GET() {
  return NextResponse.json({
    ok: true,
    engine_version: ENGINE_VERSION,
    routes: {
      "POST /api/evaluate": "live",
      "GET /api/cities": "live",
      "GET /api/cities/:id": "live",
      "GET /api/regulations": "live",
      "GET /api/projects": "live",
      "GET /api/plans?cityId=": "live",
      "GET /api/cities/:id/conflict-radar?type=": "live",
      "POST /api/conflict-radar": "live",
    },
  });
}
