/**
 * POST /api/packet
 * Body: { project, docsChecked?, asOf? }
 * 200:  PacketModel (JSON data behind the 4-page draft PDF)
 */
import { NextResponse } from "next/server";
import { AS_OF_DATE } from "@/lib/benchmarks";
import { buildPacket } from "@/lib/backend/packet";
import { PacketRequest } from "@/lib/backend/packet-request";
import { badRequest, readJson } from "@/lib/backend/http";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === undefined) return badRequest("Request body must be JSON.");
  const parsed = PacketRequest.safeParse(body);
  if (!parsed.success) return badRequest("Invalid packet request.", parsed.error);
  const { project, docsChecked, asOf } = parsed.data;
  return NextResponse.json(buildPacket(project, docsChecked, asOf ?? AS_OF_DATE));
}
