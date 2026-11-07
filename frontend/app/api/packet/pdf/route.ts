/**
 * POST /api/packet/pdf
 * Body: { project, docsChecked?, asOf? }
 * 200:  application/pdf, the 4-page DRAFT packet rendered with @react-pdf/renderer
 *
 * Draft for applicant review only. Nothing is filed or sent anywhere.
 */
import { AS_OF_DATE } from "@/lib/benchmarks";
import { buildPacket } from "@/lib/backend/packet";
import { PacketRequest } from "@/lib/backend/packet-request";
import { renderPacketPdf } from "@/lib/backend/pdf/PermitApplicationDoc";
import { badRequest, internalError, readJson } from "@/lib/backend/http";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === undefined) return badRequest("Request body must be JSON.");
  const parsed = PacketRequest.safeParse(body);
  if (!parsed.success) return badRequest("Invalid packet request.", parsed.error);
  const { project, docsChecked, asOf } = parsed.data;

  try {
    const pdf = await renderPacketPdf(buildPacket(project, docsChecked, asOf ?? AS_OF_DATE));
    const name = `housemax-draft-${project.id.replace(/[^a-z0-9_-]/gi, "")}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${name}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF render failed", err);
    return internalError("PDF render failed.");
  }
}
