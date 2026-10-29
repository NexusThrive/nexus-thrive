# Changelog

Todas las versiones de NEXUS THRIVE. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado es
[SemVer](https://semver.org/lang/es/).

- **MAJOR** (v2.0.0): algo que rompe — se cambia el modelo de datos de forma
  incompatible o el modelo de acceso (códigos, planes, precios).
- **MINOR** (v1.1.0): funcionalidad nueva hacia adelante (un módulo, un flujo).
- **PATCH** (v1.0.1): corrección de errores, texto o seguridad. Sin cambiar
  el modelo ni el flujo.

El proceso completo (ramas, despliegue, SQL, qué hacer si producción está
rota) está en [`docs/VERSIONADO.md`](docs/VERSIONADO.md).

---

## [v1.0.0] — 2026-10-20 · V1 piloto interno

Primera versión que se entrega. Es un **piloto interno**: NEXUS entra por un
código de acceso y el equipo administra a mano los planes y la vigencia de
cada negocio (todavía no hay cobro automático).

### Acceso y planes

- Motor de códigos de acceso con dos tipos: **PROMO** (regalo/promoción, la
  persona ve "N días gratis") y **PAID** (acceso pagado confirmado por
  NEXUS, la persona ve "Cuenta NEXUS activada"). Un solo motor, un solo
  panel.
- QR fijo de las tarjetas impresas: `ELITE30` (promo, ilimitado). El código
  nunca cambia; desde el panel se pausa, activa y edita (plan, días, usos,
  vencimiento).
- Canje **atómico**: un código de un solo uso no se puede regalar dos veces,
  ni con dos peticiones simultáneas.
- Al vencer el acceso, el negocio vuelve al plan Essential (gratis).
- Panel **Accesos** (`/admin/beneficios`): emitir acceso pagado (1 uso, con
  los días pagados), crear promos, ver el QR, pausar/activar y editar.
- Auditoría de altas, cambios y canjes.

### Onboarding

- Sin precios a la vista (interruptor `SHOW_PRICING`): tres caminos —
  **código de acceso**, **coordinar el pago por WhatsApp** (planes sin
  precio, con mensaje prellenado) o **probar gratis** con Essential.
- El servidor decide el plan y los módulos: nunca los acepta del navegador.
- Rate limit en la validación de códigos y una cuenta de Clerk = un negocio.
- Aviso claro (con reintento y contacto) si Clerk no monta el formulario, en
  vez de una columna en blanco.

### Módulos del negocio

Finanzas y caja menor real; clientes y equipo; agenda; inventario;
facturación; membresías y reservas; Presence Thrive; vertical de
construcción completa (catálogo APU con importador, presupuesto, cotización
al cliente, planificación Lean, bitácora, informes).

### Operations Center

Negocios, equipo y roles, clientes, CRM, soporte, finanzas, facturación,
bandeja, satisfacción, salud, precios y catálogo, auditoría y Accesos.

### Correcciones

- La siembra del catálogo comercial ya no falla cuando dos peticiones
  llegan a la vez (leer + insertar dejaba una ventana de clave duplicada).
- Los enlaces públicos (QR de tarjetas, recibos, cotizaciones) se arman con
  el dominio real de la petición, no con `localhost`.

### Documentación

- `docs/clerk-produccion.md`: qué debe coincidir al cambiar de dominio.
- `docs/prod-sql/00-ORDEN.md`: orden del SQL de producción.
- `.env.produccion`: variables de Vercel con valores sugeridos.

[Unreleased]: https://github.com/NexusThrive/nexus-thrive/compare/v1.0.0...HEAD
[v1.0.0]: https://github.com/NexusThrive/nexus-thrive/releases/tag/v1.0.0

---

## [No publicado] — El equipo de NEXUS entra al panel, no a crear negocios

### Corregido
- **Los integrantes del equipo ya no caen en "crear un negocio"** al
  registrarse. Pasaba porque, tras registrarse, la app iba a "/" y el proxy
  la devolvía al formulario de acceso (donde era fácil crear una segunda
  cuenta de Clerk); y porque el enlace con la ficha del equipo se saltaba en
  silencio si la ficha estaba **pausada** o ya **vinculada a otra cuenta**.
  Ahora:
  - el registro y el acceso con sesión van a una sola puerta (`/auth/callback`),
    que decide: equipo → panel, invitación de negocio → su negocio, nuevo →
    onboarding;
  - si el correo está en el equipo pero no puede entrar, se muestra un aviso
    que explica qué hacer, en vez de mandarlo al onboarding;
  - el onboarding de un integrante del equipo va al panel (o al aviso si su
    acceso está en pausa);
  - el enlace por correo busca la ficha sin distinguir mayúsculas y queda
    auditado.
- Nueva acción **"Desvincular cuenta"** en *Operaciones Center → Equipo*:
  suelta la cuenta de Clerk enganchada, para el caso de quien se registró con
  otra cuenta.

### Añadido
- `IDEAS-E-IMPLEMENTACIONES-IMPORTES.md` en la raíz: la lista de ideas e
  implementaciones importantes, empezando por la **invitación al equipo por
  correo** (que es lo que evita este tipo de lío).
- Pruebas de integración del enlace con el equipo: ficha pausada, ficha
  vinculada a otra cuenta y desvinculación.

### Datos
- Limpiados en producción los dos negocios que se crearon por error al
  registrarse el equipo (`Hshshdhs` y `Electricidad`, con sus módulos y
  usuarios). El script queda en la carpeta local de SQL de producción, como
  marca la convención del repo para los scripts de limpieza.

---

## [No publicado] — Control de acceso: intentos y tarjetas

### Añadido
- **El QR se lee con la cámara en cualquier teléfono**: si el navegador no
  tiene `BarcodeDetector` (Safari en iPhone, Firefox), el lector decodifica
  con jsQR sobre la imagen de la cámara. El botón "Leer con la cámara"
  aparece siempre que haya cámara.
- Los escaneos que **no corresponden a ningún socio** quedan registrados
  (con lo escaneado). Antes se perdían y no había forma de ver que alguien
  probaba códigos o clonaba tarjetas. En el panel del gym sale el contador
  **"Códigos desconocidos"**.
- Freno a la fuerza bruta en la puerta: quien pasa de 120 escaneos por
  minuto recibe "Demasiados escaneos seguidos".
- Guía del sistema de tarjetas: `docs/gym-acceso-nfc.md`.

### Cambiado
- Sin el aviso de "hydration mismatch" cuando un gestor de contraseñas
  (Proton Pass, 1Password, Bitwarden) inyecta atributos en el DOM: se silencia
  en los contenedores de la ficha 360, del control de acceso y de la barra
  superior (`AppTopbar`).
- El botón **"Leer tarjeta con este teléfono"** (NFC) solo aparece donde
  existe Web NFC (Chrome con Android). En iPhone y Firefox no se muestra, y
  el panel explica que el camino universal es el QR con la cámara.
- La ficha 360 explica **qué es el número de serie de la etiqueta** y que en
  iOS hay que leerlo con una app de NFC.
- La nota de que el QR es personal y se puede rotar con "Nuevo".
