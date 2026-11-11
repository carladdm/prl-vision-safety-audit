# Reglas del proyecto

## Stack

- React 19 + TypeScript + Vite + Tailwind CSS 4 sobre TanStack Start (SSR con Nitro).
- El build se apoya en `@lovable.dev/vite-tanstack-config`, que ya incluye TanStack Start,
  React, Tailwind, Nitro, alias `@` e inyección de `VITE_*`. No añadas esos plugins por
  separado ni retires el paquete sin migrar `vite.config.ts` y verificar los builds.
- `npm run build` genera el target por defecto (Cloudflare). Para reproducir el
  despliegue de Vercel usa `NITRO_PRESET=vercel npm run build` en Linux/macOS o
  `$env:NITRO_PRESET='vercel'; npm run build` en PowerShell. En Vercel lo aplica
  `vercel.json`, que fuerza ese preset y desactiva la detección de framework.

## Comandos

- `npm run dev`: desarrollo.
- `npm run check`: typecheck + lint + tests. Obligatorio antes de commitear.
- `npm run build`: build de producción.

## Invariantes de seguridad

- La URL del webhook es el secreto de servidor `N8N_WEBHOOK_URL`, leído solo en
  `src/lib/webhook.functions.ts`. Nunca debe llevar el prefijo `VITE_`: Vite lo
  incrustaría en el bundle público.
- No se registra el payload de la inspección ni el cuerpo de respuesta del webhook.
- La URL se valida con `new URL()` y se bloquean destinos loopback, privados y
  link-local (IPv4 e IPv6).

## Dominio y capas

- `src/lib/report.ts` es la única fuente del contrato `Informe`, la escala de riesgo
  INSST y las exportaciones. La UI solo renderiza datos ya normalizados.
- `src/lib/pdf.ts` y `src/lib/history.ts` son código de navegador: se cargan en
  diferido y no deben importarse desde el servidor.
- El historial vive en `localStorage` (máx. 30 inspecciones) y debe sanearse al leerlo.

## Convenciones

- Conventional Commits en español, commits atómicos.
- Los tests viven junto al módulo (`*.test.ts`) y se ejecutan con Vitest.
- No reescribas el historial ya publicado (force push, rebase o amend de commits
  públicos): añade commits nuevos.
