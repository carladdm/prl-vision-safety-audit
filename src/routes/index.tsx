import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FlaskConical, Loader2, ScanSearch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/audit/AppHeader";
import { PhotoDropzone } from "@/components/audit/PhotoDropzone";
import { ReportPanel } from "@/components/audit/ReportPanel";
import { WebhookSettings } from "@/components/audit/WebhookSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fileToBase64 } from "@/lib/image";
import { informeEjemplo, normalizeInforme, type Informe, type InspeccionMeta } from "@/lib/report";
import { sendToWebhook } from "@/lib/webhook.functions";

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

const WEBHOOK_KEY = "prl-vision-audit:webhook-url";

function Index() {
  const send = useServerFn(sendToWebhook);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [area, setArea] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [informe, setInforme] = useState<Informe | null>(null);
  const [meta, setMeta] = useState<InspeccionMeta | null>(null);
  const [isSample, setIsSample] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(WEBHOOK_KEY) ?? "";
    setWebhookUrl(saved);
    if (!saved) setSettingsOpen(true);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (informe) reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [informe]);

  const updateWebhook = (v: string) => {
    setWebhookUrl(v);
    window.localStorage.setItem(WEBHOOK_KEY, v.trim());
  };

  const onFile = (f: File) => {
    if (!["image/jpeg", "image/png"].includes(f.type)) {
      toast.error("Formato no admitido", { description: "Sube una imagen JPG o PNG." });
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError(null);
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const openSettings = () => {
    setSettingsOpen(true);
    settingsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const analyze = async () => {
    setError(null);
    if (!file) {
      setError("Añade una foto de la evidencia antes de analizar.");
      return;
    }
    const url = webhookUrl.trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      setError("Configura la URL del Webhook de n8n para poder analizar.");
      openSettings();
      return;
    }
    setLoading(true);
    try {
      const imagen_base64 = await fileToBase64(file);
      const res = await send({
        data: { url, payload: { imagen_base64, area: area.trim(), observaciones: observaciones.trim() } },
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
      setInforme(parsed);
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
    setInforme(informeEjemplo);
  };

  const reset = () => {
    setInforme(null);
    setMeta(null);
    setIsSample(false);
    clearFile();
    setArea("");
    setObservaciones("");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const urlConfigured = /^https?:\/\/.+/i.test(webhookUrl.trim());

  return (
    <div className="min-h-screen pb-16">
      <AppHeader onOpenSettings={openSettings} webhookConfigured={urlConfigured} />

      <main className="mx-auto max-w-3xl space-y-6 px-4 pt-6">
        {!informe && (
          <section className="space-y-5">
            <div ref={settingsRef}>
              <WebhookSettings
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                url={webhookUrl}
                onUrlChange={updateWebhook}
              />
            </div>

            <div className="surface-card space-y-5 p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-safety font-display text-sm font-bold text-safety-foreground">
                  1
                </span>
                <h2 className="text-lg font-semibold uppercase tracking-wide">Captura de evidencia</h2>
              </div>

              <PhotoDropzone
                previewUrl={previewUrl}
                fileName={file?.name}
                onFile={onFile}
                onClear={clearFile}
                scanning={loading}
              />

              <div className="space-y-2">
                <Label htmlFor="area" className="text-xs font-semibold uppercase tracking-wide">
                  Puesto de trabajo / Área
                </Label>
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
                <Label htmlFor="obs" className="text-xs font-semibold uppercase tracking-wide">
                  Observaciones rápidas del técnico
                </Label>
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
              previewUrl={previewUrl}
              isSample={isSample}
              onReset={reset}
            />
          </div>
        )}
      </main>
    </div>
  );
}
