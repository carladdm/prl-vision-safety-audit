import { describe, expect, it } from "vitest";

import { normalizeInforme, riskLevel } from "./report";

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
