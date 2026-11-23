# QA de visión: detección de riesgos

Esta matriz cubre los falsos negativos y otras degradaciones del análisis multimodal. Es un protocolo manual: la app no llama a n8n desde las pruebas automatizadas, porque la URL del webhook es un secreto de servidor y el payload no debe registrarse.

## Qué cubre la automatización

`src/lib/report.test.ts` valida sin red las reglas de `detectionWarnings()`:

- el resumen anuncia N hallazgos pero la lista tiene M (dígitos y números en palabras);
- uno o dos hallazgos sin observaciones del técnico;
- todos los hallazgos con el mismo nivel de riesgo;
- títulos duplicados;
- casos negativos: un solo riesgo real, resumen sin número, resumen coherente con la lista.

Para ejecutar solo estas pruebas:

```bash
npx vitest run src/lib/report.test.ts
```

## Matriz manual

Ejecuta cada caso en local o en el despliegue, con el mismo navegador y la misma foto. Anota `hallazgos` devueltos, nivel de cada uno, si aparece el banner *«Revisión sugerida antes de firmar»* y si el acta coincide con lo esperado.

| # | Caso | Entrada | Resultado esperado | Señal de problema |
|---|---|---|---|---|
| 1 | Varios riesgos **sin** observaciones | Foto con 4 riesgos; área rellena; observaciones vacías | 4 hallazgos | 2 hallazgos + banner por incoherencia resumen/lista |
| 2 | La misma foto **con** observaciones | Caso 1 + observación que nombra lo visible | 4 hallazgos; sin aviso de «pocos hallazgos» | Sigue devolviendo 2 |
| 3 | Riesgo pequeño o periférico | Cable suelto, guarda retirada o señal borrosa en una esquina | El riesgo se detecta | Falta en la lista |
| 4 | Un solo riesgo real | Foto limpia con un único cable en el suelo | 1 hallazgo y **sin** banner | Banner falso o hallazgos inventados |
| 5 | Resumen y lista incoherentes | Respuesta con «4 hallazgos» y 2 objetos | Banner de revisión | No aparece el banner |
| 6 | Todos con el mismo nivel | 3 hallazgos, todos «Moderado» | Aviso de nivel único | No aparece el aviso |
| 7 | Hallazgos duplicados | Dos objetos con el mismo título y distinto nivel | Aviso de duplicados | No aparece el aviso |
| 8 | Formato y condiciones | HEIC desde iPhone, foto vertical, poca luz, escena muy cargada | Misma imagen procesada; `MAX_SIDE = 1600` | Error de decodificación o pérdida de detalle |
| 9 | Respuesta envuelta / JSON frágil | Envoltorio `output`/`response`, texto alrededor del JSON, comillas escapadas | `normalizeInforme()` devuelve la lista completa | Error de lectura o hallazgos perdidos |
| 10 | Foto sin riesgos | Puesto ordenado y sin condiciones inseguras | 0–1 hallazgos justificados, sin inventar normativa | Hallazgos inventados |

## Pistas de análisis

Los chips *«Pistas para el análisis»* son opcionales. Se envían como `instrucciones_analisis` en el payload; **no** se guardan en `meta`, en el historial ni en el acta. Casos 1 y 2 deben probarse primero sin pistas y después marcando las categorías sospechosas para medir si cambia el resultado.

## Prompt de n8n

El flujo y su prompt se mantienen en la instancia privada de n8n: no se versionan ni se exportan a este repositorio. El ajuste para los casos 1–3 se aplica allí de forma manual: enumerar todos los riesgos visibles, no detenerse en dos, usar `instrucciones_analisis` como checklist, devolver tantos objetos como el resumen anuncie y no duplicar hallazgos.

## Criterio de cierre

- Los 10 casos ejecutados con resultado acorde a la columna de expectativa.
- `npm run check` en verde.
- Si un caso falla, documentar el caso, la foto utilizada (sin datos personales) y el informe devuelto antes de cambiar el prompt o el código.
