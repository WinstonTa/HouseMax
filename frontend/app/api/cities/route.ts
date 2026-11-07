/** GET /api/cities: every city record (meta, HCD letters, checklists). Static, prerendered. */
import { NextResponse } from "next/server";
import { CITIES } from "@/lib/data";
import { DISCLAIMER } from "@/lib/backend/schemas";

export function GET() {
  return NextResponse.json({ cities: CITIES, disclaimer: DISCLAIMER });
}
