/** GET /api/regulations: the state-law rule catalog with citations and check dates. */
import { NextResponse } from "next/server";
import { REGULATIONS } from "@/lib/data";

export function GET() {
  return NextResponse.json({
    regulations: REGULATIONS,
    note: "Citations not yet re-verified against leginfo by the backend team; treat as UNVERIFIED.",
  });
}
