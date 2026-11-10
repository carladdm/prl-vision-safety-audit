// Inspection history kept in the browser's localStorage.
import type { Informe } from "@/lib/report";

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

export function loadHistorial(): InspeccionGuardada[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as InspeccionGuardada[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Inserts or replaces by id, newest first, capped. */
export function upsertEntry(list: InspeccionGuardada[], entry: InspeccionGuardada): InspeccionGuardada[] {
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
