# Prl Vision Safety Audit

Crea una aplicación web moderna y profesional llamada "PRL Vision Audit", diseñada para técnicos de Prevención de Riesgos Laborales (PRL) que realizan inspecciones en campo.

DISEÑO Y ESTILO:
- Estética limpia, corporativa e industrial (fondo claro #F8FAFC, tarjetas blancas con bordes sutiles, azul marino oscuro #0F172A para textos principales y amarillo/ámbar #F59E0B como color de acento de seguridad).
- Diseño Mobile-First (adaptado para usarse desde un smartphone en obra, pero con buena visualización en escritorio).

ESTRUCTURA DE LA PANTALLA PRINCIPAL:
1. Header superior: Logo minimalista con un icono de escudo/casco, título "PRL Vision Audit" y subtítulo "Asistente de Evaluación de Riesgos en Campo".
2. Sección de Captura (Formulario):
   - Un área grande de arrastrar/soltar o botón para "Tomar foto o subir evidencia" (que acepte imágenes JPG/PNG y muestre una vista previa de la foto subida).
   - Un campo de texto corto: "Puesto de trabajo / Área" (ej. Taller de soldadura, Almacén logístico).
   - Un área de texto para "Observaciones rápidas del técnico" (ej. Operario cortando metal sin pantalla).
   - Un campo de configuración colapsable (o icono de engranaje en el header) para pegar la "URL del Webhook de n8n".
   - Botón principal grande: "Analizar Riesgos y Generar Informe" (con estado de carga animado que diga "Analizando imagen y consultando normativa PRL...").

3. Sección de Resultados (Panel de Informe Técnico):
   - Se muestra solo después de recibir la respuesta del webhook.
   - Muestra un resumen ejecutivo arriba y una lista de tarjetas por cada hallazgo detectado.
   - Cada tarjeta debe mostrar:
     * Título del hallazgo y un badge de color según el nivel de riesgo ("Trivial/Leve" en verde, "Moderado" en amarillo, "Importante/Grave" en rojo).
     * Categoría (Acto Inseguro o Condición Insegura).
     * Normativa aplicable (citada en negrita).
     * Medida correctiva propuesta.
     * Plazo y Responsable sugerido.
   - Un botón secundario al final: "Copiar Informe para Word/Email" que copie todo el resultado formateado al portapapeles, y otro botón "Nueva Inspección".

LÓGICA DE CONEXIÓN (WEBHOOK):
Al pulsar "Analizar Riesgos", convierte la imagen subida a formato Base64 y envía una petición POST en formato JSON a la URL del Webhook configurada con esta estructura:
{
  "imagen_base64": "...",
  "area": "...",
  "observaciones": "..."
}

La aplicación debe esperar un JSON de respuesta con esta estructura exacta para renderizar las tarjetas:
{
  "resumen_general": "Texto resumen...",
  "hallazgos": [
    {
      "titulo": "...",
      "tipo": "Acto Inseguro | Condición Insegura",
      "nivel_riesgo": "Leve | Moderado | Importante",
      "normativa": "...",
      "medida_correctiva": "...",
      "plazo": "...",
      "responsable": "..."
    }
  ]
}
Incluye un botón de "Cargar datos de ejemplo" para que pueda probar la interfaz visualmente antes de conectar el webhook real.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b3754bfd-a385-4d84-bfc3-4bb97a944702).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
