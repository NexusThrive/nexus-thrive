# 01 · Inventario del producto

[← Índice](README.md) · Estados según la leyenda del [README](README.md#cómo-leer-este-artefacto).

Regla seguida: una funcionalidad cuenta como existente solo si se siguió desde la
pantalla hasta la escritura en base de datos (Server Action → capa `lib/*` →
`db.orm`). Las rutas son relativas a `/{slug}` salvo que se indique.

## 1. Superficie de la aplicación

| Superficie | Rutas | Puerta de acceso |
|---|---|---|
| Pública | `/`, `/pricing`, `/c/{code}`, `/r/{token}`, `/encuesta/{token}`, `/invitacion/{token}` | Sin sesión (o sesión opcional) |
| Autenticación | `/sign-in`, `/sign-up`, `/auth/callback` | Clerk |
| Onboarding | `/onboarding` (vigente), `/{slug}/onboarding` (clásico) | `app/onboarding/layout.tsx`, `app/[tenant]/layout.tsx` |
| NEXUS Business | `/{slug}/…` (22 páginas) | `app/[tenant]/layout.tsx` + `app/[tenant]/(app)/layout.tsx` |
| Operations Center | `/admin/…` (18 páginas, 2 route handlers) | `app/admin/layout.tsx` + `requireStaff(permiso)` por página y acción |
| API | `/api/files/{id}`, `/api/apu-images/{id}`, `/api/blob-upload`, `/api/webhooks/whatsapp`, `/api/webhooks/email` | Clerk o firma/secreto |

Cifras: 52 `page.tsx`, 7 `route.ts`, 20 `loading.tsx`, **0 `error.tsx`/`not-found.tsx`
propios** (los errores caen en las pantallas por defecto de Next).

Notas:
- `app/page.tsx` (landing) **nunca se renderiza**: `proxy.ts` redirige `/` a
  `/auth/callback` o `/sign-in`. La landing real vive en otro repositorio
  (`docs/V1-PROGRESO.md`).
- `/pricing` redirige a `/` mientras `SHOW_PRICING = false`.

## 2. NEXUS Business: módulos y funcionalidades

El menú sale de `lib/navigation/tenant-nav.ts` (`MODULE_NAV`), filtrado por las
filas activas de `TenantModule`. El nombre técnico es el valor del enum
`ModuleName` (`prisma/contract.prisma:159`).

| Visible | Técnico | Rutas | Operaciones reales | Datos | Estado | Limitaciones |
|---|---|---|---|---|---|---|
| Inicio | `dashboard` | `""` | KPIs de ingresos/gastos/saldo, clientes activos, actividad reciente, membresías, Presence | `Payment`, `Expense`, `Customer`, `Membership`, `PresenceScan` | **IMPLEMENTADO** (datos reales: `app/[tenant]/(app)/page.tsx:110`) | Un solo dashboard para todos los rubros; `VerticalSetting.dashboardTemplate` existe pero no se usa en el negocio |
| Clientes (Socios, Pacientes…) | `crm` | `/crm`, `/crm/{id}`, `/crm/{id}/carnet` | Alta/edición con foto y campos por rubro, búsqueda paginada, archivar/restaurar, borrado de archivados, notas, ficha 360° (pagos, membresías, línea de tiempo), código QR y NFC | `Customer`, `CustomerNote`, `Attachment` | **IMPLEMENTADO** | Borrado y archivo sin control de rol (cualquier miembro) |
| Finanzas | `finance` | `/finance` (pestañas) | Cobros con recibo consecutivo, anulación con motivo, gastos con soporte, caja menor (fondo, turno, vales, reposición, arqueo), escaneo de comprobante (OCR con `tesseract.js`) | `Payment`, `Expense`, `CashBox`, `CashSession`, `CashMovement`, `Attachment` | **IMPLEMENTADO** | Escrituras en varios pasos sin transacción ([DATA-01](technical-debt.md#data-01)) |
| Pagos | `payments` | `/payments` → redirige a `/finance?tab=cobros` | — | — | Alias de Finanzas | Duplica entrada en catálogo y precios |
| Recibo público | — | `/r/{token}` | Ver un recibo con QR, firmado con HMAC | `Payment` | **IMPLEMENTADO** | Firma truncada a 22 caracteres; comparación no constante |
| Catálogo / Inventario | `inventory` | `/inventory` | Productos, servicios, planes, entradas, tours (`ProductKind`), stock con movimientos, venta directa de **un** producto | `Product`, `StockMovement`, `Payment` | **IMPLEMENTADO** | No hay carrito ni POS multi-línea; venta no transaccional |
| Facturación | `billing` | `/billing`, `/billing/{id}` | Recibos y cuentas de cobro numerados con líneas, pagar (crea `Payment`), anular | `Invoice`, `InvoiceLine`, `Payment` | **IMPLEMENTADO** | No es factura electrónica DIAN; pagar dos veces a la vez puede duplicar el cobro |
| Agenda | `bookings` | `/bookings` | Calendario mes/semana/día, citas con responsable, cupo, choques, recordatorio por WhatsApp (`wa.me`) | `Booking` | **IMPLEMENTADO** | Recordatorio manual |
| Taquilla (solo museo) | `bookings` | `/tickets` | Venta por franja con aforo, grupos y colegios, pago y anulación, ajustes del museo, reporte de visitantes | `TicketSale`, `Product`, `Tenant.settings` | **IMPLEMENTADO** | Atado a `vertical = museum` |
| Salidas (turismo) | `bookings` | `/departures` | — | `Departure`, `TourBooking` | **SOLO ESQUEMA** — el menú enlaza una **ruta inexistente** (404) | Ver [ARCH-02](technical-debt.md#arch-02) |
| Membresías | `memberships` | `/memberships` | Crear, renovar, congelar, cancelar, recordatorio WhatsApp, cobro inicial opcional | `Membership`, `Payment` | **IMPLEMENTADO** | Doble registro de cobros (JSON + `Payment`); sin control de rol |
| Control de acceso (solo gym) | `memberships` | `/checkin` | Escaneo QR (cámara, `jsqr`), UID NFC, documento o manual; registra entradas permitidas, negadas y desconocidas | `Attendance`, `Customer.accessCode/nfcUid` | **IMPLEMENTADO** (lógica pura con pruebas) | El UID NFC se lee como texto (lector tipo teclado o Web NFC); `accessCode`/`nfcUid` sin índice único |
| Pedidos | `orders` | `/orders` | — | — | **SOLO UI** (`ModulePlaceholder`) | Se activa por defecto en `retail`, `restaurant`, `hardware_store`… |
| WhatsApp | `whatsapp` | `/whatsapp` | Plantillas y apertura de `wa.me` con el texto | `Customer` | **PARCIAL** | Sin API de WhatsApp Business del negocio |
| Obras / Proyectos | `quotes` | `/projects`, `/projects/{id}` (Ficha · Presupuesto · Cotizaciones · Lean · Bitácora · Informes) | Ciclo de obra completo, línea base, bloqueo, actas de avance | `Project*`, `Budget*`, `LookaheadTask`, `WeeklyCommitment`, `FieldLog*` | **IMPLEMENTADO** (con pruebas de integración) | Solo tiene sentido en construcción |
| Cotizaciones | `quotes` | `/quotes`, `/quotes/{id}`, `/quotes/{id}/print` | Carpetas por obra, versiones, seguimientos, impresión; cotizaciones heredadas | `Quote`, `QuoteItem`, `ProjectFollowUp` | **IMPLEMENTADO** | Mismo acoplamiento a construcción |
| Catálogo APU | `quotes` | `/catalog`, `/catalog/import` | Insumos, actividades, capítulos, fotos, importador del libro APU (hasta 20 MB vía Vercel Blob), historial de precios | `Apu*` | **IMPLEMENTADO** (pruebas con fixtures reales) | Aparece también en rubros no constructores |
| Presence Thrive | — (fuera del catálogo) | `/presence` | Puntaje de presencia digital, sondeo del sitio web, solicitud de web/redes al equipo | `PresenceScan`, `PresenceRequest` | **IMPLEMENTADO** | Sondeo sin protección SSRF ([SEC-09](security-audit.md#sec-09)) |
| Configuración | `settings` | `/settings` (Perfil, Módulos, Plan, Equipo, NFC, Zona de peligro) | Editar negocio, activar módulos, ver plan, invitar/retirar/cambiar rol, borrar el negocio | `Tenant`, `TenantModule`, `User`, `TenantInvite` | **IMPLEMENTADO** | El dueño puede activar módulos fuera de su plan |
| Notificaciones | — | barra superior | Avisos derivados (vencimientos, stock bajo, citas…) y descarte | `DismissedNotification` | **IMPLEMENTADO** | Calculadas al abrir; sin envío |

## 3. Operations Center (`/admin`)

Cada página llama a `getStaffContext()` y comprueba un permiso de
`lib/ops/permissions.ts`; cada acción usa `requireStaff(permiso)`.

| Sección | Ruta | Qué hace | Datos | Estado |
|---|---|---|---|---|
| Inicio ejecutivo | `/admin` | KPIs, prioridades, actividad | agregados | IMPLEMENTADO |
| Negocios | `/admin/negocios`, `/admin/negocios/{id}` | Alta de negocio, etapa comercial, responsable, contactos, módulos, suspensión, suplantación (Clerk actor tokens), borrado total | `Tenant`, `TenantModule`, `TenantContact` | IMPLEMENTADO |
| Onboarding | `/admin/onboarding` | Tablero de negocios en configuración | `Tenant` | IMPLEMENTADO |
| Equipo | `/admin/equipo` | Integrantes, roles con permisos, enlace de invitación de un solo uso, desvincular cuenta | `StaffMember`, `StaffRole`, `StaffInvite` | IMPLEMENTADO |
| CRM de prospectos | `/admin/crm` | Embudo de leads con actividades | `Lead`, `LeadActivity` | IMPLEMENTADO |
| Soporte | `/admin/soporte` | Tickets con SLA, mensajes, encuesta CSAT/NPS | `SupportTicket`, `TicketMessage`, `SatisfactionSurvey` | IMPLEMENTADO |
| Facturación | `/admin/facturacion` | Suscripciones, cobros por período con comprobante, política de avisos y suspensión | `Subscription`, `Charge`, `ChargeEvidence`, `BillingPolicy` | IMPLEMENTADO (cobro manual) |
| Bandeja | `/admin/bandeja` | Conversaciones WhatsApp/correo, respuesta, paso a ticket | `InboxConversation`, `InboxMessage` | PARCIAL (requiere claves de Meta/Resend; sin ellas, respuesta manual) |
| Satisfacción, Salud | `/admin/satisfaccion`, `/admin/salud` | Encuestas y salud de cuentas | derivados | IMPLEMENTADO |
| Planes y módulos | `/admin/planes` | Precios, módulos, rubros, tramos, simulador | `PlanSetting`, `ModuleSetting`, `VerticalSetting`, `CustomerTierSetting` | IMPLEMENTADO |
| Accesos | `/admin/beneficios` | Códigos PROMO/PAID, canje atómico | `BenefitCode`, `BenefitRedemption` | **VERIFICADO** (pruebas de integración de concurrencia) |
| Presence | `/admin/presence` | Solicitudes de sitio, reanálisis | `PresenceRequest`, `PresenceScan` | IMPLEMENTADO |
| Auditoría | `/admin/auditoria` | Bitácora de acciones del panel | `AuditLog` | IMPLEMENTADO (solo acciones del panel) |
| Exportación | `/admin/export` | CSV de negocios | — | IMPLEMENTADO |

## 4. Capacidades de la visión que NO existen

| Capacidad (visión) | Hallazgo |
|---|---|
| POS con carrito, descuentos, varios medios | NO ENCONTRADO (solo venta de un producto, `inventory/actions.ts:72`) |
| Compras y proveedores | NO ENCONTRADO (solo `Expense.supplier` texto) |
| Factura electrónica DIAN | PLANIFICADO (`Invoice` lo dice en su comentario) |
| Pagos en línea (Wompi) | PLANIFICADO (`IDEAS-E-IMPLEMENTACIONES-IMPORTANTES.md` §3); `WOMPI` existe solo como valor de enum |
| Automatizaciones configurables / motor de eventos | NO ENCONTRADO (solo `.docs/capas/I-…/05-Motor-de-Eventos-y-Webhooks`) |
| Integraciones por negocio (WhatsApp Business, Meta) | PARCIAL: variables `META_APP_ID`, `META_CONFIG_ID` en `.env.produccion`, sin flujo |
| Reportes configurables | PARCIAL: informes de construcción y reporte de visitantes; no hay módulo de reportes genérico |
| Multiempresa para asesores/contadores | NO ENCONTRADO (no hay selector de negocio ni rol de asesor externo) |
| Tareas programadas (cron) | NO ENCONTRADO (los vencimientos se calculan al leer) |

## 5. Elementos duplicados o huérfanos

| Elemento | Evidencia |
|---|---|
| Dos wizards de onboarding | `app/onboarding/*` (vigente) y `app/[tenant]/onboarding/*` (clásico, aún accesible) |
| Dos motores de precios | `lib/plans/*` (base de datos) y `lib/pricing/*` (estático + `localStorage`, usado por `/pricing`) |
| Ruta del menú sin página | `/departures` en `lib/navigation/tenant-nav.ts:53` |
| Landing inaccesible | `app/page.tsx` vs `proxy.ts:46` |
| Cotizaciones heredadas | `app/[tenant]/(app)/quotes/_components/legacy-quotes.tsx` |
| Modelos sin uso funcional | `Departure`, `TourBooking` (solo en `lib/tenant-deletion.ts`) |
| Rol `STAFF` heredado | No se puede asignar (`lib/business/roles.ts:8`) pero las reglas de construcción aún lo usan |

Siguiente: [user-journey.md](user-journey.md).
