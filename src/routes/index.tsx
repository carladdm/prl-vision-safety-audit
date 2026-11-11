import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, FlaskConical, Info, Loader2, ScanSearch } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/audit/AppHeader";
import { PhotoDropzone } from "@/components/audit/PhotoDropzone";
import { ReportPanel } from "@/components/audit/ReportPanel";
import { HistoryPanel } from "@/components/audit/HistoryPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { loadHistorial, saveHistorial, upsertEntry, type InspeccionGuardada } from "@/lib/history";
import { fileToBase64, fileToThumbDataUrl } from "@/lib/image";
import { informeEjemplo, normalizeInforme, sortBySeverity, type Informe, type InspeccionMeta } from "@/lib/report";
import { getAnalysisStatus, sendToWebhook } from "@/lib/webhook.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRL Vision Audit — Evaluación de riesgos en campo" },
      {
        name: "description",
        content:
          "Asistente para técnicos de PRL: fotografía el puesto de trabajo y obtén un informe de riesgos con normativa, medidas correctivas, plazos y responsables.",
      },
      { property: "og:title", content: "PRL Vision Audit — Evaluación de riesgos en campo" },
      {
        property: "og:description",
        content:
          "Fotografía el puesto de trabajo y genera al instante un informe técnico de riesgos laborales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TECNICO_KEY = "prl-vision-audit:tecnico";
const LEGACY_WEBHOOK_KEY = "prl-vision-audit:webhook-url";
const NOT_CONFIGURED = "El servicio de análisis no está configurado. Puedes probar la interfaz con los datos de ejemplo.";

function StepLabel({ n, htmlFor, children }: { n: number; htmlFor?: string; children: ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
      <span className="flex size-5 items-center justify-center rounded bg-safety font-display text-xs font-bold text-safety-foreground">
        {n}
      </span>
      {children}
    </Label>
  );
}

function Index() {
  const send = useServerFn(sendToWebhook);
  const fetchStatus = useServerFn(getAnalysisStatus);

  const [serviceReady, setServiceReady] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [area, setArea] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [informe, setInforme] = useState<Informe | null>(null);
  const [meta, setMeta] = useState<InspeccionMeta | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [tecnico, setTecnico] = useState("");
  const [historial, setHistorial] = useState<InspeccionGuardada[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Drop any webhook address saved on this device by older versions.
    window.localStorage.removeItem(LEGACY_WEBHOOK_KEY);
    fetchStatus()
      .then((r) => setServiceReady(r.configured))
      .catch(() => setServiceReady(false));
    setTecnico(window.localStorage.getItem(TECNICO_KEY) ?? "");
    setHistorial(loadHistorial());
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Persist the current inspection (including technician edits) to the history.
  useEffect(() => {
    if (!informe || !meta || !entryId || isSample) return;
    setHistorial((prev) => {
      const next = upsertEntry(prev, {
        id: entryId,
        fecha: meta.fecha.toISOString(),
        area: meta.area,
        observaciones: meta.observaciones,
        tecnico,
        foto,
        informe,
      });
      saveHistorial(next);
      return next;
    });
  }, [informe, meta, entryId, isSample, tecnico, foto]);

  const updateTecnico = (v: string) => {
    setTecnico(v);
    window.localStorage.setItem(TECNICO_KEY, v);
  };

  const openEntry = (it: InspeccionGuardada) => {
    setFile(null);
    setPreviewUrl(null);
    setFoto(it.foto);
    setMeta({ area: it.area, observaciones: it.observaciones, fecha: new Date(it.fecha) });
    if (it.tecnico) setTecnico(it.tecnico);
    setIsSample(false);
    setEntryId(it.id);
    setInforme(it.informe);
    setHistoryOpen(false);
  };

  const deleteEntry = (id: string) => {
    setHistorial((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveHistorial(next);
      return next;
    });
  };

  useEffect(() => {
    if (informe) reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [informe]);

  const onFile = (f: File) => {
    if (!["image/jpeg", "image/png"].includes(f.type)) {
      toast.error("Formato no admitido", { description: "Sube una imagen JPG o PNG." });
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    void fileToThumbDataUrl(f).then(setFoto);
    setError(null);
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setFoto(null);
  };

  const analyze = async () => {
    setError(null);
    if (!file) {
      setError("Añade una foto de la evidencia antes de analizar.");
      return;
    }
    if (serviceReady === false) {
      setError(NOT_CONFIGURED);
      return;
    }
    setLoading(true);
    try {
      const imagen_base64 = await fileToBase64(file);
      const res = await send({
        data: { payload: { imagen_base64, area: area.trim(), observaciones: observaciones.trim() } },
      });
      console.log("[PRL Vision Audit] Respuesta del webhook:", res);
      if (!res.ok) throw new Error(res.error);
      let parsed: Informe;
      try {
        parsed = normalizeInforme(res.body);
      } catch (err) {
        console.error("[PRL Vision Audit] Texto crudo recibido de n8n:\n", res.body);
        throw err;
      }
      setMeta({ area: area.trim(), observaciones: observaciones.trim(), fecha: new Date() });
      setIsSample(false);
      setEntryId(crypto.randomUUID());
      setInforme({ ...parsed, hallazgos: sortBySeverity(parsed.hallazgos) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error inesperado al analizar.";
      setError(msg);
      toast.error("No se pudo generar el informe", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setError(null);
    setMeta({
      area: area.trim() || "Taller de soldadura",
      observaciones: observaciones.trim() || "Operario cortando metal sin pantalla",
      fecha: new Date(),
    });
    setIsSample(true);
    setEntryId(null);
    setInforme({ ...informeEjemplo, hallazgos: sortBySeverity(informeEjemplo.hallazgos) });
  };

  const reset = () => {
    setInforme(null);
    setMeta(null);
    setIsSample(false);
    setEntryId(null);
    clearFile();
    setArea("");
    setObservaciones("");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen pb-16">
      <AppHeader
        onOpenHistory={() => setHistoryOpen(true)}
        historyCount={historial.length}
      />
      <HistoryPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        items={historial}
        onOpen={openEntry}
        onDelete={deleteEntry}
      />

      <main className="mx-auto max-w-3xl space-y-6 px-4 pt-6">
        {!informe && (
          <section className="space-y-5">
            {serviceReady === false && (
              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>{NOT_CONFIGURED}</p>
              </div>
            )}

            <div className="surface-card space-y-5 p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <ClipboardList className="size-4" />
                </span>
                <h2 className="text-lg font-semibold uppercase tracking-wide">Captura de evidencia</h2>
              </div>

              <div className="space-y-2">
                <StepLabel n={1}>Tomar foto o subir evidencia</StepLabel>
                <PhotoDropzone
                  previewUrl={previewUrl}
                  fileName={file?.name}
                  onFile={onFile}
                  onClear={clearFile}
                  scanning={loading}
                />
              </div>

              <div className="space-y-2">
                <StepLabel n={2} htmlFor="area">
                  Puesto de trabajo / área
                </StepLabel>
                <Input
                  id="area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  maxLength={300}
                  disabled={loading}
                  placeholder="Ej. Taller de soldadura, Almacén logístico"
                  className="h-12 bg-card text-base"
                />
              </div>

              <div className="space-y-2">
                <StepLabel n={3} htmlFor="obs">
                  Observaciones rápidas del técnico
                </StepLabel>
                <Textarea
                  id="obs"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  maxLength={4000}
                  disabled={loading}
                  rows={4}
                  placeholder="Ej. Operario cortando metal sin pantalla"
                  className="bg-card text-base"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-risk-high/30 bg-risk-high-soft px-3 py-2.5 text-sm font-medium text-risk-high"
                >
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  variant="safety"
                  size="xl"
                  className="relative w-full overflow-hidden"
                  onClick={analyze}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      <span className="truncate normal-case tracking-normal">
                        Analizando imagen y consultando normativa PRL...
                      </span>
                    </>
                  ) : (
                    <>
                      <ScanSearch /> Analizar Riesgos y Generar Informe
                    </>
                  )}
                </Button>
                {loading && <div className="hazard-stripe-animated h-1.5 rounded-full" />}
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={loadSample}
                  disabled={loading}
                >
                  <FlaskConical /> Cargar datos de ejemplo
                </Button>
              </div>
            </div>
          </section>
        )}

        {informe && meta && (
          <div ref={reportRef} className="scroll-mt-4">
            <ReportPanel
              informe={informe}
              meta={meta}
              previewUrl={foto ?? previewUrl}
              isSample={isSample}
              tecnico={tecnico}
              onTecnicoChange={updateTecnico}
              onChange={setInforme}
              onReset={reset}
            />
          </div>
        )}
      </main>

      <footer className="mx-auto mt-12 max-w-3xl border-t border-border px-4 pt-5 text-center text-xs text-muted-foreground">
        Herramienta de apoyo técnico con IA · Validación final sujeta a criterio de Técnico Superior en PRL
      </footer>
    </div>
  );
}
