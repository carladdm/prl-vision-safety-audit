import { describe, expect, it } from "vitest";

import { normalizeInforme, riskLevel } from "./report";

describe("riskLevel", () => {
  it("shows Trivial and Leve as green (low)", () => {
    expect(riskLevel("Trivial")).toBe("low");
    expect(riskLevel("Leve")).toBe("low");
  });

  it("shows Moderado as yellow (medium)", () => {
    expect(riskLevel("Moderado")).toBe("medium");
  });

  it("shows Importante and Grave as red (high)", () => {
    expect(riskLevel("Importante")).toBe("high");
    expect(riskLevel("Grave")).toBe("high");
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
    expect(inf.hallazgos[0].normativa).toBe("RD 773/1997");
  });

  it("unwraps n8n array / output-string responses", () => {
    const inf = normalizeInforme([{ output: "```json\n" + JSON.stringify(body) + "\n```" }]);
    expect(inf.hallazgos).toHaveLength(1);
  });

  it("rejects responses without the expected fields", () => {
    expect(() => normalizeInforme({ foo: 1 })).toThrow();
  });
});
