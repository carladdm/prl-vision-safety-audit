// Official-style PRL inspection record ("Acta") exported as PDF with jsPDF (browser only, loaded on demand).
import {
  riskLabel,
  riskLevel,
  sortBySeverity,
  type Informe,
  type InspeccionMeta,
  type RiskLevel,
} from "@/lib/report";

const NAVY: [number, number, number] = [15, 23, 42];
const AMBER: [number, number, number] = [245, 158, 11];
const GREY: [number, number, number] = [100, 116, 139];
const riskRgb: Record<RiskLevel, [number, number, number]> = {
  low: [5, 150, 105],
  medium: [217, 119, 6],
  high: [220, 38, 38],
};
const riskSoft: Record<RiskLevel, [number, number, number]> = {
  low: [220, 252, 231],
  medium: [254, 243, 199],
  high: [254, 226, 226],
};

export async function downloadActaPdf(opts: {
  informe: Informe;
  meta: InspeccionMeta;
  tecnico: string;
  foto: string | null;
  isSample?: boolean;
}) {
  const { jsPDF } = await import("jspdf");
  const { informe, meta, tecnico, foto, isSample = false } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 14;
  let y = 0;

  doc.setProperties({
    title: isSample ? "Acta de inspección (datos de ejemplo)" : "Acta de inspección de seguridad",
    subject: `${meta.area || "Inspección de riesgos laborales"} · ${meta.fecha.toLocaleDateString("es-ES")}`,
    author: tecnico || "PRL Vision Audit",
    creator: "PRL Vision Audit",
    keywords: "PRL, evaluación de riesgos, INSST, seguridad en el trabajo",
  });

  const ensure = (h: number) => {
    if (y + h > H - 18) {
      doc.addPage();
      y = M;
    }
  };

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(...AMBER);
  doc.rect(0, 30, W, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ACTA DE INSPECCIÓN DE SEGURIDAD — PRL", M, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Evaluación de riesgos laborales · PRL Vision Audit", M, 20);
  if (isSample) {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("DATOS DE EJEMPLO · NO VÁLIDO COMO ACTA OFICIAL", M, 26);
  }
  doc.setTextColor(...AMBER);
  doc.text(
    meta.fecha.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" }),
    W - M,
    13,
    {
      align: "right",
    },
  );
  y = 40;

  // Data block
  doc.setTextColor(...NAVY);
  const field = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text(label.toUpperCase(), M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(value || "—", W - M * 2 - 52);
    doc.text(lines, M + 52, y);
    y += Math.max(6, lines.length * 4.6 + 1.5);
  };
  field(
    "Fecha y hora",
    meta.fecha.toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" }),
  );
  field("Área evaluada", meta.area);
  field("Técnico inspector", tecnico);
  if (meta.observaciones) field("Observaciones", meta.observaciones);
  y += 2;

  const section = (title: string) => {
    ensure(14);
    doc.setFillColor(...AMBER);
    doc.rect(M, y - 4, 2, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(title.toUpperCase(), M + 5, y + 0.5);
    y += 7;
  };

  // Photo evidence
  if (foto) {
    section("Evidencia fotográfica");
    try {
      const props = doc.getImageProperties(foto);
      // Detect the real format instead of assuming JPEG: PNG/WebP would corrupt the PDF.
      const rawType = (props as { fileType?: string }).fileType?.toUpperCase();
      const format = rawType === "PNG" || rawType === "WEBP" ? rawType : "JPEG";
      const maxW = W - M * 2;
      const maxH = 85;
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      const w = props.width * ratio;
      const h = props.height * ratio;
      ensure(h + 4);
      doc.addImage(foto, format, M + (maxW - w) / 2, y, w, h);
      y += h + 6;
    } catch {
      ensure(8);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...GREY);
      doc.text("No se pudo incrustar la imagen de la evidencia.", M, y);
      y += 8;
    }
  }

  // Summary
  section("Resumen ejecutivo");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  for (const line of doc.splitTextToSize(informe.resumen_general || "—", W - M * 2)) {
    ensure(5);
    doc.text(line, M, y);
    y += 4.6;
  }
  y += 4;

  // Findings table (most severe first, matching the on-screen report)
  const hallazgos = sortBySeverity(informe.hallazgos);
  section(`Hallazgos detectados (${hallazgos.length})`);
  const cols = [
    { k: "n", t: "Nº", w: 8 },
    { k: "titulo", t: "Hallazgo / Tipo", w: 42 },
    { k: "nivel", t: "Riesgo", w: 22 },
    { k: "normativa", t: "Normativa", w: 34 },
    { k: "medida", t: "Medida correctiva", w: 50 },
    { k: "plazo", t: "Plazo / Resp.", w: 26 },
  ];
  const MAX_LINES_PER_CELL = 12;
  const drawHead = () => {
    doc.setFillColor(...NAVY);
    doc.rect(M, y, W - M * 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    let x = M;
    for (const c of cols) {
      doc.text(c.t, x + 1.5, y + 4.7);
      x += c.w;
    }
    y += 7;
  };
  drawHead();
  doc.setFontSize(8);
  hallazgos.forEach((h, i) => {
    const lvl = riskLevel(h.nivel_riesgo);
    const cells: Record<string, string> = {
      n: String(i + 1),
      titulo: `${h.titulo}${h.tipo ? `\n(${h.tipo})` : ""}`,
      nivel: h.nivel_riesgo || riskLabel[lvl],
      normativa: h.normativa || "—",
      medida: h.medida_correctiva || "—",
      plazo: `${h.plazo || "—"}\n${h.responsable || ""}`,
    };
    const wrapped = cols.map((c) => {
      doc.setFont("helvetica", c.k === "titulo" || c.k === "nivel" ? "bold" : "normal");
      const lines = doc.splitTextToSize(cells[c.k] ?? "", c.w - 3) as string[];
      // Cap very long cells so a single finding cannot overflow past the page.
      if (lines.length <= MAX_LINES_PER_CELL) return lines;
      const kept = lines.slice(0, MAX_LINES_PER_CELL);
      const last = kept.length - 1;
      kept[last] = `${kept[last] ?? ""}…`;
      return kept;
    });
    const rowH = Math.max(...wrapped.map((l) => l.length)) * 3.6 + 4;
    if (y + rowH > H - 18) {
      doc.addPage();
      y = M;
      drawHead();
    }
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(M, y, W - M * 2, rowH, "F");
    }
    let x = M;
    cols.forEach((c, ci) => {
      if (c.k === "nivel") {
        doc.setFillColor(...riskSoft[lvl]);
        doc.rect(x + 0.5, y + 0.5, c.w - 1, rowH - 1, "F");
        doc.setTextColor(...riskRgb[lvl]);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(...NAVY);
        doc.setFont("helvetica", c.k === "titulo" ? "bold" : "normal");
      }
      doc.text(wrapped[ci] ?? [], x + 1.5, y + 4);
      x += c.w;
    });
    doc.setFillColor(...riskRgb[lvl]);
    doc.rect(M, y, 1, rowH, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y + rowH, W - M, y + rowH);
    y += rowH;
  });
  y += 10;

  // Signatures
  if (y + 40 > H - 18) {
    doc.addPage();
    y = M + 10;
  }
  const bw = (W - M * 2 - 10) / 2;
  const sig = (x: number, title: string, name: string) => {
    doc.setDrawColor(203, 213, 225);
    doc.rect(x, y, bw, 34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(title.toUpperCase(), x + 3, y + 5);
    doc.setDrawColor(...NAVY);
    doc.line(x + 3, y + 25, x + bw - 3, y + 25);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...NAVY);
    doc.text(name || "Nombre y firma", x + 3, y + 30);
  };
  sig(M, "Firma del Técnico PRL", tecnico);
  sig(M + bw + 10, "Firma del Responsable de Obra / Planta", "");

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.text(
      "Herramienta de apoyo técnico con IA · Validación final sujeta a criterio de Técnico Superior en PRL",
      M,
      H - 8,
    );
    doc.text(`Página ${p} de ${pages}`, W - M, H - 8, { align: "right" });
  }

  // Watermark: prevents a sample report from being signed as an official record.
  if (isSample) {
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setTextColor(248, 113, 113);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(40);
      doc.text("DATOS DE EJEMPLO", W / 2, H / 2 - 6, { align: "center", angle: 40 });
      doc.setFontSize(13);
      doc.text("NO VÁLIDO COMO ACTA OFICIAL", W / 2 + 3, H / 2 + 22, {
        align: "center",
        angle: 40,
      });
    }
  }

  const d = meta.fecha;
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const area = (meta.area || "inspeccion").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40);
  doc.save(`Acta-PRL-${area}-${stamp}.pdf`);
}
