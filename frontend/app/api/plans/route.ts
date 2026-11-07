/** GET /api/plans[?cityId=]: pre-approved standard plan catalog. */
import { NextResponse, type NextRequest } from "next/server";
import { PLANS } from "@/lib/data";

export function GET(req: NextRequest) {
  const cityId = req.nextUrl.searchParams.get("cityId");
  const plans = cityId ? PLANS.filter((p) => p.city_id === cityId) : PLANS;
  return NextResponse.json({ plans });
}
