---
title: Guía de producto de Nexus — plataforma, soluciones y modelo comercial
estado: vigente (ADR 0007 aceptado el 2026-11-06)
fecha: 2026-11-06
verificado-contra: main @ fa2accc1
---

# Guía de producto de Nexus

> **NEXUS no vende módulos. NEXUS proporciona el sistema que necesita cada
> negocio para funcionar.**
>
> Nexus no le pide al usuario que registre lo que el propio sistema ya sabe:
> reconoce los eventos, conecta la información y automatiza lo posible. Al
> usuario le deja solo las decisiones, verificaciones y operaciones que
> realmente requieren su intervención.

**Cuatro reglas de diseño:**

- Las **soluciones** organizan la experiencia.
- Los **motores compartidos** ejecutan las capacidades.
- Las **extensiones** especializan la operación.
- La **plataforma** garantiza que todo funcione de forma segura y conectada.

Esta guía ordena la visión de producto y la contrasta con el código real.
Cada afirmación sobre «lo que existe» lleva su archivo como evidencia. Lo que
no tiene evidencia está marcado como **FALTANTE** o **por decidir**.

**Estado:** vigente. El [ADR 0007](../../decisions/arquitectura/0007-soluciones-sobre-plataforma.md)
se aceptó el 2026-11-06 junto con las decisiones D-1 a D-11 (§17). La
implementación avanza por etapas (§16).

---

## Índice

