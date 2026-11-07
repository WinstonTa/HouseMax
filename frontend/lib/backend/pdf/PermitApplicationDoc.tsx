/**
 * PermitApplicationDoc: the 4-page draft packet (spec §8), rendered server-side with
 * @react-pdf/renderer from a PacketModel (lib/backend/packet.ts).
 *
 *   1. Cover sheet  2. Specification matrix  3. Applicant's statement (addendum)  4. Pre-flight
 *
 * Every page carries the DRAFT watermark and the not-filed footer.
 */
import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { PacketModel } from "../packet";

/** Standard PDF Helvetica is WinAnsi-only; replace glyphs it cannot draw. */
export function pdfSafe(s: string): string {
  return s
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/→/g, "->")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}
const t = (s: string | number | null | undefined) => pdfSafe(String(s ?? ""));

const s = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 54, paddingHorizontal: 44, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  watermark: { position: "absolute", top: 370, left: -40, right: -40, textAlign: "center", fontSize: 26, color: "#d33", opacity: 0.12, transform: "rotate(-30deg)", fontFamily: "Helvetica-Bold" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1.5, borderBottomColor: "#111", paddingBottom: 6, marginBottom: 12 },
  pageNo: { fontSize: 8, color: "#666" },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  h2: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 5 },
  muted: { color: "#666" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingVertical: 3 },
  k: { width: "38%", color: "#555" },
  v: { width: "62%" },
  box: { borderWidth: 1.5, borderColor: "#111", padding: 10, marginTop: 12 },
  th: { fontFamily: "Helvetica-Bold" },
  cell1: { width: "18%", paddingRight: 4 },
  cell2: { width: "44%", paddingRight: 4 },
  cell3: { width: "22%", paddingRight: 4, fontSize: 7.5 },
  cell4: { width: "16%", fontFamily: "Helvetica-Bold" },
  para: { marginBottom: 5 },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 7, color: "#666", borderTopWidth: 0.5, borderTopColor: "#ccc", paddingTop: 5 },
  check: { width: 9, height: 9, borderWidth: 1, borderColor: "#111", marginRight: 6, textAlign: "center", fontSize: 7 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: "#111", height: 26 },
});

function Sheet({ n, title, m, children }: { n: number; title: string; m: PacketModel; children: ReactNode }) {
  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.watermark} fixed hyphenationCallback={(w: string) => [w]}>
        {t(m.meta.watermark)}
      </Text>
      <View style={s.header} fixed>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>
          {n}. {t(title)}
        </Text>
        <Text style={s.pageNo} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
      {children}
      <Text style={s.footer} fixed>
        {t(`${m.meta.footer} · Generated ${m.meta.generated_on} · engine ${m.meta.engine_version}`)}
      </Text>
    </Page>
  );
}

function KVs({ rows }: { rows: { k: string; v: string }[] }) {
  return (
    <View>
      {rows.map((r) => (
        <View key={r.k} style={s.row}>
          <Text style={s.k}>{t(r.k)}</Text>
          <Text style={s.v}>{t(r.v)}</Text>
        </View>
      ))}
    </View>
  );
}

