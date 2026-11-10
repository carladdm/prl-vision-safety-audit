import { ImageOff, MapPin, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { InspeccionGuardada } from "@/lib/history";
import { countByRisk } from "@/lib/report";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: InspeccionGuardada[];
  onOpen: (item: InspeccionGuardada) => void;
  onDelete: (id: string) => void;
}

export function HistoryPanel({ open, onOpenChange, items, onOpen, onDelete }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl uppercase tracking-wide">Historial de inspecciones</SheetTitle>
          <SheetDescription>Guardadas en este dispositivo.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3 px-4 pb-6">
          {items.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aún no hay inspecciones guardadas.
            </p>
          )}
          {items.map((it) => {
            const c = countByRisk(it.informe.hallazgos);
            return (
              <div key={it.id} className="surface-card flex gap-3 p-3">
                <button type="button" onClick={() => onOpen(it)} className="flex min-w-0 flex-1 gap-3 text-left">
                  {it.foto ? (
                    <img src={it.foto} alt="" className="size-16 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <ImageOff className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-sm font-semibold">
                      <MapPin className="size-3.5 shrink-0" /> {it.area || "Sin área"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(it.fecha).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    <p className="mt-1 flex gap-2 text-xs font-semibold">
                      <span className="text-risk-high">{c.high} imp.</span>
                      <span className="text-risk-medium-ink">{c.medium} mod.</span>
                      <span className="text-risk-low">{c.low} leve</span>
                    </p>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Borrar inspección"
                  onClick={() => onDelete(it.id)}
                  className="shrink-0 text-muted-foreground"
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
