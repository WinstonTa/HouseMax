/** GET /api/regulations: the state-law rule catalog with citations and check dates. */
import { NextResponse } from "next/server";
import { REGULATIONS } from "@/lib/data";

export function GET() {
  return NextResponse.json({
    regulations: REGULATIONS,
    note: "Each rule carries its own status. VERIFIED = read on leginfo by the team (not a licensed professional). UNVERIFIED rules cannot produce a By-Right verdict.",
  });
}
