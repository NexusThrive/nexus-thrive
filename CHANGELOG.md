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

## [v1.0.1] — 2026-10-21

### Corregido
- Prueba.
