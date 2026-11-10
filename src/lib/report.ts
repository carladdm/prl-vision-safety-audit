// Report contract shared with the n8n webhook, plus helpers to normalise, rank and export it.

export type RiskLevel = "low" | "medium" | "high";

export interface Hallazgo {
  titulo: string;
  tipo: string;
  nivel_riesgo: string;
  normativa: string;
  medida_correctiva: string;
  plazo: string;
  responsable: string;
}

export interface Informe {
  resumen_general: string;
  hallazgos: Hallazgo[];
}

export interface InspeccionMeta {
  area: string;
  observaciones: string;
  fecha: Date;
}

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Maps the free-text risk level to the three-colour scale. */
export function riskLevel(nivel: string | undefined | null): RiskLevel {
  const n = strip(nivel ?? "");
  if (/(importante|grave|intolerable|alto|critico|severo)/.test(n)) return "high";
  if (/(moderado|medio|tolerable)/.test(n)) return "medium";
  return "low";
}

export const riskLabel: Record<RiskLevel, string> = {
  low: "Trivial / Leve",
  medium: "Moderado",
  high: "Importante / Grave",
};

/** Sort findings most severe first. */
export function sortBySeverity(hallazgos: Hallazgo[]): Hallazgo[] {
  const rank: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
  return [...hallazgos].sort((a, b) => rank[riskLevel(a.nivel_riesgo)] - rank[riskLevel(b.nivel_riesgo)]);
}

export function countByRisk(hallazgos: Hallazgo[]): Record<RiskLevel, number> {
  const out: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
  for (const h of hallazgos) out[riskLevel(h.nivel_riesgo)]++;
  return out;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v));

function tryParseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

/**
 * Accepts the webhook body in the shapes n8n commonly returns
 * (plain object, array with one item, or wrapped in `output`/`json`/`data`, possibly as a JSON string)
 * and returns a validated report, or throws a readable error.
 */
export function normalizeInforme(raw: unknown, depth = 0): Informe {
  if (depth > 4) throw new Error("La respuesta no tiene el formato esperado.");
  if (typeof raw === "string") {
    let parsed: unknown;
    try {
      parsed = tryParseJson(raw);
    } catch {
      throw new Error("La respuesta del webhook no es un JSON válido.");
    }
    return normalizeInforme(parsed, depth + 1);
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) throw new Error("El webhook devolvió una lista vacía.");
    return normalizeInforme(raw[0], depth + 1);
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if ("hallazgos" in obj || "resumen_general" in obj) {
      const rawList = obj["hallazgos"];
      const list: unknown[] = Array.isArray(rawList) ? rawList : [];
      return {
        resumen_general: str(obj["resumen_general"]),
        hallazgos: list
          .filter((h): h is Record<string, unknown> => !!h && typeof h === "object")
          .map((h) => ({
            titulo: str(h["titulo"]) || "Hallazgo sin título",
            tipo: str(h["tipo"]),
            nivel_riesgo: str(h["nivel_riesgo"]),
            normativa: str(h["normativa"]),
            medida_correctiva: str(h["medida_correctiva"]),
            plazo: str(h["plazo"]),
            responsable: str(h["responsable"]),
          })),
      };
    }
    for (const key of ["output", "json", "data", "body", "result", "text"]) {
      if (key in obj) return normalizeInforme(obj[key], depth + 1);
    }
  }
  throw new Error(
    "La respuesta no contiene 'resumen_general' ni 'hallazgos'. Revisa el nodo 'Respond to Webhook' en n8n.",
  );
}

const fmtDate = (d: Date) =>
  d.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });

