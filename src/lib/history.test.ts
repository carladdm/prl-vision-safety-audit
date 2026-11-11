import { beforeEach, describe, expect, it } from "vitest";

import { clearHistorial, loadHistorial, saveHistorial } from "./history";

const KEY = "prl-vision-audit:historial";

const informe = {
  resumen_general: "Resumen",
  hallazgos: [
    {
      titulo: "T",
      tipo: "Acto Inseguro",
      nivel_riesgo: "Importante",
      normativa: "RD 773/1997",
      medida_correctiva: "M",
      plazo: "Inmediato",
      responsable: "Encargado",
    },
  ],
};

const validEntry = {
  id: "abc",
  fecha: "2026-01-01T10:00:00.000Z",
  area: "Taller",
  observaciones: "Obs",
  tecnico: "Ana",
  foto: null,
  informe,
};

describe("loadHistorial", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty list when storage is empty", () => {
    expect(loadHistorial()).toEqual([]);
  });

  it("reads valid stored inspections", () => {
    window.localStorage.setItem(KEY, JSON.stringify([validEntry]));
    const list = loadHistorial();
    expect(list).toHaveLength(1);
    expect(list[0]?.area).toBe("Taller");
    expect(list[0]?.informe.hallazgos).toHaveLength(1);
  });

  it("drops corrupted entries instead of crashing", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify([
        validEntry,
        { id: "no-fecha" },
        { id: "bad-date", fecha: "no-es-una-fecha", informe },
        { id: "bad-informe", fecha: "2026-01-01T10:00:00.000Z", informe: { foo: 1 } },
        null,
        "texto",
      ]),
    );
    const list = loadHistorial();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("abc");
  });

  it("survives invalid JSON in storage", () => {
    window.localStorage.setItem(KEY, "{no es json");
    expect(loadHistorial()).toEqual([]);
  });

  it("clears the history", () => {
    saveHistorial([{ ...validEntry, informe }]);
    clearHistorial();
    expect(loadHistorial()).toEqual([]);
  });
});
