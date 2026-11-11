import { ClipboardCopy, FileDown, FileText, Loader2, MapPin, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FindingCard } from "@/components/audit/FindingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadActaPdf } from "@/lib/pdf";
import {
  countByRisk,
  informeToHtml,
  informeToText,
  type Hallazgo,
  type Informe,
  type InspeccionMeta,
} from "@/lib/report";

interface Props {
  informe: Informe;
  meta: InspeccionMeta;
  previewUrl: string | null;
  isSample: boolean;
  tecnico: string;
  onTecnicoChange: (v: string) => void;
  onChange: (inf: Informe) => void;
  onReset: () => void;
}

async function copyReport(informe: Informe, meta: InspeccionMeta) {
  const text = informeToText(informe, meta);
  const html = informeToHtml(informe, meta);
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error("clipboard-unsupported");
    }
    toast.success("Informe copiado", {
      description: "Pégalo directamente en Word o en tu correo.",
    });
  } catch {
    // Fallback for embedded browsers / denied permissions / non-HTTPS contexts.
    if (legacyCopy(text)) {
      toast.success("Informe copiado", {
        description: "Se ha copiado como texto plano. Pégalo en Word o en tu correo.",
      });
      return;
    }
    toast.error("No se pudo copiar al portapapeles", {
      description: "Descarga el acta en PDF o selecciona el texto manualmente.",
    });
  }
}

/** Last-resort copy that works without the async Clipboard API (deprecated but widely supported). */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function ReportPanel({
  informe,
  meta,
  previewUrl,
  isSample,
  tecnico,
  onTecnicoChange,
  onChange,
  onReset,
}: Props) {
  const counts = countByRisk(informe.hallazgos);
  // Keep the order fixed while the technician edits; sorting happens when the report loads.
  const sorted = informe.hallazgos;
  const [pdfBusy, setPdfBusy] = useState(false);

  const updateAt = (i: number, h: Hallazgo) =>
    onChange({ ...informe, hallazgos: informe.hallazgos.map((x, j) => (j === i ? h : x)) });

  const downloadPdf = async () => {
    if (!tecnico.trim()) {
      toast.error("Falta el nombre del técnico", {
        description: "Escríbelo antes de descargar el acta.",
      });
      document.getElementById("tecnico")?.focus();
      return;
    }
    setPdfBusy(true);
    try {
      await downloadActaPdf({
        informe,
        meta,
        tecnico: tecnico.trim(),
        foto: previewUrl,
        isSample,
      });
      if (isSample) {
        toast.warning("Acta de ejemplo generada", {
          description: "Lleva marca de agua: no es válida como acta oficial.",
        });
      }
    } catch {
      toast.error("No se pudo generar el PDF", {
        description: "Vuelve a intentarlo. Si persiste, copia el informe en Word.",
      });
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-safety" />
        <h2 className="text-2xl font-bold uppercase tracking-wide">Informe técnico</h2>
        {isSample && (
          <span className="ml-auto rounded-full bg-safety-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-risk-medium-ink">
            Datos de ejemplo
          </span>
        )}
      </div>

      {isSample && (
        <div
          role="note"
          className="rounded-lg border border-risk-medium/40 bg-risk-medium-soft px-3 py-2.5 text-sm font-medium text-risk-medium-ink"
        >
          Este informe contiene datos de ejemplo para probar la interfaz. El PDF se genera con marca
          de agua y <strong>no es válido como acta oficial</strong>.
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="bg-hero p-5 text-primary-foreground">
          <div className="flex gap-4">
            {previewUrl && (
              <img
                src={previewUrl}
                alt=""
                className="size-20 shrink-0 rounded-lg border border-primary-foreground/20 object-cover"
              />
            )}
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-safety">
                Resumen ejecutivo
              </p>
              {meta.area && (
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <MapPin className="size-3.5 shrink-0" /> {meta.area}
                </p>
              )}
              <p className="text-xs text-primary-foreground/60">
                {meta.fecha.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-primary-foreground/90">
            {informe.resumen_general || "Sin resumen."}
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          <Stat label="Importante / Grave" value={counts.high} tone="text-risk-high" />
          <Stat label="Moderado" value={counts.medium} tone="text-risk-medium-ink" />
          <Stat label="Trivial / Leve" value={counts.low} tone="text-risk-low" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold uppercase tracking-wide">Hallazgos detectados</h3>
        <span className="font-mono text-sm text-muted-foreground">{sorted.length}</span>
      </div>

      {sorted.length === 0 ? (
        <div className="surface-card p-6 text-center text-sm text-muted-foreground">
          El análisis no ha identificado hallazgos.
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((h, i) => (
            <FindingCard key={i} hallazgo={h} index={i} onChange={(nh) => updateAt(i, nh)} />
          ))}
        </div>
      )}

      <div className="surface-card space-y-2 p-4">
        <Label htmlFor="tecnico" className="text-xs font-semibold uppercase tracking-wide">
          Nombre del Técnico Inspector
        </Label>
        <Input
          id="tecnico"
          value={tecnico}
          onChange={(e) => onTecnicoChange(e.target.value)}
          maxLength={120}
          placeholder="Ej. María López García"
          className="h-12 bg-card text-base"
        />
      </div>

      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        <Button
          variant="safety"
          size="xl"
          className="sm:col-span-2"
          onClick={downloadPdf}
          disabled={pdfBusy}
        >
          {pdfBusy ? <Loader2 className="animate-spin" /> : <FileDown />} Descargar Acta en PDF
        </Button>
        <Button variant="ink" size="xl" onClick={() => copyReport(informe, meta)}>
          <ClipboardCopy /> Copiar Informe para Word/Email
        </Button>
        <Button variant="outline" size="xl" onClick={onReset} className="bg-card font-semibold">
          <RotateCcw /> Nueva Inspección
        </Button>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="px-2 py-3 text-center">
      <p className={`font-display text-3xl font-bold leading-none ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}