export function informeToText(inf: Informe, meta: InspeccionMeta): string {
  const lines: string[] = [];
  lines.push("INFORME TÉCNICO DE EVALUACIÓN DE RIESGOS — PRL Vision Audit");
  lines.push(`Fecha: ${fmtDate(meta.fecha)}`);
  if (meta.area) lines.push(`Puesto de trabajo / Área: ${meta.area}`);
  if (meta.observaciones) lines.push(`Observaciones del técnico: ${meta.observaciones}`);
  lines.push("");
  lines.push("RESUMEN EJECUTIVO");
  lines.push(inf.resumen_general || "—");
  lines.push("");
  lines.push(`HALLAZGOS (${inf.hallazgos.length})`);
  sortBySeverity(inf.hallazgos).forEach((h, i) => {
    lines.push("");
    lines.push(`${i + 1}. ${h.titulo}`);
    lines.push(`   Nivel de riesgo: ${h.nivel_riesgo || riskLabel[riskLevel(h.nivel_riesgo)]}`);
    lines.push(`   Tipo: ${h.tipo || "—"}`);
    lines.push(`   Normativa aplicable: ${h.normativa || "—"}`);
    lines.push(`   Medida correctiva: ${h.medida_correctiva || "—"}`);
    lines.push(`   Plazo: ${h.plazo || "—"}`);
    lines.push(`   Responsable: ${h.responsable || "—"}`);
  });
  return lines.join("\n");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const riskHex: Record<RiskLevel, string> = { low: "#059669", medium: "#D97706", high: "#DC2626" };

/** HTML version for pasting into Word / email clients with formatting preserved. */
export function informeToHtml(inf: Informe, meta: InspeccionMeta): string {
  const rows = sortBySeverity(inf.hallazgos)
    .map((h, i) => {
      const lvl = riskLevel(h.nivel_riesgo);
      return `
<h3 style="margin:16px 0 4px;color:#0F172A;">${i + 1}. ${esc(h.titulo)}
 <span style="color:${riskHex[lvl]};font-size:12px;">[${esc(h.nivel_riesgo || riskLabel[lvl])}]</span></h3>
<table style="border-collapse:collapse;width:100%;font-size:13px;">
<tr><td style="padding:3px 8px;width:170px;color:#475569;">Tipo</td><td style="padding:3px 8px;">${esc(h.tipo || "—")}</td></tr>
<tr><td style="padding:3px 8px;color:#475569;">Normativa aplicable</td><td style="padding:3px 8px;"><b>${esc(h.normativa || "—")}</b></td></tr>
<tr><td style="padding:3px 8px;color:#475569;">Medida correctiva</td><td style="padding:3px 8px;">${esc(h.medida_correctiva || "—")}</td></tr>
<tr><td style="padding:3px 8px;color:#475569;">Plazo</td><td style="padding:3px 8px;">${esc(h.plazo || "—")}</td></tr>
<tr><td style="padding:3px 8px;color:#475569;">Responsable</td><td style="padding:3px 8px;">${esc(h.responsable || "—")}</td></tr>
</table>`;
    })
    .join("");
  return `<div style="font-family:Calibri,Arial,sans-serif;color:#0F172A;">
<h2 style="margin:0 0 4px;">Informe técnico de evaluación de riesgos</h2>
<p style="margin:0;color:#475569;font-size:13px;">PRL Vision Audit · ${esc(fmtDate(meta.fecha))}</p>
${meta.area ? `<p style="margin:8px 0 0;"><b>Puesto de trabajo / Área:</b> ${esc(meta.area)}</p>` : ""}
${meta.observaciones ? `<p style="margin:4px 0 0;"><b>Observaciones del técnico:</b> ${esc(meta.observaciones)}</p>` : ""}
<h3 style="margin:16px 0 4px;">Resumen ejecutivo</h3>
<p style="margin:0;">${esc(inf.resumen_general || "—")}</p>
<h3 style="margin:16px 0 0;">Hallazgos (${inf.hallazgos.length})</h3>
${rows}
</div>`;
}

export const informeEjemplo: Informe = {
  resumen_general:
    "Se ha inspeccionado el taller de soldadura y corte. Se identifican 4 hallazgos, 2 de ellos de nivel Importante relacionados con la ausencia de protección ocular/facial durante el corte de metal y la falta de protección en la amoladora. Se recomienda paralizar la tarea de corte hasta implantar las medidas correctoras y reforzar la formación del personal en el uso de EPI.",
  hallazgos: [
    {
      titulo: "Operario cortando metal sin pantalla facial ni gafas de protección",
      tipo: "Acto Inseguro",
      nivel_riesgo: "Importante",
      normativa:
        "RD 773/1997, art. 3 y Anexo III (uso de EPI de protección ocular y facial); Ley 31/1995, art. 29",
      medida_correctiva:
        "Paralizar la tarea y dotar al operario de pantalla facial EN 166 sobre gafas de montura integral. Supervisión del mando intermedio y registro de entrega de EPI.",
      plazo: "Inmediato",
      responsable: "Encargado de taller / Mando intermedio",
    },
    {
      titulo: "Amoladora angular sin carcasa protectora del disco",
      tipo: "Condición Insegura",
      nivel_riesgo: "Grave",
      normativa: "RD 1215/1997, Anexo I, apdo. 1.8 (protección de elementos móviles)",
      medida_correctiva:
        "Retirar el equipo de servicio y reinstalar la carcasa original del fabricante. Revisión de todos los equipos portátiles del taller.",
      plazo: "24 horas",
      responsable: "Responsable de mantenimiento",
    },
    {
      titulo: "Cables eléctricos de prolongación cruzando zona de paso",
      tipo: "Condición Insegura",
      nivel_riesgo: "Moderado",
      normativa: "RD 486/1997, Anexo I, apdo. 3 (orden, limpieza y zonas de paso); RD 614/2001",
      medida_correctiva:
        "Canalizar los cables mediante pasacables o recorrido aéreo y señalizar la zona de paso.",
      plazo: "1 semana",
      responsable: "Jefe de producción",
    },
    {
      titulo: "Señalización de uso obligatorio de EPI deteriorada",
      tipo: "Condición Insegura",
      nivel_riesgo: "Leve",
      normativa: "RD 485/1997, Anexo III (señales de obligación)",
      medida_correctiva: "Sustituir la señalización por señales normalizadas visibles en el acceso al taller.",
      plazo: "1 mes",
      responsable: "Técnico de PRL",
    },
  ],
};
