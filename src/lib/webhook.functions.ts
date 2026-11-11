import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Forwards the inspection to the n8n webhook from the server. The webhook URL is a
// private server secret (N8N_WEBHOOK_URL): it never reaches the browser, the
// published code or the repository.

const payloadSchema = z.object({
  imagen_base64: z.string().max(20_000_000),
  area: z.string().max(300),
  observaciones: z.string().max(4000),
});

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[?::1\]?$|172\.(1[6-9]|2\d|3[01])\.)/i;

function readWebhookUrl(): string | null {
  const raw = (process.env["N8N_WEBHOOK_URL"] ?? process.env["VITE_N8N_WEBHOOK_URL"] ?? "").trim();
  return /^https?:\/\/.+/i.test(raw) ? raw : null;
}

export type WebhookResult =
  | { ok: true; status: number; body: string }
  | { ok: false; status: number; error: string };

export const getAnalysisStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { configured: readWebhookUrl() !== null };
});

export const sendToWebhook = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ payload: payloadSchema }).parse(data))
  .handler(async ({ data }): Promise<WebhookResult> => {
    const url = readWebhookUrl();
    if (!url) {
      return { ok: false, status: 503, error: "El servicio de análisis no está configurado." };
    }
    if (PRIVATE_HOST.test(new URL(url).hostname)) {
      return { ok: false, status: 400, error: "El servicio de análisis no está configurado correctamente." };
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data.payload),
        signal: AbortSignal.timeout(180_000),
      });
      const body = await res.text();
      console.log(
        `Webhook ${res.status} content-type=${res.headers.get("content-type")} length=${body.length}:`,
        body.slice(0, 1000),
      );
      if (!res.ok) {
        console.error(`Webhook ${res.status}: ${body.slice(0, 500)}`);
        return {
          ok: false,
          status: res.status,
          error: `El servicio de análisis respondió con error ${res.status}.`,
        };
      }
      if (body.trim().length === 0) {
        return {
          ok: false,
          status: res.status,
          error:
            "El servicio de análisis respondió sin contenido. En n8n, el nodo Webhook debe tener «Respond» en «Using 'Respond to Webhook' Node» y el flujo debe terminar en un nodo «Respond to Webhook» con el JSON del informe.",
        };
      }
      return { ok: true, status: res.status, body };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Webhook request failed:", msg);
      const timeout = /timeout|abort/i.test(msg);
      return {
        ok: false,
        status: 0,
        error: timeout
          ? "El análisis tardó demasiado en responder (más de 3 minutos)."
          : "No se pudo conectar con el servicio de análisis. Inténtalo de nuevo en unos minutos.",
      };
    }
  });
