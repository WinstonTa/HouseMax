/** GET /api/cities/:id: one city, or 404. Unlike lib/data getCity(), never falls back to another city. */
import { NextResponse, type NextRequest } from "next/server";
import { CITIES } from "@/lib/data";
import { notFound } from "@/lib/backend/http";

export function generateStaticParams() {
  return CITIES.map((c) => ({ id: c.id }));
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/cities/[id]">) {
  const { id } = await ctx.params;
  const city = CITIES.find((c) => c.id === id);
  if (!city) return notFound(`No city with id "${id}".`);
  return NextResponse.json({ city });
}
