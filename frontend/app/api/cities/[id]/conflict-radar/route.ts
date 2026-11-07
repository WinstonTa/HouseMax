/**
 * GET /api/cities/:id/conflict-radar?type=adu|missing_middle
 * 200: ConflictAudit for the city's registered checklist
 * 400: bad type · 404: unknown city or no checklist of that type
 */
import { NextResponse, type NextRequest } from "next/server";
import { CITIES } from "@/lib/data";
import { auditChecklist } from "@/lib/backend/conflict-radar";
import { badRequest, notFound } from "@/lib/backend/http";

const TYPES = { adu: "ADU_DETACHED", missing_middle: "MISSING_MIDDLE" } as const;

export async function GET(req: NextRequest, ctx: RouteContext<"/api/cities/[id]/conflict-radar">) {
  const { id } = await ctx.params;
  const type = req.nextUrl.searchParams.get("type") ?? "adu";
  if (!(type in TYPES)) return badRequest(`type must be one of: ${Object.keys(TYPES).join(", ")}`);
  const key = type as keyof typeof TYPES;

  const city = CITIES.find((c) => c.id === id);
  if (!city) return notFound(`No city with id "${id}".`);
  const checklist = city.checklists[key];
  if (!checklist) return notFound(`${city.name} has no ${type} checklist registered.`);

  return NextResponse.json(auditChecklist(city, checklist, TYPES[key]));
}
