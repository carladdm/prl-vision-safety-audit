import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Forwards the inspection to the technician's n8n webhook from the server,
// so the browser is not blocked by CORS settings on the n8n instance.

const inputSchema = z.object({
  url: z
    .string()
    .trim()
    .url()
    .max(2000)
    .refine((u) => /^https?:\/\//i.test(u), "La URL debe empezar por http:// o https://"),
  payload: z.object({
    imagen_base64: z.string().max(20_000_000),
    area: z.string().max(300),
    observaciones: z.string().max(4000),
  }),
});

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[?::1\]?$|172\.(1[6-9]|2\d|3[01])\.)/i;

export type WebhookResult =
  | { ok: true; status: number; body: string }
  | { ok: false; status: number; error: string };

export const sendToWebhook = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<WebhookResult> => {
    const host = new URL(data.url).hostname;
    if (PRIVATE_HOST.test(host)) {
      return { ok: false, status: 400, error: "La URL del webhook debe ser una dirección pública." };
    }
    try {
      const res = await fetch(data.url, {
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
          error: `El webhook respondió con error ${res.status}. ${body.slice(0, 300)}`.trim(),
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
          ? "El webhook tardó demasiado en responder (más de 3 minutos)."
          : "No se pudo conectar con el webhook. Comprueba la URL y que el flujo de n8n esté activo.",
      };
    }
  });