1. [Principio rector y las cinco pruebas](#1-principio-rector-y-las-cinco-pruebas)
2. [El cambio de decisión: de perfiles a soluciones](#2-el-cambio-de-decisión-de-perfiles-a-soluciones)
3. [Arquitectura en cuatro niveles sobre el `lib/` real](#3-arquitectura-en-cuatro-niveles-sobre-el-lib-real)
4. [Diagnóstico de los motores compartidos](#4-diagnóstico-de-los-motores-compartidos)
5. [El núcleo comercial: Commerce y Business centralizados](#5-el-núcleo-comercial-commerce-y-business-centralizados)
6. [Nexus Commerce](#6-nexus-commerce)
7. [Nexus Business](#7-nexus-business)
8. [Nexus Food](#8-nexus-food)
9. [Nexus Gym](#9-nexus-gym)
10. [Nexus Museum](#10-nexus-museum)
11. [Motores de plataforma: QR, Website, Connect, Comunicaciones](#11-motores-de-plataforma)
12. [Núcleo financiero: Payments, Treasury, Finance, Accounting e Invoicing](#12-núcleo-financiero) · [12b. Automatización](#12b-automatización-de-registrar-a-reconocer)
13. [Experiencia multidispositivo y roles](#13-experiencia-multidispositivo-y-roles)
14. [Onboarding](#14-onboarding)
15. [Modelo comercial, planes y entitlements](#15-modelo-comercial-planes-y-entitlements)
16. [Hoja de ruta](#16-hoja-de-ruta)
17. [Decisiones pendientes](#17-decisiones-pendientes)
18. [Relación con la documentación existente](#18-relación-con-la-documentación-existente)

---

## 1. Principio rector y las cinco pruebas

> Primero entendemos cómo funciona el negocio. Después definimos qué sistema
> necesita. Finalmente configuramos Nexus para adaptarse a su operación.

Tres compromisos:

1. **Especialización**: cada negocio recibe una experiencia diseñada para su operación.
2. **Integración**: procesos y herramientas trabajan conectados; el dato se registra una vez.
3. **Adaptabilidad**: funciona sin importar el tamaño, la infraestructura o el dispositivo.

**Las cinco pruebas de producto.** La arquitectura es correcta si las supera
todas sin duplicar el núcleo ni crear una aplicación nueva:

| # | Negocio | Pregunta |
|---|---|---|
| 1 | Cafetería | ¿Administra mesas, menú, pedidos, comandas y pagos **desde un celular**? |
| 2 | Gimnasio | ¿Administra miembros, membresías, pagos y accesos **sin ver** cocina, mesas ni comandas? |
| 3 | Merchandising | ¿Recibe interesados desde su web, cotiza, cobra, produce y entrega **con seguimiento por WhatsApp**? |
| 4 | Museo | ¿Administra visitantes, entradas, exposiciones y QR informativos **sin un sistema de restaurante adaptado**? |
| 5 | Vivero | ¿Administra productos, existencias, clientes, proveedores, ventas y entregas **sin encajar en una categoría incorrecta**? |

**Reglas de trabajo** (de la auditoría de realidad del producto):

- Antes de construir algo, responder: qué problema resuelve, quién lo necesita, qué trabajo manual elimina, qué proceso conecta, cómo se comprueba y qué valor aporta.
- Integridad antes que automatización: sin validaciones no hay operación (límites de monto y cantidad, estados válidos, anti-duplicados, trazabilidad).
- Lo visual se justifica por función. Una interfaz bonita no compensa una operación incorrecta.

---

## 2. El cambio de decisión: de perfiles a soluciones

### 2.1 Lo vigente hoy

[`docs/wiki/02-producto/distribucion-por-rubro.md`](../../wiki/02-producto/distribucion-por-rubro.md) establece:

- Un solo sistema; **el rubro es un perfil que recomienda pero no bloquea**.
- Cualquier negocio enciende cualquier función.
- **Nada se vende por separado**; todo está incluido en todos los planes.

El código lo refleja:

| Pieza | Evidencia |
|---|---|
| 18 rubros en lista cerrada (`gym`, `restaurant`, `retail`, `hardware_store`, `museum`, `general`…) | `lib/core/sectors/verticals.ts` |
| Receta por rubro: módulos encendidos al inicio + vocabulario | `VERTICAL_RECIPES` en `lib/core/sectors/catalog.ts` |
| 23 capacidades `base` o `specialized` con su menú | `lib/core/capabilities/registry.ts` |
| Encendido por negocio | modelo `TenantModule` (`prisma/schema/core/tenant.prisma`), página `/functions` |
| Factor de precio por rubro, todos en ×1 | `VERTICAL_FACTORS` en `lib/core/entitlements/catalog.ts` |

### 2.2 Lo que se propone

**Soluciones especializadas** sobre una plataforma común. Un gimnasio y un
museo no ven el mismo panel ni los mismos procesos. Tampoco hay cuatro
aplicaciones: hay una plataforma con motores compartidos y cinco soluciones
que los componen.

| Tema | Vigente | Propuesto |
|---|---|---|
| Unidad de producto | Módulo | **Solución** (Food, Gym, Museum, Commerce, Business) |
| Rol del rubro | Perfil que enciende módulos | **Contexto** dentro de una solución: vocabulario, plantillas, campos extra |
| Qué ve el usuario | Todo lo encendido | La navegación **de su solución**, más lo que su plan habilita |
| Encender funciones | Libre | Controlado por **entitlements**, y solo si es compatible con la solución |
| Precio | Todo incluido; módulos con precio en catálogo | **Plan base por solución** + capacidad de uso + servicios adicionales |

### 2.3 Cómo se reconcilia sin romper nada

- **Los 18 rubros se quedan** como puerta de entrada del registro. Cada uno se asigna a una solución (tabla abajo). Ningún dato se migra.
- **`TenantModule` se queda** como mecanismo de encendido. Lo que cambia es **quién decide**: la solución y el plan, no un interruptor libre.
- **El registro de capacidades se queda.** Se le agrega la pertenencia a una solución, que es la pieza «manifiesto de rubro» ya propuesta en la rama `feature/HU-arquitectura-core-rubros-01` (§6 de su documento).
- Para un caso que no encaja se usa **Nexus Business con configuración asistida**, en vez de forzar una categoría.

| Solución | Rubros actuales que agrupa |
|---|---|
| **Nexus Food** | `restaurant`, `hospitality` (en su parte de comida) |
| **Nexus Gym** | `gym`, `education` (academias con membresía) |
| **Nexus Museum** | `museum`, `events` (cuando es aforo y entradas) |
| **Nexus Commerce** | `retail`, `hardware_store`, merchandising, vivero, floristería |
| **Nexus Business** | `construction`, `carpentry`, `beauty`, `healthcare`, `mechanic`, `real_estate`, `tourism_agency`, `tour_guides`, `nautical_transport`, `general` |

> Turismo tiene modelos propios (`Departure`, `TourBooking` en
> `prisma/schema/industry/tourism/`) y construcción tiene un dominio grande
> (APU, presupuesto, bitácora). Ambos viven como **extensiones de Business**
> hasta que un cliente real justifique una solución propia (ver D-3).

---

## 3. Arquitectura en cuatro niveles sobre el `lib/` real

**No se propone mover carpetas.** La arquitectura V10 ya está terminada
([`arquitectura-objetivo.md`](../../wiki/03-arquitectura/arquitectura-objetivo.md),
[`reglas-dependencias.md`](../../wiki/03-arquitectura/reglas-dependencias.md)).
Los cuatro niveles se asignan a lo que existe:

| Nivel | Responsabilidad | Dónde vive hoy |
|---|---|---|
| **1 · Platform Foundation** | Identidad, tenant, permisos, auditoría, eventos, operaciones, archivos, planes y facturación de Nexus | `lib/foundation/`, `lib/core/{auth,tenancy,operations,events,files,entitlements,capabilities}`, `lib/platform/{billing,admin,team,accounts}` |
| **2 · Shared Business Engines** | CRM, Sales, Payments, Treasury, Finance, Accounting, Inventory, Documents, Operations, Projects, Automation, Integrations, Communication, Website y QR, Insights | `lib/core/parties`, `lib/business/{customers,catalog,inventory,sales,pos,purchasing,scheduling,store}`, `lib/domains/finance/{payments,accounting,receivables,tax}` |
| **3 · Domain Solutions** | Modelos y procesos de cada solución | `lib/industry/{gym,museum,construction,restaurants}` (`restaurants` está **vacío**) |
| **3b · Contextos y extensiones** | Turismo, construcción, belleza, mecánica, inmobiliaria, educación… Especializan una solución sin duplicar motores | `VERTICAL_RECIPES` (vocabulario y receta) + `lib/industry/construction`, `prisma/schema/industry/tourism` |
| **4 · Experience & Channels** | Paneles, QR, sitio, WhatsApp, API, MCP | `app/[tenant]/(app)/*`, `lib/business/presence`, `lib/platform/inbox`, `app/api/{v1,mcp,webhooks}`, `lib/integrations/*` |

**Reglas de dependencia** (amplían las vigentes):

1. Foundation no depende de ninguna solución.
2. Los motores compartidos no importan lógica de Food, Gym, Museum, Commerce ni Business.
3. Una solución consume motores; **nunca importa otra solución**.
4. Las integraciones externas entran por puertos y adaptadores (`lib/foundation/ports.ts`, `lib/integrations/providers/`).
5. La interfaz, la API, n8n y la IA **solo usan operaciones declaradas** (`lib/core/operations/`); nunca escriben tablas directamente.
6. Nexus funciona sin n8n.

> `solutions/` frente a `industry/`: el código de dominio sigue en
> `lib/industry/` (nombre vigente). «Solución» es el concepto de producto y
> no implica renombrar carpetas (ver D-2).

---

## 4. Diagnóstico de los motores compartidos

Leyenda: **EXISTE**, **INCOMPLETO**, **DESCONECTADO**, **FALTANTE**, **REFACTORIZAR**.

| Motor | Estado | Evidencia y hallazgo |
|---|---|---|
| Identidad, tenant, permisos | EXISTE | `lib/core/{auth,tenancy}`, `can()`, RLS (`@@rls`) en los modelos |
| Operaciones declaradas (API + MCP + eventos) | INCOMPLETO | `lib/core/operations/definitions/`: 6 operaciones, todas de lectura (`business.get_summary`, `customers.search`, `events.list`, `finance.get_summary`, `parties.search`, `sales.list_recent`). El contrato (`lib/core/operations/types.ts`) ya exige permiso y riesgo, y admite `idempotent` |
| Eventos y webhooks | EXISTE | `OutboxEvent`, `WebhookEndpoint`, `WebhookDelivery`; firma y protección SSRF en `lib/core/events/` |
| Clientes (CRM del negocio) | DESCONECTADO | `Customer` (`business/customers.prisma`) no tiene etapa, origen ni responsable. El formulario web crea `ContactLead` (`experience/site.prisma`), que nunca se convierte en `Customer` |
| CRM comercial | EXISTE, **pero es de Nexus** | `Lead`/`LeadActivity` (`platform/crm.prisma`, `lib/platform/crm/`) es el embudo para vender Nexus, no el CRM de los negocios |
| Terceros | EXISTE | `Party`/`PartyRole`; `Customer.partyId` enlaza |
| Catálogo y variantes | EXISTE | `Product`, `ProductVariant`, `PriceList`, `ProductBarcode` |
| Inventario | EXISTE | `StockLevel`, `StockMovement`, `Warehouse`, traslados y conteos |
| Pedidos | REFACTORIZAR | `StoreOrder` solo tiene estados de pago (`PENDING_PAYMENT`, `PAID`, `ABANDONED`, `CANCELED`), cliente en texto (`customerName`, `phone`) sin `customerId`, y ningún estado de preparación ni entrega. `/orders` es un `ModulePlaceholder`; los pedidos reales están en `/pedidos-tienda` |
| Cotizaciones y proyectos | INCOMPLETO, mal ubicado | `Quote`, `QuoteItem`, `Project` viven en `prisma/schema/industry/construction/`, pero `Customer` los usa en general y `/quotes` y `/projects` son de todos. Son motor compartido con ubicación de rubro |
| Dinero (Payments, Treasury, Accounting) | EXISTE con huecos | Detalle en §12.3 |
| Agenda | EXISTE | `Booking`, `lib/business/scheduling/` |
| WhatsApp de los negocios | FALTA (API) · EXISTE (manual) | El negocio solo tiene plantillas que abren `wa.me` (`/whatsapp`, `WhatsAppComposer`; la tarjeta en `/integrations` dice «Todavía no está conectado a la API de WhatsApp Business») |
| WhatsApp de Nexus | EXISTE | La bandeja con Meta Cloud API (`lib/platform/inbox/`, `app/admin/bandeja`, `app/api/webhooks/whatsapp`) es el soporte del **Operations Center de Nexus**, con credenciales globales. No sirve a los negocios: reutilizarla para ellos exige credenciales por tenant y unicidad con `tenantId` (`InboxConversation` es única por `(channel, contactHandle)`) |
| QR | INCOMPLETO | Generador puro en `lib/foundation/qr.ts`. `TrackedLink` (código, tenant, ruta, clics, activo) es el embrión de un QR dinámico, pero no tiene destino tipado ni asociación a mesa |
| Sitio web | EXISTE (básico) | `SiteConfig` (plantilla, textos, catálogo, mapa) + formulario → `ContactLead` |
| Conexiones externas | EXISTE | `ExternalConnection` por tenant, con credenciales cifradas; `ProviderEvent` para idempotencia |
| Automatización | FALTANTE | No hay motor de reglas ni ejecuciones; solo eventos salientes para que n8n los consuma |
| IA | FALTANTE | El MCP existe (`app/api/mcp`), pero no hay asistente con contexto del negocio |
| Descubrimiento | EXISTE (por uso) | `lib/core/capabilities/discovery/` sugiere funciones según señales de uso, no según el tipo de negocio |

---

## 5. El núcleo comercial: Commerce y Business centralizados

Commerce y Business **no son dos sistemas comerciales**. Comparten un mismo
embudo y se separan solo en lo que pasa después de cobrar:

```
CAPTACIÓN          RELACIÓN             ACUERDO          COBRO           EJECUCIÓN
Web · QR · WA  →  Contacto + lead  →  Cotización  →  Pago / anticipo  →  Commerce: pedido → producción → entrega
Formulario         (CRM 360)           aprobada        (money-service)      Business: proyecto → tareas → entregable
```

### 5.1 Lo que comparten (motor comercial único)

| Pieza | Base existente | Cambio necesario |
|---|---|---|
| **Contacto único** | `Customer` + `Party` | Agregar etapa (`prospecto` → `cliente` → `recurrente`), origen, responsable y consentimiento. Deduplicar por teléfono normalizado dentro del tenant |
| **Lead u oportunidad** | `ContactLead` (suelto) | Pasa a ser una oportunidad ligada al contacto: interés, valor estimado, próxima acción, estado. Un lead no es un cliente; no se duplica el registro al convertir |
| **Actividades** | `CustomerNote` | Tareas con fecha y responsable, llamadas y mensajes, todo en la línea de tiempo del contacto |
| **Cotización** | `Quote`, `QuoteItem` | Moverla conceptualmente a motor compartido; al aprobarse genera un pedido (Commerce) o un proyecto (Business) |
| **Cobro** | `PaymentIntent` + `money-service` | Ligar el cobro a la cotización o al pedido; anticipo y saldo; link, transferencia o efectivo |
| **Customer 360** | Ficha `/crm/[id]` | Una sola vista: conversaciones, oportunidades, cotizaciones, pedidos o proyectos, pagos y notas |
| **Captación** | Formulario del sitio | **Lead Capture API** para webs externas: clave pública por formulario, dominios permitidos, límite de solicitudes, anti-spam y consentimiento. La credencial privada nunca va al navegador |

### 5.2 En qué se diferencian

| Necesidad | Commerce | Business |
|---|---|---|
| Productos físicos | Central | Opcional |
| Inventario | Central | Opcional |
| Variantes (talla, color, material) | Central | No |
| Cotizaciones | Sí | Sí |
| Producción | Según negocio | Según negocio |
| Proyectos y tareas | Opcional | **Central** |
| Entregas o envíos | **Central** | Según negocio |
| Catálogo web | Productos | Servicios |
| Agenda | Opcional | Frecuente (citas, visitas) |
| CRM | Sí | Sí |

### 5.3 Reglas del bot comercial (para ambos)

- Solo responde con **precios autorizados**, catálogo vigente, preguntas frecuentes y condiciones cargadas en Nexus.
- **No inventa precios ni promete disponibilidad** que Nexus no haya confirmado.
- Las acciones sensibles se preparan, pero las aprueba una persona: crear una cotización con descuento, cancelar, reembolsar o enviar a una audiencia.

---

## 6. Nexus Commerce

**Para quién:** tiendas, merchandising, productos personalizados (pegatinas,
camisetas, tarjetas NFC, uniformes), ferreterías, viveros, floristerías.

### 6.1 Navegación planeada

```
NEXUS COMMERCE
├── Inicio          pedidos por estado · cobros pendientes · interesados nuevos · ventas del día
├── Interesados     leads de web, WhatsApp y QR; próxima acción; conversión a cliente
├── Clientes        Customer 360
├── Catálogo        productos · variantes · precios · disponibilidad
├── Inventario      existencias · movimientos · alertas de mínimo
├── Cotizaciones    borrador → enviada → aprobada / rechazada / vencida
├── Pedidos         recibido → confirmado → en producción → listo → enviado → entregado · cancelado
├── Producción      cola por pedido (cuando el negocio fabrica)
├── Entregas        dirección · transportadora · guía · confirmación
├── Pagos           links · transferencias por confirmar · efectivo · saldos
├── Website y tienda
├── WhatsApp        bandeja ligada al cliente y al pedido
├── Automatización  avisos por estado · seguimiento de interesados
└── Reportes
```

### 6.2 Recorrido de referencia (merchandising)

1. Una persona entra a la web, ve diseños y pide cotización.
2. Nexus crea o actualiza el **contacto** y abre un **lead** con su origen.
3. El equipo responde por **WhatsApp** desde la ficha del cliente.
4. Se arma la **cotización** con variantes y cantidades.
5. El cliente acepta; se genera un **link de pago** del anticipo o se registra la transferencia.
6. El pago confirmado convierte la cotización en **pedido**.
7. El pedido pasa por **producción** y **entrega**; cada cambio de estado notifica al cliente y al responsable.
8. El saldo se cobra al entregar; la venta queda en finanzas.

### 6.3 Modelos

| Modelo | Estado |
|---|---|
| Producto, variante, precio, inventario | EXISTE |
| Pedido con ciclo de cumplimiento | REFACTORIZAR `StoreOrder`: enlace a `Customer`, estados de cumplimiento separados del estado de pago, historial de cambios y transiciones validadas en el servidor |
| Orden de producción | FALTANTE (`ProductionOrder`: pedido, línea, etapa y responsable) |
| Entrega | FALTANTE (`Fulfillment`: dirección, método, guía y fecha) |
| Tienda externa | FALTANTE: conector WooCommerce y luego Shopify sobre `ExternalConnection` + `ProviderEvent`. **Dueño del dato**: la tienda manda en pedidos y Nexus en relaciones |

### 6.4 Lo que Commerce **no** construye

No construye un e-commerce completo: ni cupones avanzados, ni motor de
envíos, ni devoluciones complejas. La tienda actual (`lib/business/store/`)
se queda como **checkout ligero** para quien no tiene tienda. Quien ya tiene
una tienda **la conecta**: Nexus es el nodo, no la tienda.

### 6.5 Entitlements y límites típicos

`commerce.quotes`, `commerce.production`, `commerce.fulfillment`,
`store.checkout`, `connect.woocommerce`, `whatsapp.inbox`,
`automation.order_notifications` · límites: `staff_users`, `products`,
`orders_per_month`, `warehouses`.

---

## 7. Nexus Business

**Para quién:** agencias, empresas de servicios, construcción y carpintería,
estética, salud, talleres, inmobiliarias y turismo; cualquier operación
propia que no encaje en las otras soluciones.

### 7.1 Navegación planeada

```
NEXUS BUSINESS
├── Inicio            oportunidades abiertas · proyectos en curso · cobros · agenda de hoy
├── Leads             embudo por etapas · responsable · próxima acción
├── Clientes          Customer 360
├── Servicios         catálogo de servicios con precio autorizado
├── Cotizaciones
├── Proyectos         estado · avance · costos (construcción usa su extensión APU/presupuesto)
├── Tareas            asignadas a mí · vencidas · por proyecto
├── Agenda            citas y visitas (Booking)
├── Pagos             anticipos · hitos · saldos
├── Entregables       archivos y aprobaciones del cliente
├── Website y formularios
├── WhatsApp
├── Automatizaciones
└── Reportes
```

### 7.2 Recorrido de referencia (agencia de publicidad física)

```
Web → formulario de interés → CRM → contacto comercial → cotización
→ aprobación → pago (anticipo) → proyecto → producción / servicio → entrega → saldo
```

### 7.3 Modelos

| Modelo | Estado |
|---|---|
| Cotización y proyecto | EXISTE (en `industry/construction`; ver D-4) |
| Seguimiento de proyecto | EXISTE (`ProjectFollowUp`) |
| Tareas genéricas | FALTANTE (las de construcción son `LookaheadTask`, específicas del plan semanal) |
| Servicio como producto | EXISTE (`Product` admite servicio: `"SERVICE"` en `lib/business/store/`) |
| Citas | EXISTE (`Booking`) |
| Entregables con aprobación | FALTANTE |

### 7.4 Extensiones de contexto dentro de Business

- **Construcción y carpintería:** APU, presupuesto, bitácora y plan semanal (`lib/industry/construction/`, el dominio más maduro del repo).
- **Turismo:** salidas y reservas de tour (`Departure`, `TourBooking`).
- **Estética, salud y talleres:** agenda + ficha + servicios, con vocabulario propio (`VERTICAL_RECIPES.terms`).

---

## 8. Nexus Food

**Para quién:** restaurantes, cafeterías, heladerías, panaderías y bares.
Una heladería es Food con sabores, tamaños y adicionales configurados; no
necesita una solución propia.

**Estado real:** `lib/industry/restaurants/` está **vacío**. Existen una
investigación de producto (rama `feature/HU-nexus-restaurant-investigacion-01`,
`NexusRestaurant/`) y un plan de arquitectura (rama
`feature/HU-arquitectura-core-rubros-01`, §8.1 y decisiones D-4 a D-7).
Ninguna de las dos está fusionada.

### 8.1 Navegación planeada

```
NEXUS FOOD
├── Inicio
├── Servicio        plano de mesas · pedidos · comandas · cocina
├── Menú            productos · categorías · variantes y adicionales · disponibilidad
├── Clientes
├── Ventas y pagos  cuentas por mesa · división · propina
├── Inventario      insumos y recetas
├── Website y QR    menú digital · QR por mesa · QR de pedidos · QR personalizados
├── Marketing
├── Automatización
└── Configuración   estaciones de cocina · impuestos (impoconsumo)
```

### 8.2 Conceptos que no se mezclan

| Concepto | Qué es |
|---|---|
| **Mesa** (`Table`) | Lugar físico con su QR permanente |
| **Sesión de mesa** (`TableSession`) | Una ocupación: abre, recibe pedidos y cierra |
| **Pedido** | Lo que se pide en un momento; una sesión puede tener varios |
| **Comanda** (`KitchenTicket`) | La parte del pedido que va a una estación (cocina, bebidas, postres) |
| **Cuenta** | Lo que se cobra: conjunta o dividida entre comensales |

### 8.3 Recorrido desde la mesa

Escanear el QR → Nexus identifica el negocio y la mesa → menú vigente →
pedido con adicionales → se registra en la sesión → comandas por estación →
cambios de estado visibles para el cliente → pago y cierre de cuenta.

Canales que llegan a la comanda: QR de mesa, POS de mesero, mostrador,
pedido en línea y domicilio.

### 8.4 Decisiones heredadas del plan de la rama

- **D-4:** el pedido de restaurante es **propio**, con evento hacia ventas; no se extiende `StoreOrder`.
- **D-5:** el tiempo real de cocina empieza con sondeo corto, sin dependencias nuevas, y se mide antes de subirlo.
- **D-6:** las reservas de mesa usan la agenda compartida (`Booking`) con el recurso «mesa».
- **D-7:** impoconsumo y propina se validan con contador antes de la fase de cobro.

---

## 9. Nexus Gym

**Estado real:** es la solución **más completa**.

| Pieza | Evidencia |
|---|---|
| Membresías y vencimientos | `Membership` (`industry/gym/memberships.prisma`), `lib/industry/gym/memberships*.ts`, `/memberships` |
| Acceso con QR o NFC | `Customer.accessCode`, `Customer.nfcUid`, `/checkin` |
| Asistencia | `Attendance` |
| Registro público de clientes | `app/api/registro/[tenant]` (PR #152) |
| Clases y horarios | Agenda compartida (`Booking`) |

**Navegación planeada:** Inicio (actividad de hoy) · Miembros · Membresías y
vencimientos · Pagos · Acceso · Clases y horarios · Asistencia ·
Renovaciones · Comunicación con miembros.

**Lo que falta:** renovaciones automáticas con aviso por WhatsApp; ocultar lo
que no es de un gimnasio (prueba 2); y quitar el `if vertical === "gym"` de
`customer-fields.ts` (F4 del plan de la rama).

---

## 10. Nexus Museum

**Estado real:** existe la taquilla (`TicketSale` en
`industry/museum/ticketing.prisma`, `lib/industry/museum/`, `/tickets`).

**Navegación planeada:** Inicio (visitantes de hoy y aforo) · Entradas y
reservas · Exposiciones · Colecciones · Recorridos · Aforo · Personal ·
Pagos · QR informativos · Estadísticas de visitas.

**También existe:** aforo por franja (`capacityPerSlot`, `slotLoads` en
`lib/industry/museum/museum.ts`), tipos de entrada, anulación y reporte de
visitantes (`visitorReport`). El pago de la entrada entra por `money-service`
(`payTicketSale`).

**Lo que falta:** exposiciones, colecciones y obras; recorridos; QR
informativo por obra (usa el motor QR de §11.1); y reservas con pago
anticipado.

---

## 11. Motores de plataforma

### 11.1 Nexus QR: destinos dinámicos

El QR impreso contiene una dirección estable (`/q/{code}`). Nexus resuelve
el destino vigente y redirige con un **302**. El destino cambia sin
reimprimir.

| Campo | Para qué |
|---|---|
| `code` | Público, único y no adivinable |
| `tenantId` | Dueño |
| `kind` | `table`, `menu`, `order`, `review`, `member`, `artwork`, `custom` |
| `targetRef` | Mesa, obra o formulario asociado (conserva la identidad aunque cambie el destino) |
| `destination` | Destino tipado y **validado en el servidor**: solo rutas del propio tenant o dominios permitidos |
| `active`, `version`, escaneos | Estado, historial de cambios y analítica |

**Base existente:** `TrackedLink` ya tiene código, tenant, ruta, clics y
estado; `lib/foundation/qr.ts` ya genera el código. **Decisión D-5:** extender
`TrackedLink` o crear un modelo propio.

**Regla:** el QR de reseñas apunta al enlace oficial de Google y no filtra
solo reseñas positivas.

**Tres familias de QR que se conectan, pero no se confunden:**

| Familia | Qué hace | Vida útil | Ejemplo |
|---|---|---|---|
| **Operativo** | Identifica mesa, producto, menú, canal o reserva y abre su destino | Permanente; el destino cambia | QR de la mesa 5 |
| **De pago** | Inicia un cobro ligado a **una obligación concreta** (cuenta, pedido, cuota) | Temporal; vence con el `PaymentIntent` | QR de Wompi para la cuenta de la mesa 5 |
| **De identificación** | Reconoce a un cliente, miembro, entrada o tarjeta | Ligado a la persona o la entrada | `Customer.accessCode` del gimnasio |

Recorrido conectado en un restaurante: QR de mesa → pedido → cuenta → el
cliente pide pagar → **QR de pago** de esa cuenta → Wompi cobra → el webhook
confirma → Nexus aplica el pago a la cuenta y registra la transacción.

**Consumidores:** Food (mesa y menú), Gym (miembro), Museum (obra),
Commerce (producto y campaña), Business (formulario).

### 11.2 Nexus Website

No es un competidor de WordPress. Es la **presencia digital conectada al
sistema**: sitios, landings, formularios, catálogo, menú, reservas y tienda
ligera. El sitio sabe qué solución usa el negocio y muestra el contenido
adecuado.

- **Servicio Nexus Presencia:** el equipo construye la web y el SEO; se solicita desde la cuenta.
- **Web propia del cliente:** se conecta por Lead Capture API (§5.1) o por un conector de tienda.
- Base existente: `SiteConfig`, `lib/business/presence/`, `GoogleListing`, `Review`.

### 11.3 Nexus Connect

Capa de integración: WhatsApp, WooCommerce, Shopify, Wompi, n8n, API y
webhooks. Cada conector tiene su adaptador y contrato. Los datos externos
**pasan por operaciones de Nexus**, nunca por escritura directa.

Base existente: `ExternalConnection` (credenciales cifradas por tenant),
`ProviderEvent`, `lib/integrations/providers/registry.ts`, API v1 con
`ApiKey`, webhooks salientes firmados.

**Reglas para n8n:** usa API keys por tenant con alcance mínimo. Nexus guarda
el estado y n8n solo orquesta. Las ejecuciones se pueden reintentar y quedan
registradas.

### 11.4 Comunicaciones (WhatsApp)

| Paso | Qué |
|---|---|
| 1 | **WhatsApp por negocio (nuevo, no un arreglo):** credenciales por tenant en `ExternalConnection` (`kind: MESSAGING`) conectadas desde `/integrations`, webhook ruteado por `phone_number_id`, conversaciones con `tenantId` obligatorio. Se reutiliza el código de la bandeja de Nexus (`lib/platform/inbox/`) sin mezclar sus conversaciones con las de los negocios |
| 2 | Bandeja con asignación (mías, sin asignar, pendientes, cerradas), ligada al contacto y a sus pedidos |
| 3 | Plantillas aprobadas, ventana de 24 h, consentimiento y bajas |
| 4 | Notificaciones al personal por WhatsApp (pedido nuevo, pago recibido) |
| 5 | Bot del dueño (estado del negocio, solo lectura) y bot del cliente (estado del pedido, agendar) sobre operaciones declaradas |

Cada negocio conecta **su propio número**. Nexus administra la conexión,
pero no se apropia del número ni mezcla mensajes.

---

## 12. Núcleo financiero

Los pagos **no pertenecen** a Food, Gym ni Business. Son un motor compartido.
Cada solución aplica sus propias reglas de cobro sobre el mismo núcleo, y
ninguna construye su propio sistema financiero.

### 12.1 Dos dueños que no se mezclan

| Dueño | Qué | Dónde vive (ya separado) |
|---|---|---|
| **El negocio cliente** | Sus ventas, cobros, caja, cartera, contabilidad | `lib/business/sales/`, `lib/domains/finance/`, `prisma/schema/finance/` |
| **Nexus como SaaS** | Planes, suscripciones, cobros a clientes, morosidad | `lib/platform/billing/`, `Subscription`, `Charge`, `BillingPolicy`, `PlanSetting` |

### 12.2 Cinco motores, una responsabilidad cada uno

| Motor | Responsabilidad |
|---|---|
| **Payments** | Intenciones de pago, intentos, transacciones, métodos, proveedores, aplicación a obligaciones, devoluciones |
| **Treasury** | Cajas y turnos, cuentas bancarias y de pasarela, liquidaciones, saldos, conciliación |
| **Finance** | Ingresos y egresos, cartera (por cobrar), cuentas por pagar, gastos, flujo de caja, rentabilidad |
| **Accounting** | Plan de cuentas, asientos de doble partida, diario y mayor, periodos y cierres, reversiones |
| **Invoicing & Documents** | Facturas, recibos, notas crédito, cotizaciones, documentos electrónicos (DIAN) |

**El ciclo del dinero** que recorren juntos:

```
Operación → Obligación → Solicitud de pago → Recepción → Confirmación
(venta,      (cuánto,      (intent, link,      (efectivo,   (webhook, banco,
 pedido,      quién,        QR, referencia)     transf.,     validación
 membresía)   vence)                            pasarela)    humana)
→ Registro y aplicación → Liquidación y conciliación → Contabilidad e indicadores
```

| Concepto | Qué significa |
|---|---|
| **Venta** | El negocio vendió algo |
| **Pago** | El cliente entregó dinero para cubrir una obligación |
| **Liquidación** | El proveedor o el banco transfirió el dinero a su destino |

Una venta no significa que el dinero ya esté en el banco. Ejemplo ilustrativo:
una venta de $100.000 por Wompi con comisión de $3.000 deja un neto esperado
de $97.000, y la liquidación real queda pendiente hasta conciliarla. En
contabilidad: débito a «por cobrar a pasarela» y crédito a ingresos por
$100.000; débito a gasto por comisión y crédito a «por cobrar» por $3.000; al
liquidar, débito a banco y crédito a «por cobrar» por $97.000.

### 12.3 Diagnóstico contra el código

| Pieza | Estado | Evidencia y hallazgo |
|---|---|---|
| Obligación de pago | EXISTE parcial | `Invoice` con `paidTotal` (pagos parciales); cartera en `lib/domains/finance/receivables/`. Pedidos (`StoreOrder`) y membresías no generan obligación formal |
| Intención de pago | EXISTE | `PaymentIntent`: referencia única, vencimiento, canal, proveedor, `evidence`, `confirmedBy` |
| Estado «comprobante recibido» frente a «verificado» | FALTANTE | `IntentStatus` = `PENDING · PAID · EXPIRED · FAILED · CANCELED` (`lib/domains/finance/payments/intents.ts`). Un comprobante adjunto sigue en `PENDING`; no hay estado `EN_VERIFICACIÓN` |
| Pago | EXISTE | `Payment` con proveedor (`WOMPI · NEQUI · CASH · TRANSFER`), sesión de caja, recibo numerado; **no se borra, se anula** (`voidedAt`, `voidReason`) |
| Aplicación N:M (un pago a varias obligaciones, varios pagos a una) | FALTANTE | `Payment` apunta a **una** `invoiceId`, `membershipId` o `sourceId`. No hay `PaymentAllocation` |
| Intentos de pago | FALTANTE | No hay `PaymentAttempt`; un intento fallido no queda registrado aparte |
| Devoluciones | EXISTE | `PaymentRefund` ligado a la intención; `refundedTotal` |
| Webhooks firmados y deduplicados | EXISTE | Firma en `lib/integrations/providers/wompi.ts`; `ProviderEvent` único por `(tenantId, provider, externalId)` |
| Wompi con credenciales del negocio | EXISTE | `ExternalConnection` (`kind: PAYMENT`, credenciales cifradas) por negocio; se conecta y desconecta desde `/integrations` (`app/[tenant]/(app)/integrations/actions.ts`, HU-wompi-negocio-01). Sin conexión, el cobro queda manual (`pickGateway`); la pasarela `sandbox` no se ofrece en producción. Falta probar contra el sandbox real de Wompi con llaves del negocio |
| Cuentas por pagar | EXISTE | `SupplierInvoice`, `SupplierPayment`, `PurchaseOrder`, `Expense` |
| Devoluciones POS | EXISTE | `lib/business/pos/returns-db.ts`: nota crédito parcial o total, reingreso al inventario y reembolso desde la caja del turno |
| Documentos | EXISTE | `Invoice.kind`: `INVOICE`, `RECEIPT`, `CREDIT_NOTE`, `DEBIT_NOTE`; recibo con QR (`receipt-qr.ts`) |
| Conectores contables externos (Alegra, Siigo) | FALTA | No hay adaptador; entrarían por `lib/integrations/` como puerto contable (`accounting-port.ts` existe) |
| Comisiones y neto | FALTANTE | No hay campo ni regla de comisión en ningún modelo |
| Liquidaciones del proveedor | FALTANTE | No hay `ProviderSettlement` que agrupe transacciones |
| Cuentas bancarias y movimientos | FALTANTE | No hay `FinancialAccount` ni `BankTransaction`; no se importan extractos |
| Conciliación | EXISTE básica | `ReconciliationRun` por proveedor y día (esperado, reportado, diferencias) |
| Cajas, turnos y arqueo | EXISTE | `CashBox`, `CashSession` (`expectedAmount`, `countedAmount`, `difference`), `CashMovement` ligado a `paymentId` |
| Terminal POS | EXISTE | `PosTerminal`, `CashSession.terminalId` (sin integración con datáfono) |
| Contabilidad de doble partida | EXISTE | `JournalEntry` y `JournalLine`, `hash`, `reversalOfId`, PUC (`lib/domains/finance/accounting/puc.ts`) |
| Asientos automáticos por evento | EXISTE | `AccountingRule` única por `(tenantId, event)` |
| Periodos y cierres | EXISTE | `AccountingPeriod` (cierre y reapertura) |
| Centro de dinero | EXISTE | `money-service`: `recordIncome`, `payInvoice`, `receiveInvoicePayment`, `payTicketSale`, `sellProduct`, `voidPayment`, `voidExpense` (ADR 0006) |
| Fiscal (DIAN) | INCOMPLETO | Puerto `fiscal-port.ts`, `FiscalDocument`, `NumberingResolution`, `lib/integrations/einvoice/`; falta un proveedor autorizado validado |

**Conclusión:** el registro y la contabilidad son sólidos. Los huecos están
en lo que pasa **entre que el cliente paga y el dinero llega al banco**:
verificación, aplicación múltiple, comisiones, liquidaciones y bancos.

### 12.4 Métodos de pago

| Método | Flujo | Automatización posible | Lo que no se promete |
|---|---|---|---|
| **Efectivo** | Venta → efectivo → cambio → confirmar → pago + movimiento de caja → recibo | Total, dentro de la sesión de caja | Que el efectivo registrado sea el contado: el arqueo compara ambos |
| **Transferencia** | Datos bancarios + referencia → el cliente paga → adjunta comprobante → **pendiente de verificación** → el negocio confirma (o lo reconoce un extracto) → se aplica | Con extractos o integración bancaria autorizada | Un comprobante en imagen **no** prueba que el dinero llegó |
| **Pasarela (Wompi)** | Intent → link o QR → webhook firmado → confirmación → aplicación → comisión → liquidación | Alta: es la que más se automatiza | Comisiones exactas sin datos del proveedor |
| **Datáfono** | Venta → método «tarjeta» → conciliación posterior | Solo si el proveedor tiene API | Confirmación automática sin integración |

### 12.5 Reglas que no se negocian

1. Cada movimiento está aislado por tenant.
2. Los webhooks validan firma y se deduplican.
3. Los pagos son idempotentes.
4. Ningún pago se confirma solo por una captura de pantalla.
5. Los movimientos financieros no se borran: se corrigen con reversiones trazables.
6. Una transacción puede cubrir varias obligaciones, y una obligación puede recibir varios pagos.
7. Una liquidación puede agrupar muchas transacciones.
8. La contabilidad registra asientos equilibrados.
9. Toda operación tiene permiso, estado, validaciones y auditoría.
10. Ningún sistema externo accede directamente a la base de datos.

**Regla comercial:** no se vende como contabilidad legalmente completa hasta
validar la parte fiscal.

### 12.6 Cobro por solución

| Solución | Cómo cobra | Ejemplo |
|---|---|---|
| Food | Cuentas de mesa, pagos divididos y parciales, propina, cierre de turno | Cuenta de $180.000 pagada en tres partes distintas |
| Gym | Membresías, renovaciones, recurrencia si el proveedor lo permite | El pago confirmado extiende la vigencia del miembro |
| Museum | Entradas, reservas con pago anticipado, tarifas por grupo, devoluciones | El acceso se habilita al cumplirse el pago |
| Commerce | Pedidos con anticipo y saldo, varios canales, reembolsos | Pedido en línea pagado por pasarela que descuenta inventario según sus reglas |
| Business | Anticipos e hitos, cartera, facturación | 40 % al iniciar el proyecto y 60 % al entregar |

### 12.7 Una sola vista financiera

El negocio no entra a cinco módulos para saber qué pasó con su dinero. Una
vista unificada muestra ventas brutas, pagos recibidos, por cobrar,
comisiones, estado de cada canal (Wompi, caja, transferencias por verificar)
y conciliación pendiente. La vista es una sola, pero los límites entre los
motores se conservan por dentro.

## 12b. Automatización: de registrar a reconocer

| Evento | Comportamiento esperado |
|---|---|
| Venta POS confirmada | Crear la obligación y registrar el pago si se cobró |
| Wompi confirma un pago | Actualizar la transacción y aplicar el pago |
| Una membresía vence | Alertar y cambiar el estado según las reglas |
| Llega una liquidación | Relacionarla con sus transacciones |
| Se importa un extracto | Proponer conciliaciones |
| Un cliente paga una factura | Reducir la cartera automáticamente |
| Se devuelve una venta | Generar la devolución y sus movimientos |
| Se cierra una caja | Comparar el esperado con el contado |
| Un pedido cambia de estado | Avisar al cliente y al responsable por WhatsApp |
| Entra un lead | Crear o actualizar el contacto, asignar responsable y crear tarea |

**Modelo:** `evento` → `motor de reglas` (comprueba condiciones, permiso y
estado) → `acción autorizada` (registrar, actualizar, notificar, conciliar) →
`resultado + auditoría`.

Nexus guarda los datos, permisos, estados y reglas; n8n solo orquesta
integraciones externas. La IA interpreta, recomienda y detecta anomalías.
Las operaciones sensibles (devoluciones, iniciar cobros, modificar registros
financieros) exigen autorización según su riesgo.

Base existente: `OutboxEvent`, `AccountingRule` (ya es un motor de reglas
por evento, pero solo contable), webhooks firmados y cron
(`app/api/cron/`). **Falta:** reglas de negocio configurables, ejecuciones
registradas con reintento y aprobaciones.

---

## 13. Experiencia multidispositivo y roles

Nexus debe ser **mobile-first en operación**, no solo responsive.
Responsive adapta tamaños; mobile-first adapta las **tareas** a la forma en
que se trabaja desde un teléfono.

| Dispositivo | Para qué |
|---|---|
| Celular | Gestión rápida: pedidos, cobros, WhatsApp, avisos, disponibilidad, ventas del día |
| Tablet | POS, cocina, atención en sala, recepción |
| PC | Configuración completa, análisis, contabilidad |

**Roles con vistas propias:** propietario, administrador, cajero, mesero,
cocina, repartidor, recepción y vendedor. El mesero no ve contabilidad y
cocina no entra al CRM.

**Lo que ya obliga el repo:** pruebas en 320–1280 px, PWA sin datos privados
en caché, y componentes y tokens del sistema de diseño (ver `CLAUDE.md` y
`packages/brand/`).

**Lo que falta:** navegación móvil por solución y rol, recuperación de
operaciones con conexión inestable, y la pantalla de cocina para tablet.

---

## 14. Onboarding

```
Landing → Registro → Descubrimiento → Recomendación de solución → Configuración inicial
→ Equipo → Plan → Activación (abre el panel de su solución)
```

**Preguntas de descubrimiento:** ¿vendes productos, alimentos o servicios?
¿Atiendes en un local? ¿Manejas mesas o reservas? ¿Tienes inventario?
¿Recibes pedidos en línea? ¿Cuántas personas trabajan contigo? ¿Tienes
varias sedes?

Las respuestas recomiendan la solución y configuran el contexto. Si no
encaja, se ofrece **configuración asistida** con el equipo Nexus.

**Base existente:** el registro elige rubro (`SIGNUP_VERTICALS`) y aplica su
receta. El descubrimiento actual (`lib/core/capabilities/discovery/`)
sugiere funciones **por uso**, después del alta. **Falta:** el descubrimiento
**antes** del alta y la recomendación de solución.

---

## 15. Modelo comercial, planes y entitlements

### 15.1 Modelo

No se pone precio a cada función. El precio se compone de tres partes:

1. **Plan base por solución:** Food, Gym, Museum, Commerce o Business.
2. **Capacidad de uso:** usuarios, sedes, volumen y límites.
3. **Servicios e integraciones adicionales:** implementación, migración, web personalizada (Nexus Presencia), integraciones especiales, automatizaciones avanzadas y soporte especializado.

Ofertas para vender:

| Oferta | Qué incluye |
|---|---|
| **Nexus Presencia** (servicio) | Web, SEO y formularios conectados; los hace el equipo |
| **Nexus Operación** (suscripción) | La solución del negocio: CRM, pedidos o servicio, pagos, WhatsApp y automatizaciones |

Los precios no se inventan aquí: los define el equipo (Nicolás) y se
administran desde el panel.

### 15.2 Entitlements

```yaml
tenant: Heladería Central
solution: nexus-food
plan: professional
entitlements:
  qr.table_ordering: true
  kitchen.display: true
  crm.customer_management: true
  whatsapp.inbox: true
  advanced.analytics: false
limits:
  branches: 1
  staff_users: 5
  qr_tables: 20
```

**Límite de su papel:** los entitlements controlan **derechos de uso y
límites comerciales**. No definen la estructura de datos ni permiten activar
funciones incompatibles con la solución. La compatibilidad la decide la
solución y el derecho lo decide el plan.

### 15.3 Lo que ya existe y lo que falta

| Pieza | Estado | Evidencia |
|---|---|---|
| Planes configurables (Essential, Elite, Signature) | EXISTE | `PlanSetting`, `lib/core/entitlements/{catalog,pricing,settings}.ts` |
| Precio por módulo y descuentos | EXISTE | `MODULE_PRICES`, `moduleDiscountPct` |
| Límite de usuarios | EXISTE | `PlanSetting.maxUsers` |
| Medidores de consumo por periodo | EXISTE | `lib/core/entitlements/meters.ts`, `UsageCounter` |
| Suscripciones, cobro y morosidad | EXISTE | `Subscription`, `Charge`, `BillingPolicy` (recordatorios, gracia, aviso), `lib/platform/billing/` |
| Simulador de precios en el Operations Center | EXISTE | `pricing.ts` («lo usan el onboarding, el servidor y el simulador») |
| **Solución como eje del plan** | FALTANTE | Los planes son por nivel, no por solución |
| **Entitlements finos** (`qr.table_ordering`) | FALTANTE | Hoy la unidad es el módulo completo |
| **Límites por solución** (sedes, mesas, productos) | FALTANTE | Solo hay usuarios y medidores |
| Periodo de prueba | EXISTE | `SubscriptionStatus.TRIAL`, `lib/experience/onboarding/trial.ts` (aviso en la barra superior), `lib/platform/benefits/` |
| Suspensión y reactivación por política | INCOMPLETO | Existe el estado `SUSPENDED` y la morosidad (`dunning`); por verificar el efecto real sobre el acceso |

**Administración interna de Nexus** (Operations Center): crear planes,
asignar precios, definir límites, gestionar suscripciones y pruebas, ver
pagos, administrar renovaciones, y suspender o reactivar según la política.
La mayor parte del cobro ya existe; falta hacerlo **por solución** y con
**entitlements finos**.

---

## 16. Hoja de ruta

| Etapa | Contenido | Condición de salida |
|---|---|---|
Diez etapas; la 2, la 2c y la 2d corren en paralelo. Las fichas de las 51
historias (objetivo, problema, alcance, dependencias, criterios, pruebas,
riesgos, evidencia) están en el plan maestro de implementación, pestaña
«Historias».

| Etapa | Contenido | Condición de salida |
|---|---|---|
| **0 · Decisión** | ADR 0007 aceptado; respuestas a §17 (D-1 a D-11) | ADR en estado «Aceptada» con fecha y responsable |
| **1 · Integridad y base** | Validaciones P0 (montos, cantidades, estados, duplicados). Operaciones de escritura declaradas. Manifiesto de solución. Transición de negocios existentes | Ninguna escritura sin `can()`, `tenantId` y validación; menú por solución sin perder nada |
| **2 · Ciclo del dinero** (§12) | Wompi por negocio desde `/integrations`. Obligación formal. Estado «en verificación». Aplicación N:M. Intentos. Cuentas financieras y comisión. Liquidaciones. Extractos y conciliación. Vista financiera | Una venta recorre obligación → pago → aplicación → asiento sin duplicar; el neto de Wompi cuadra con la liquidación |
| **2c · Núcleo comercial** (§5) | Contacto único. Oportunidades. Actividades. Cotización compartida (depende de la obligación de la etapa 2). Customer 360 | La web y la tienda caen en una sola ficha; una cotización aprobada crea su obligación |
| **2d · Canales** (§11) | Lead Capture API. WhatsApp Business propio del negocio (capacidad nueva). Plantillas y avisos | Un formulario externo crea la oportunidad; dos negocios con el mismo contacto ven conversaciones separadas |
| **3 · Piloto Commerce** (D-1) | Pedido con cumplimiento, `/orders` real, producción, entregas, avisos por estado, navegación por rol, recorrido e2e | Prueba 3 completa con el negocio real de merchandising |
| **4 · Business y modelo comercial** | Tareas, entregables, pagos por hitos, contratos. Planes por solución y entitlements finos | Una agencia cobra 40 % / 60 %; un límite de plan bloquea con aviso |
| **4b · Food** | ADR y motor QR, mesas y sesiones, menú, pedido propio, comandas, cuentas divididas, QR de pago | Prueba 1 |
| **5 · Gym y Museum** | Gym: renovación con aviso automático y navegación propia. Museum: exposiciones, colecciones, reservas con pago y QR de obra (el aforo ya existe) | Pruebas 2 y 4 |
| **6 · Ecosistema inteligente** | Motor de automatización, bots, campañas, conectores de tienda y contables, onboarding con descubrimiento | Bot de consulta y avisos en producción con un cliente real |

Cada etapa se convierte en historias con `/nueva-funcionalidad`
(identificador, objetivo, estado actual, cambio, dependencias, criterios,
pruebas, riesgos y prioridad) en `docs/product/backlog/`.

### 16.1 Demo inmediata (merchandising)

Una demo no justifica saltarse la etapa 0. Lo que se puede mostrar **sin
deuda** con lo que ya existe:

- Sitio + formulario + tienda ligera: `SiteConfig`, `/sitio`, `/pedidos-tienda`.
- Link de pago y transferencia con comprobante: `PaymentIntent`.
- Aviso por WhatsApp con el enlace `wa.me` de un toque (lo que el negocio tiene hoy).
- Resumen del negocio por API (`business.get_summary`) llamado desde n8n con una API key.

Lo demás (cumplimiento de pedidos, contacto único, número propio) se
presenta como hoja de ruta, no como si ya existiera.

---

## 17. Decisiones (aceptadas el 2026-11-06)

Todas se aceptaron con su recomendación junto con el ADR 0007.

| ID | Pregunta | Opciones | Recomendación |
|---|---|---|---|
| **D-1** | ¿Qué solución es el piloto? | Food (visión original, investigación hecha, cero código) · Commerce (cliente real de merchandising, reutiliza más) | **Commerce**: hay un cliente real y casi todo su motor existe. Food después, con su plan ya escrito |
| **D-2** | ¿Renombrar `lib/industry/` a `lib/solutions/`? | Renombrar · Mantener | **Mantener.** «Solución» es concepto de producto; mover carpetas no aporta valor ahora (D-1 de la rama) |
| **D-3** | ¿Turismo y construcción son soluciones propias? | Propias · Extensiones de Business | **Extensiones de Business** hasta que un cliente lo justifique |
| **D-4** | ¿Dónde viven `Quote` y `Project`? | Siguen en `industry/construction` · Pasan a motor compartido | **Motor compartido** (los usan Commerce y Business); migración no destructiva |
| **D-5** | ¿QR dinámico sobre `TrackedLink` o modelo nuevo? | Extender · Modelo `QrCode` propio que reusa el contador | Por decidir en el ADR 0009, tras auditar los usos de `TrackedLink` |
| **D-6** | ¿Se elimina la venta por módulo? | Solo solución + límites · Solución + complementos | Solución + capacidad + servicios (§15.1); los complementos son servicios, no funciones bloqueadas |
| **D-7** | ¿Qué pasa con los negocios ya registrados? | Asignarles una solución por su rubro (§2.3) · Dejarlos en «todo incluido» | Asignación automática por rubro y revisión manual de los casos dudosos |
| **D-8** | ¿Cómo se aplica un pago a varias obligaciones? | Tabla `PaymentAllocation` · Partir el pago en varios `Payment` | **`PaymentAllocation`**: conserva un solo movimiento real de dinero |
| **D-9** | ¿Dónde viven cuentas bancarias y liquidaciones? | Extender `CashBox` · Modelo `FinancialAccount` aparte | **`FinancialAccount`** con tipo (caja, banco, pasarela); `CashBox` sigue siendo la caja física |
| **D-10** | ¿Cómo se registra la comisión? | En el `Payment` (bruto, comisión, neto) · Solo en la liquidación | Ambas: estimada al confirmar y real al liquidar, con ajuste contable de la diferencia |
| **D-11** | ¿Automation e Insights son áreas V10 nuevas? | Área propia en `lib/` · Submódulos de `core` (eventos, operaciones) y de `experience` | Submódulos mientras quepan; área propia solo si crecen (ADR 0007, tabla de correspondencia) |

---

## 18. Relación con la documentación existente

| Documento | Relación |
|---|---|
| [`wiki/02-producto/distribucion-por-rubro.md`](../../wiki/02-producto/distribucion-por-rubro.md) | **Queda reemplazado** cuando se apruebe el ADR de la etapa 0. Hasta entonces, sigue vigente |
| [`wiki/02-producto/vision-negocio-conectado.md`](../../wiki/02-producto/vision-negocio-conectado.md), [`mapa-de-capacidades.md`](../../wiki/02-producto/mapa-de-capacidades.md), [`hoja-de-ruta.md`](../../wiki/02-producto/hoja-de-ruta.md) | Revisar y alinear tras el ADR |
| [`wiki/03-arquitectura/`](../../wiki/03-arquitectura/) | Sigue vigente; esta guía no mueve carpetas |
| [`docs/nexus-architecture/`](../../nexus-architecture/) | Visión anterior (`product-vision.md`, `roadmap.md`…); consolidar aquí o archivar |
| [`wiki/04-modulos/capas/`](../../wiki/04-modulos/capas/) | Detalle por capa (I–XI); cada solución enlaza a sus capas |
| [`decisions/arquitectura/`](../../decisions/arquitectura/) (ADR 0001–0007) | 0001–0006 vigentes; 0007 aceptado el 2026-11-06. Por redactar: 0008 Payments y Treasury, 0009 motor QR, 0010 WhatsApp por negocio, 0011 Automation |
| Rama `feature/HU-arquitectura-core-rubros-01` | Su plan (anillos, manifiesto de rubro, D-1…D-8) es compatible y se integra como base técnica |
| Rama `feature/HU-nexus-restaurant-investigacion-01` | Insumo de Nexus Food |

### Documentos que se derivan de esta guía (cuando se aprueben)

```
docs/product/nexus-platform/
├── README.md                     ← esta guía
├── solutions/{COMMERCE,BUSINESS,FOOD,GYM,MUSEUM}.md
├── systems/{QR-ENGINE,CRM-CUSTOMER-360,NEXUS-CONNECT,WHATSAPP}.md
└── commercial/{ONBOARDING,PLANS-AND-ENTITLEMENTS}.md
```

Los ADR van en `docs/decisions/arquitectura/` (0007 en adelante), no aquí.
