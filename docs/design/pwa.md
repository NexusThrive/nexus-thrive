# PWA: instalación, caché y límites

Estado (octubre 2026): instalable; **no** funciona sin conexión. Los datos del
negocio viven en el servidor y la sesión es de Clerk, así que sin red solo se
muestra una página que lo explica.

## Qué hay

| Pieza | Archivo |
|---|---|
| Manifiesto (`start_url` `/`, `standalone`, iconos 192/512/maskable) | `app/manifest.ts` |
| Iconos (generados desde `app/icon.svg`) | `public/icons/` |
| Service worker | `public/sw.js` (cabecera sin caché en `next.config.ts`) |
| Página sin conexión | `public/offline.html` (HTML estático, sin Clerk ni JS de la app) |
| Registro, instalación, aviso de versión | `components/providers/pwa.tsx` |
| Color de tema, `viewport-fit=cover`, iconos de Apple | `app/layout.tsx` |

## Política de caché (no se cambia sin revisar privacidad)

1. **Se cachea solo lo público e inmutable:** `/_next/static/*`, `/icons/*` y
   `offline.html`.
2. **Nunca** documentos HTML, datos RSC, server actions, `/api` ni Clerk. Son
   respuestas de una sesión: cachearlas dejaría datos de una persona al
   alcance de la siguiente en el mismo dispositivo.
3. Las navegaciones van a la red; si falla, `offline.html`.
4. La versión nueva del service worker **espera**: aparece «Hay una versión
   nueva» y se aplica al pulsar «Actualizar» (recargar solo borraría un
   formulario a medias). Cada despliegue cambia los archivos de `_next/static`,
   así que el worker no sirve código viejo con HTML nuevo: el HTML siempre
   viene de la red.
5. Subir `VERSION` en `sw.js` borra las cachés anteriores al activarse.
6. El worker se registra solo en producción.

## Por qué no Serwist

Serwist añade una dependencia y un paso de compilación para generar la lista
de precaché y rutas de datos. Con la política anterior (nada de datos, solo
estáticos con nombre con hash) bastan ~60 líneas auditables. Si algún día se
quiere offline de verdad (p. ej. cobros en cola), se reevalúa Serwist junto con
una estrategia de datos cifrados y borrado al cerrar sesión; no se hace antes.

## Instalación por plataforma (lo que se espera; ver «Pruebas»)

| Plataforma | Cómo |
|---|---|
| Chrome/Edge escritorio y Android | Aparece «Instalar NEXUS» en la paleta (Ctrl K) y el icono de instalar de la barra de direcciones |
| Safari iOS / iPadOS | No existe el evento de instalación: Compartir → «Añadir a pantalla de inicio». Los iconos y el color vienen de `appleWebApp` |
| Safari macOS | Archivo → «Añadir al Dock» |

## Pruebas

Verificado en este repositorio: tipos, lint, 872 pruebas unitarias, Storybook
y Playwright+axe sobre el catálogo (incluye `UpdateNotice`).

**Pendiente** (requiere servidor de producción con HTTPS y dispositivos): build
de producción, Lighthouse PWA, instalación real en Chrome, Android y iOS, y
flujo de actualización del worker. Hasta hacerlo no se afirma que instale.
