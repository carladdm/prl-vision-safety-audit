import { describe, expect, it } from "vitest";

import {
  detectionWarnings,
  normalizeInforme,
  riskLevel,
  type Informe,
  type InspeccionMeta,
} from "./report";

describe("riskLevel", () => {
  it("shows Trivial, Tolerable and Leve as green (low)", () => {
    expect(riskLevel("Trivial")).toBe("low");
    expect(riskLevel("Tolerable")).toBe("low");
    expect(riskLevel("Leve")).toBe("low");
    expect(riskLevel("")).toBe("low");
  });

  it("shows Moderado as yellow (medium)", () => {
    expect(riskLevel("Moderado")).toBe("medium");
    expect(riskLevel("Riesgo moderado")).toBe("medium");
  });

  it("shows Importante, Grave and Intolerable as red (high)", () => {
    expect(riskLevel("Importante")).toBe("high");
    expect(riskLevel("Grave")).toBe("high");
    expect(riskLevel("Muy grave")).toBe("high");
    expect(riskLevel("Intolerable")).toBe("high");
    expect(riskLevel("No aceptable")).toBe("high");
    expect(riskLevel("Inaceptable")).toBe("high");
  });

  it("does not downgrade Intolerable because it contains Tolerable", () => {
    expect(riskLevel("intolerable")).toBe("high");
  });
});

describe("normalizeInforme", () => {
  const body = {
    resumen_general: "Resumen",
    hallazgos: [
      {
        titulo: "T",
        tipo: "Acto Inseguro",
        nivel_riesgo: "Leve",
        normativa: "RD 773/1997",
        medida_correctiva: "M",
        plazo: "Inmediato",
        responsable: "Encargado",
      },
    ],
  };

  it("reads the exact webhook response structure", () => {
    const inf = normalizeInforme(body);
    expect(inf.resumen_general).toBe("Resumen");
    expect(inf.hallazgos[0]?.normativa).toBe("RD 773/1997");
  });

  it("unwraps n8n array / output-string responses", () => {
    const inf = normalizeInforme([{ output: "```json\n" + JSON.stringify(body) + "\n```" }]);
    expect(inf.hallazgos).toHaveLength(1);
  });

  it("parses a JSON string body", () => {
    const inf = normalizeInforme(JSON.stringify(body));
    expect(inf.resumen_general).toBe("Resumen");
    expect(inf.hallazgos).toHaveLength(1);
  });

  it("unwraps nested data wrappers", () => {
    const inf = normalizeInforme({ data: { ...body } });
    expect(inf.resumen_general).toBe("Resumen");
  });

  it("rejects responses without the expected fields", () => {
    expect(() => normalizeInforme({ foo: 1 })).toThrow();
  });

  it("rejects malformed JSON with a readable message", () => {
    expect(() => normalizeInforme("{esto no es json")).toThrow(/no se pudo leer/i);
  });
});

describe("detectionWarnings", () => {
  const meta = (observaciones = ""): InspeccionMeta => ({
    area: "Taller",
    observaciones,
    fecha: new Date("2026-01-01T00:00:00Z"),
  });

  const hallazgo = (titulo: string, nivel_riesgo = "Moderado") => ({
    titulo,
    tipo: "Condición Insegura",
    nivel_riesgo,
    normativa: "RD 486/1997",
    medida_correctiva: "Corregir",
    plazo: "Inmediato",
    responsable: "Encargado",
  });

  it("avisa cuando el resumen anuncia más hallazgos de los que se listan", () => {
    const informe: Informe = {
      resumen_general: "Se identifican 4 hallazgos, 2 de ellos de nivel Importante.",
      hallazgos: [hallazgo("Cable suelto"), hallazgo("Señal deteriorada")],
    };
    expect(detectionWarnings(informe, meta()).map((w) => w.code)).toContain("summary_mismatch");
  });

  it("entiende números escritos en palabras", () => {
    const informe: Informe = {
      resumen_general: "Se han detectado cuatro riesgos en el puesto.",
      hallazgos: [hallazgo("Uno"), hallazgo("Dos")],
    };
    expect(detectionWarnings(informe, meta()).map((w) => w.code)).toContain("summary_mismatch");
  });

  it("avisa si solo hay dos hallazgos del mismo nivel y no hay observaciones", () => {
    const informe: Informe = {
      resumen_general: "Se revisó el puesto de trabajo.",
      hallazgos: [hallazgo("A"), hallazgo("B")],
    };
    const codes = detectionWarnings(informe, meta()).map((w) => w.code);
    expect(codes).toContain("few_findings");
    expect(codes).toContain("single_level");
  });

  it("no avisa si el técnico dejó observaciones", () => {
    const informe: Informe = {
      resumen_general: "Se revisó el puesto de trabajo.",
      hallazgos: [hallazgo("A"), hallazgo("B")],
    };
    const codes = detectionWarnings(informe, meta("Revisar la amoladora")).map((w) => w.code);
    expect(codes).not.toContain("few_findings");
  });

  it("avisa por títulos duplicados", () => {
    const informe: Informe = {
      resumen_general: "Dos hallazgos",
      hallazgos: [hallazgo("Cable suelto"), hallazgo("Cable suelto", "Importante")],
    };
    expect(detectionWarnings(informe, meta("Obs")).map((w) => w.code)).toContain("duplicate_title");
  });

  it("no avisa en un informe legítimo de un solo hallazgo", () => {
    const informe: Informe = {
      resumen_general: "Se ha detectado una condición insegura.",
      hallazgos: [hallazgo("Cable suelto")],
    };
    expect(detectionWarnings(informe, meta())).toHaveLength(0);
  });

  it("no avisa si el resumen coincide con la lista", () => {
    const informe: Informe = {
      resumen_general: "Se identifican 4 hallazgos en el taller.",
      hallazgos: [
        hallazgo("A", "Importante"),
        hallazgo("B"),
        hallazgo("C", "Leve"),
        hallazgo("D", "Grave"),
      ],
    };
    expect(detectionWarnings(informe, meta())).toHaveLength(0);
  });
});
