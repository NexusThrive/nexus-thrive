# 01 · Arquitectura observada

## Stack

| Capa | Hallazgo | Evidencia |
|---|---|---|
| Framework | Next.js con Turbopack (chunks `turbopack-*.js`, rutas `/_next/static/immutable/`) | **Observado**: HTML y cabecera `x-powered-by: Next.js` |
| Hosting | Vercel (`server: Vercel`, `x-vercel-id`, región `iad1`) | **Observado** |
| Render | App Router con RSC: `vary: rsc, next-router-state-tree, …` | **Observado** |
| Autenticación | **better-auth** con sesión por cookie | **Observado**: `/api/auth/get-session` |
| Suscripción | Stripe | **Soporte** (`/soporte/plan-y-pagos`) |
| Cobros del restaurante | Mercado Pago (Checkout y terminales Point) | **Soporte** |
| Alta del negocio | Google Maps (Places) | **Soporte** |
| Mensajería | WhatsApp Business | **Soporte** |
| Facturación | CFDI 4.0 (México) | **Soporte** |
| Reservas comerciales | Widget en `link.colegastudio.com/widget/bookings/…` (patrón de CRM de terceros) | **Observado** el enlace; el proveedor es **Inferido** |

## Dominios y superficies

| Host / ruta | Para qué | Quién entra |
|---|---|---|
| `menus.colegastudio.com/` | Landing, funciones, precios, soporte | Público |
| `menus.colegastudio.com/login`, `/signup`, `/forgot-password` | Acceso | Público |
| `menus.colegastudio.com/app/*` | **Panel de administración** (71 pantallas visitadas) | Sesión + rol |
| `menus.colegastudio.com/pos` | **Caja web**: vincula un dispositivo con código de 6 caracteres | Dispositivo aprobado + PIN |
| `menudigital.colegastudio.com/<slug>` | **Menú público** por sucursal; con `/mesa/<código>` para el QR de mesa | Público |
| `…/soporte/*` | Documentación (≈45 páginas) | Público |
| Dominio propio | Menú público bajo el dominio del cliente (plan Escala) | Público |

El slug del menú público se crea una sola vez y **nunca cambia** (Soporte).

## Autenticación y sesión

- Cookie `__Secure-better-auth.session_token`: `HttpOnly`, `Secure`, `SameSite=Lax`
  (**Observado** en la configuración usada; el valor tiene forma `token.firma`).
- `GET /api/auth/get-session` devuelve la sesión con caducidad a **7 días**,
  `userId`, `ipAddress`, `userAgent` y un `activeRestaurantId`: la sesión ya
  recuerda **qué restaurante está activo** (**Observado**, solo claves).
- Verificación en dos pasos disponible (**Soporte**).
- Dos mundos de identidad separados (**Soporte**): el **panel** entra con
  correo y contraseña; la **caja** entra con nombre y **PIN** desde un
  dispositivo ya aprobado, sin sesión de panel.

## Cabeceras de seguridad (página `/login`)

| Cabecera | Valor |
|---|---|
| `strict-transport-security` | `max-age=63072000; includeSubDomains` |
| `x-frame-options` / CSP | `DENY` · `frame-ancestors 'none'; object-src 'none'; base-uri 'self'` |
| `x-content-type-options` | `nosniff` |
| `referrer-policy` | `strict-origin-when-cross-origin` |
| `permissions-policy` | `camera=(self), microphone=(), geolocation=(), payment=(), usb=()` |
| `cache-control` | `private, no-cache, no-store, max-age=0, must-revalidate` |

La CSP **no restringe** `script-src` (solo `frame-ancestors`, `object-src`,
`base-uri`). No se comparó con la política de Nexus.

## Forma de las llamadas de red

Durante el recorrido (46 rutas distintas) **todas** las peticiones `fetch/xhr`
fueron `POST` a la propia ruta de la página con `content-type: text/x-component`
(**Observado**). Ese es el patrón de las **Server Actions de Next.js**
(**Inferido**: no se leyeron cabeceras ni cuerpos).

Consecuencias:

1. **No hay API REST/OpenAPI que consumir.** Las acciones no tienen contrato
   público ni versión; cambian con cada despliegue.
2. La única API pública vista es la de autenticación (`/api/auth/*`).
3. Cualquier «integración» con Colega Menus pasaría por scraping de una
   interfaz privada → frágil y fuera de sus términos. **No se recomienda.**
4. Lo que sí se aprende es el **modelo**: qué estados, qué reglas, qué eventos
   (documento 06).

## Tiempo real

El soporte afirma que pedidos de la Tienda, mesas, avisos del QR y la pausa de
la Tienda llegan a la caja **sin recargar**, y que un menú abierto por un
comensal se actualiza solo «en unos segundos» (**Soporte**). No se observó el
canal (SSE, WebSocket o *polling*): **sin determinar**.

## Offline

La caja es una **PWA instalable** que guarda una copia local y puede vender
hasta **24 horas** sin conexión, con folios temporales y una llave de
idempotencia por venta; el servidor recalcula al sincronizar (**Soporte**).
El mecanismo completo está en el documento 04, §Caja sin internet.
