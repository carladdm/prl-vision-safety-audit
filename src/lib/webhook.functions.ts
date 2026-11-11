import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Forwards the inspection to the n8n webhook from the server. The webhook URL is a
// private server secret (N8N_WEBHOOK_URL): it never reaches the browser, the
// published code or the repository.
//
// Never rename it to VITE_N8N_WEBHOOK_URL: the VITE_ prefix makes Vite inline the
// value into the client bundle, exposing the webhook to any visitor.

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const REQUEST_TIMEOUT_MS = 180_000; // 3 min: multimodal analysis is slow

const payloadSchema = z.object({
  imagen_base64: z.string().max(20_000_000),
  area: z.string().max(300),
  observaciones: z.string().max(4000),
});

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|172\.(1[6-9]|2\d|3[01])\.)/i;

/** Blocks loopback, link-local, private ranges and IPv6 equivalents (SSRF guard). */
function isPrivateHostname(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (!host) return true;
  if (PRIVATE_HOST.test(host)) return true;
  if (host === "::" || host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (host.startsWith("::ffff:")) return true; // IPv4-mapped IPv6
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true; // fc00::/7 unique local
  if (/^fe[89ab][0-9a-f]:/.test(host)) return true; // fe80::/10 link-local
  return false;
}

type WebhookConfig =
  { ok: true; url: string } | { ok: false; reason: "missing" | "invalid" | "private" };

function readWebhookConfig(): WebhookConfig {
  const raw = (process.env["N8N_WEBHOOK_URL"] ?? "").trim();
  if (!raw) return { ok: false, reason: "missing" };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "invalid" };
  }
  if (isPrivateHostname(parsed.hostname)) {
    return { ok: false, reason: "private" };
  }
  return { ok: true, url: parsed.toString() };
}

class ResponseTooLargeError extends Error {}

/** Reads the body with a hard size cap so a rogue/huge response cannot exhaust memory. */
async function readBodyLimited(res: Response, limit: number): Promise<string> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > limit) throw new ResponseTooLargeError();
  if (!res.body) return await res.text();

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) throw new ResponseTooLargeError();
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

const NOT_CONFIGURED =
  "El servicio de análisis no está disponible en este momento. Contacta con el responsable de la herramienta o prueba con los datos de ejemplo.";

export type WebhookResult =
  { ok: true; status: number; body: string } | { ok: false; status: number; error: string };

export const getAnalysisStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { configured: readWebhookConfig().ok };
});

export const sendToWebhook = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ payload: payloadSchema }).parse(data))
  .handler(async ({ data }): Promise<WebhookResult> => {
    const config = readWebhookConfig();
    if (!config.ok) {
      return { ok: false, status: 503, error: NOT_CONFIGURED };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const token = (process.env["N8N_WEBHOOK_TOKEN"] ?? "").trim();
    if (token) headers["x-webhook-token"] = token;

    try {
      const res = await fetch(config.url, {
        method: "POST",
        headers,
        body: JSON.stringify(data.payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      let body: string;
      try {
        body = await readBodyLimited(res, MAX_RESPONSE_BYTES);
      } catch (err) {
        if (err instanceof ResponseTooLargeError) {
          return {
            ok: false,
            status: res.status,
            error:
              "El servicio de análisis devolvió una respuesta demasiado grande. Reduce el tamaño de la foto e inténtalo de nuevo.",
          };
        }
        throw err;
      }

      if (!res.ok) {
        // Server-side diagnostic only: never log the inspection payload or the body.
        console.error(`[PRL Vision Audit] Webhook respondió ${res.status} (${body.length} bytes).`);
        return {
          ok: false,
          status: res.status,
          error: `El servicio de análisis no pudo completar la evaluación (código ${res.status}). Inténtalo de nuevo en unos minutos.`,
        };
      }

      if (body.trim().length === 0) {
        return {
          ok: false,
          status: res.status,
          error:
            "El servicio de análisis devolvió una respuesta vacía. Vuelve a intentarlo; si el problema persiste, contacta con el responsable de la herramienta.",
        };
      }

      return { ok: true, status: res.status, body };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const timeout = /timeout|abort/i.test(msg);
      console.error(
        "[PRL Vision Audit] Fallo al contactar con el webhook:",
        timeout ? "timeout" : msg,
      );
      return {
        ok: false,
        status: 0,
        error: timeout
          ? "El análisis tardó demasiado en responder (más de 3 minutos). Prueba con una foto más ligera o inténtalo más tarde."
          : "No se pudo conectar con el servicio de análisis. Comprueba tu conexión e inténtalo de nuevo en unos minutos.",
      };
    }
  });
