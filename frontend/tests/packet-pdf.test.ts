import { describe, expect, it } from "vitest";
import { POST as postPdf } from "@/app/api/packet/pdf/route";
import { POST as postJson } from "@/app/api/packet/route";
import { pdfSafe } from "@/lib/backend/pdf/PermitApplicationDoc";
import { DEMO_PROJECTS } from "@/lib/data";

const adu = DEMO_PROJECTS.find((p) => p.type === "ADU_DETACHED")!;
const req = (url: string, body: unknown) => new Request(url, { method: "POST", body: JSON.stringify(body) });

describe("pdfSafe", () => {
  it("replaces glyphs standard Helvetica cannot draw", () => {
    expect(pdfSafe("16 ft ≤ 18 ft → ok “q”")).toBe('16 ft <= 18 ft -> ok "q"');
  });
});

describe("POST /api/packet", () => {
  it("returns the packet model", async () => {
    const res = await postJson(req("http://t/api/packet", { project: { ...adu, transit: true } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.addendum.included).toBe(true);
  });

  it("400 on bad body", async () => {
    expect((await postJson(req("http://t/api/packet", { project: {} }))).status).toBe(400);
  });
});

describe("POST /api/packet/pdf", () => {
  it("renders a 4-page PDF", async () => {
    const res = await postPdf(req("http://t/api/packet/pdf", { project: { ...adu, transit: true }, docsChecked: {} }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    const bytes = new Uint8Array(await res.arrayBuffer());
    const text = new TextDecoder("latin1").decode(bytes);
    expect(text.startsWith("%PDF-")).toBe(true);
    // The By-Right demo fits on exactly four pages (one per module).
    expect((text.match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(4);
  }, 30_000);
});
