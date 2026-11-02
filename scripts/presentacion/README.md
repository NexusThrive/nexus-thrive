# Presentación en video de NEXUS (PC y móvil, 1 minuto cada uno)

Videos listos en `~/Videos/nexus-presentacion/`:

| Archivo | Formato | Duración |
|---|---|---|
| `nexus-presentacion-pc.mp4` | 1280×720 | 60 s |
| `nexus-presentacion-movil.mp4` | 1080×1920 vertical (teléfono de 390×844 centrado, con marco) | 60 s |

Recorrido de ambos: intro de carga (la N) → inicio y primeros pasos → registrar un socio → cobrar con comprobante →
el inicio se actualiza → búsqueda → ayuda (PC) / cambio de sección y «Más» (móvil) → cierre «NEXUS THRIVE».

## Cómo se hicieron

[Recordly](https://github.com/webadderallorg/Recordly) es una app de escritorio con interfaz gráfica, sin línea de comandos
ni modo automático, así que las grabaciones en bruto las hace Playwright (video del navegador con un cursor y subtítulos
dibujados en pantalla) y Recordly queda para el acabado (fondo, zoom, bordes, exportar).

1. `node scripts/presentacion/sesion-demo.mjs <carpeta>`: crea el usuario de demostración en la instancia de **desarrollo**
   de Clerk (API de backend, sin pasar por el desafío anti-bots del registro) y guarda la sesión en `<carpeta>/estado.json`.
2. `node scripts/presentacion/crear-negocio.mjs <carpeta> <enlace> [nombre]`: recorre el onboarding real y crea un negocio
   limpio (cada toma consume un negocio, porque el guion crea un socio y un cobro).
3. `SLUG=<enlace> node scripts/presentacion/grabar-pc.mjs <carpeta> <carpeta-videos>` y
   `node scripts/presentacion/grabar-movil.mjs <carpeta> <carpeta-videos> <enlace>`: graban (servidor de desarrollo en
   `http://localhost:3001`, o `BASE=...`).
4. PC: `node scripts/presentacion/exportar.mjs <carpeta-videos> pc <salida.mp4>`: recorta la espera inicial, ajusta a
   60 s y codifica en H.264.
   Móvil: `node scripts/presentacion/exportar-movil.mjs <carpeta-de-grabación> <salida.mp4>`: la grabación móvil son cuadros
   JPEG a 975×2110 (captura por protocolo con `--force-device-scale-factor`, porque el video de Playwright deja la pantalla
   pequeña en un lienzo gris); los monta en 1080×1920 con el teléfono centrado.

## Acabado en Recordly

Abre cada `.mp4` con «Open existing recordings». Los videos ya traen el cursor y los subtítulos, y Recordly no sugiere zooms
automáticos en archivos importados (esas sugerencias salen de la actividad del cursor que él mismo graba), así que los
zooms se añaden a mano. Momentos sugeridos (± 2 s):

**PC:** 0:08 círculo «!» y primeros pasos · 0:13–0:19 formulario de socio · 0:24 teclado de cobro · 0:42 comprobante ·
0:48 tarjetas de ingresos · 0:52 búsqueda · 0:55 centro de ayuda.

**Móvil:** 0:06 círculo «!» · 0:12 hoja «Crear» · 0:22 teclado de cobro · 0:33 comprobante · 0:40 tarjetas · 0:44 búsqueda en
la barra · 0:52 «Más».

Fondo sugerido: degradado negro con oro (`#0a0a0a` → `#d4af37`), esquinas redondeadas y sombra suave.