export function PermitApplicationDoc({ m }: { m: PacketModel }) {
  return (
    <Document title={t(`Draft packet - ${m.cover.title}`)} author="HouseMax prototype" subject="Draft application packet for applicant review">
      <Sheet n={1} title="Master Housing Permit Submittal Cover Sheet" m={m}>
        <Text style={s.muted}>{t(m.cover.jurisdiction)} · Planning & Building</Text>
        <Text style={s.h1}>{t(m.cover.title)}</Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ width: "50%" }}>
            <Text style={s.h2}>Parcel</Text>
            <KVs rows={m.cover.parcel} />
          </View>
          <View style={{ width: "50%" }}>
            <Text style={s.h2}>Design team</Text>
            <KVs rows={m.cover.team} />
          </View>
        </View>
        <View style={s.box}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>Pathway determination: {t(m.cover.verdict_label.toUpperCase())}</Text>
          <Text style={[s.muted, { marginTop: 3 }]}>Evidence confidence: {t(m.cover.confidence)} · Evaluated {t(m.meta.generated_on)}</Text>
          <Text style={{ marginTop: 5 }}>{t(m.cover.reason)}</Text>
        </View>
        <Text style={[s.muted, { marginTop: 14 }]}>{t(m.meta.disclaimer)}</Text>
      </Sheet>

      <Sheet n={2} title="Project Tabular Specification Matrix" m={m}>
        <View style={[s.row, { borderBottomWidth: 1.5, borderBottomColor: "#111" }]}>
          <Text style={[s.cell1, s.th]}>Standard</Text>
          <Text style={[s.cell2, s.th]}>Finding</Text>
          <Text style={[s.cell3, s.th]}>Statute</Text>
          <Text style={[s.cell4, s.th]}>Result</Text>
        </View>
        {m.specs.rows.map((r) => (
          <View key={r.label} style={s.row} wrap={false}>
            <Text style={s.cell1}>{t(r.label)}</Text>
            <Text style={s.cell2}>{t(r.detail)}</Text>
            <Text style={s.cell3}>
              {t(r.statute)}
              {r.rule_status !== "VERIFIED" ? " (rule not verified)" : ""}
            </Text>
            <Text style={s.cell4}>{t(r.result)}</Text>
          </View>
        ))}
        <Text style={s.h2}>Proposed design</Text>
        <KVs rows={m.specs.summary} />
      </Sheet>

      <Sheet n={3} title="Statutory Basis & Applicant's Statement" m={m}>
        {m.addendum.included ? (
          <View style={s.box}>
            <Text style={{ textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 8 }}>{t(m.addendum.heading)}</Text>
            <Text style={s.para}>TO: {t(m.addendum.to)}</Text>
            <Text style={s.para}>JURISDICTION: {t(m.addendum.jurisdiction)}</Text>
            <Text style={s.para}>PROJECT: {t(m.addendum.project)}</Text>
            {m.addendum.body.map((p, i) => (
              <Text key={i} style={s.para}>
                {t(p)}
              </Text>
            ))}
          </View>
        ) : (
          <View style={s.box}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{"Applicant's statement not included"}</Text>
            <Text style={[s.para, { marginTop: 4 }]}>{t(m.addendum.omitted_reason)}</Text>
          </View>
        )}
        <Text style={s.h2}>Rules relied on</Text>
        {m.addendum.statutes.length === 0 && <Text style={s.muted}>None.</Text>}
        {m.addendum.statutes.map((st) => (
          <View key={st.cite} style={s.row} wrap={false}>
            <View style={{ width: "100%" }}>
              <Text>
                {t(st.cite)} - {t(st.title)}
              </Text>
              <Text style={s.muted}>
                {st.status === "VERIFIED" ? `Read on leginfo ${t(st.checked)}` : "UNVERIFIED"} ·{" "}
                <Link src={st.url} style={{ color: "#1a56b8" }}>
                  {t(new URL(st.url).hostname)}
                </Link>
              </Text>
            </View>
          </View>
        ))}
        <Text style={s.h2}>Local requirements flagged for review</Text>
        <Text style={[s.muted, { marginBottom: 4 }]}>{t(m.addendum.flagged_note)}</Text>
        {m.addendum.flagged_local_requirements.map((f) => (
          <View key={f.item_id} style={s.row} wrap={false}>
            <Text style={{ width: "100%" }}>
              {t(f.item_id)} - {t(f.text)} ({t(f.statute)}) · {t(f.note)}
            </Text>
          </View>
        ))}
      </Sheet>

      <Sheet n={4} title="Pre-Flight Submittal Completeness Attestation" m={m}>
        <Text>Checklist: {t(m.preflight.checklist_id ?? "none on file")}</Text>
        <Text style={[s.muted, { marginBottom: 8 }]}>{t(m.preflight.checklist_note)}</Text>
        {m.preflight.docs.map((d) => (
          <View key={d.name} style={[s.row, { alignItems: "center" }]}>
            <Text style={s.check}>{d.included ? "X" : ""}</Text>
            <Text style={{ flexGrow: 1 }}>{t(d.name)}</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.included ? "INCLUDED" : "MISSING"}</Text>
          </View>
        ))}
        <Text style={{ marginTop: 6 }}>{m.preflight.complete ? "All listed documents marked included." : `${m.preflight.missing} document(s) still missing.`}</Text>
        <View style={{ flexDirection: "row", gap: 30, marginTop: 34 }}>
          <View style={{ width: "50%" }}>
            <View style={s.sigLine} />
            <Text style={s.muted}>Applicant signature / date</Text>
          </View>
          <View style={{ width: "50%" }}>
            <View style={s.sigLine} />
            <Text style={s.muted}>Permit technician sign-off · {t(m.preflight.signoff)}</Text>
          </View>
        </View>
        <Text style={[s.muted, { marginTop: 22 }]}>
          Verdicts are &quot;likely&quot; determinations only. Final determination rests with city staff. Not legal advice.
        </Text>
      </Sheet>
    </Document>
  );
}

export function renderPacketPdf(m: PacketModel): Promise<Buffer> {
  return renderToBuffer(<PermitApplicationDoc m={m} />);
}
