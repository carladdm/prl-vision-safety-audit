// Browser-only helpers to turn a photo into a compact Base64 JPEG for the webhook payload.

const MAX_SIDE = 1600;

/** 15 MB: generous for a phone photo, small enough to reach the webhook reliably. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const ACCEPT_ATTRIBUTE = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
].join(",");

/** Accepts by MIME type or extension: some browsers report HEIC files as an empty type. */
export function isAcceptedImage(file: File): boolean {
  if ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

const READ_ERROR = "No se pudo leer la imagen. Prueba con otra foto.";
const PROCESS_ERROR =
  "No se pudo procesar esta imagen en el navegador. Si es una foto de iPhone en formato HEIC, conviértela a JPG (Ajustes → Cámara → Formatos → «Más compatible») o prueba con otra foto.";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(PROCESS_ERROR));
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(READ_ERROR));
    reader.readAsDataURL(file);
  });
}

function drawToCanvas(img: HTMLImageElement, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(PROCESS_ERROR);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Small JPEG data URL for the PDF and history (keeps localStorage light). */
export async function fileToThumbDataUrl(file: File, maxSide = 900): Promise<string | null> {
  try {
    const img = await loadImage(await readAsDataUrl(file));
    return drawToCanvas(img, maxSide).toDataURL("image/jpeg", 0.72);
  } catch {
    return null;
  }
}

/** Returns raw Base64 (no `data:` prefix), resized to at most 1600 px and re-encoded as JPEG. */
export async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(dataUrl);
  } catch {
    throw new Error(PROCESS_ERROR);
  }

  let output: string;
  try {
    output = drawToCanvas(img, MAX_SIDE).toDataURL("image/jpeg", 0.85);
  } catch {
    throw new Error(PROCESS_ERROR);
  }

  const base64 = output.split(",")[1] ?? "";
  if (!base64) throw new Error(PROCESS_ERROR);
  return base64;
}
