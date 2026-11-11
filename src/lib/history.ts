// Inspection history kept in the browser's localStorage.
import { normalizeInforme, type Informe } from "@/lib/report";

export interface InspeccionGuardada {
  id: string;
  fecha: string; // ISO
  area: string;
  observaciones: string;
  tecnico: string;
  foto: string | null; // small JPEG data URL
  informe: Informe;
}

const KEY = "prl-vision-audit:historial";
export const MAX_HISTORIAL = 30;

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Rebuilds a stored inspection from untrusted localStorage data.
 * Anything malformed is dropped instead of crashing the history panel.
 */
function sanitizeEntry(value: unknown): InspeccionGuardada | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const id = asString(obj["id"]);
  if (!id) return null;

  const fecha = asString(obj["fecha"]);
  if (Number.isNaN(new Date(fecha).getTime())) return null;

  let informe: Informe;
  try {
    informe = normalizeInforme(obj["informe"]);
  } catch {
    return null;
  }

  const foto = asString(obj["foto"]);

  return {
    id,
    fecha,
    area: asString(obj["area"]),
    observaciones: asString(obj["observaciones"]),
    tecnico: asString(obj["tecnico"]),
    foto: foto.startsWith("data:image/") ? foto : null,
    informe,
  };
}

export function loadHistorial(): InspeccionGuardada[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeEntry)
      .filter((entry): entry is InspeccionGuardada => entry !== null)
      .slice(0, MAX_HISTORIAL);
  } catch {
    return [];
  }
}

/** Inserts or replaces by id, newest first, capped. */
export function upsertEntry(
  list: InspeccionGuardada[],
  entry: InspeccionGuardada,
): InspeccionGuardada[] {
  return [entry, ...list.filter((e) => e.id !== entry.id)].slice(0, MAX_HISTORIAL);
}

export function saveHistorial(list: InspeccionGuardada[]): void {
  let l = list;
  // If storage is full, drop the oldest entries until it fits.
  while (l.length > 0) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(l));
      return;
    } catch {
      l = l.slice(0, -1);
    }
  }
  window.localStorage.removeItem(KEY);
}

export function clearHistorial(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Storage can be disabled (private mode); nothing to clear in that case.
  }
}
