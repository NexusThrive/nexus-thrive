# Nexus Thrive · Blueprint de producto y experiencia (ampliación)

Complementa `blueprint-experiencia-nexus.md` (Design System, navegación, responsive, UX Writing, benchmark), que se conserva íntegro.
Fecha: 2026-11-01 · Sin cambios en código, ramas ni PR.

Etiquetas: **[H]** hecho observado en el repo · **[A]** decisión aprobada por ti · **[Y]** hipótesis · **[R]** recomendación · **[F]** capacidad futura (no existe).

> **Idea rectora [A]:** Nexus no es una colección de módulos bonitos; es un sistema conectado que entiende cómo funciona un negocio.
> Tres capas que avanzan juntas: **Design System** (se ve y se comporta igual) · **Arquitectura funcional** (todo se conecta) · **Experiencia empresarial** (el cliente entiende el valor).

---

## A. Decisiones aprobadas que se incorporan [A]

| Decisión | Efecto |
|---|---|
| Blueprint como documento independiente en `main`, solo tras revisarlo y aprobarlo | No se publica aún |
| Sidebar expandido desde **1024 px** | Hoy es 1200 px [H] |
| Tablet 768–1023: **riel compacto con etiquetas abreviadas visibles** | |
| **44 px** en todos los controles táctiles, incluida la cabecera | Amplía mi propuesta (yo había propuesto solo primarias) |
| Integraciones en **«Sistema»** al inicio, diseñadas para evolucionar a centro propio | |
| **Sin densidad «cómoda»**; estándar y compacta mientras se demuestre su utilidad | |
| **360 px** diseño · **375 px** regresión · 320 y 412 en pruebas | |
| **No renombrar** términos hasta presentar y revisar el glosario completo | |
| **Cobro ≠ Pago** (cobro: dinero que un cliente debe pagar; pago: salida de dinero o liquidación de una obligación) | Ver nota en §C-3 sobre un riesgo de la nomenclatura actual |

---

## B. Qué experiencia queremos construir

### B-1. Tesis y usuario

**[H]** `docs/nexus-architecture/product-vision.md`: una pyme colombiana usa hoy «un cuaderno o Excel, WhatsApp, una caja, un software contable y nada para que la encuentren en Google». Nexus es «el lugar donde el negocio opera el día entero».
Tres rasgos que ya declara: se adapta al **rubro**, **operación diaria primero y contabilidad después**, **Colombia de fábrica**.

**Usuarios** (derivados del código de roles, `lib/core/auth/roles.ts`) [H]:

| Perfil | Rol en código | Qué necesita de la experiencia [Y] |
|---|---|---|
| Dueño | `OWNER` | Ver cómo va el negocio, decidir, controlar dinero y equipo |
| Administración | `ADMIN` | Dinero, inventario, equipo, reportes |
| Recepción / caja | `RECEPTION` (y `STAFF`) | Cobrar y agendar rápido, con una mano, bajo presión |
| Asesor | `ADVISOR` | Clientes, agenda y WhatsApp; sin dinero |
| Contador / asesor externo | **no existe** [F] | Acceso limitado y exportación contable |
| Equipo Nexus | `SUPERADMIN` + Operations Center | Soporte, cuentas, facturación de Nexus |

**Nota:** «Sin dinero» para el asesor y «sueldos y costos aparte» (observado en la investigación de restaurantes) son reglas de producto que la interfaz debe hacer visibles, no solo aplicar.

### B-2. Problemas que resuelve (en orden de valor) [Y]
1. Información dispersa entre cinco herramientas desconectadas.
2. El dinero se equivoca o no se concilia (cobro sin documento, caja que no cuadra).
3. El negocio no sabe qué pasó hoy ni qué hacer mañana.
4. La adopción de un sistema grande es costosa; la pyme abandona.

### B-3. Principios de experiencia del producto (nuevos, sobre los de diseño)
1. **Un hecho se registra una vez** y alimenta ventas, inventario, caja, finanzas e informes (eventos, no copias).
2. **Cada pantalla responde:** qué pasa ahora, qué puedo hacer, qué cambia si lo hago.
3. **El rubro es un perfil, no una frontera** [H, `distribucion-por-rubro`]: lo ve quien lo enciende; nada se oculta por rubro.
4. **Todo dato muestra su procedencia** cuando existan fuentes externas [F].
5. **Lo que mueve dinero no se equivoca** y deja rastro auditable [H: `money-service`, `logTenantAction`].
6. **Nada se promete que no existe** (disponible · prototipo · plan futuro).

---

## C. Experiencia actual frente a experiencia objetivo

### C-1. Dominio 1 · Experiencia empresarial completa

**Recorrido actual [H]** (`user-journey.md`, `lib/experience/onboarding/flow.ts`):

| Etapa | Existe hoy | Lo que falta (observado) |
|---|---|---|
| Descubrir | `/pricing`, tarjeta NFC/QR (`/c/{code}`) | Demo comercial guiada: no encontré una ruta de demo en `app/` |
| Registro | Auth → `/onboarding` (intro, perfil persona/empresa, negocio, acceso, confirmación) | El wizard vigente **no crea datos iniciales**; solo un wizard clásico lo hace |
| Configurar | Rubro → módulos recomendados; «Funciones» para encender/apagar | Sin asistente que pregunte *cómo opera* el negocio y active por respuesta |
| Incorporar datos | `/data`: importar y exportar clientes y catálogo (Excel/CSV, permiso `data.exchange`) | Sin importar desde herramientas concretas, sin ver errores fila por fila* |
| Operar | Módulos por rubro; POS, cobros, caja, agenda, etc. | Ver §C-8 |
| Obtener valor | Dashboard con comparaciones y "qué puedo hacer" (`insights.ts`) | `WelcomeChecklist` existe como componente; no verifiqué que guíe a «primer valor» |
| Crecer | `/crecimiento`, presencia digital, planes | Sin ruta de upsell documentada |

\* Marcado con asterisco: no abrí el flujo de importación; es lo que supongo a partir del nombre `data-exchange`. **[Y]**

**Objetivo [R]: «tiempo hasta el primer valor»** como métrica rectora (hoy **sin medir**): minutos desde el registro hasta la primera venta/cobro registrado con un cliente real.

**Recorridos que deben ser un solo producto** [R]: demo comercial → prueba → implementación asistida → migración → operación. Diferenciarlos **por contexto de entrada y qué se precarga**, no por productos separados (ver §C-5).

### C-2. Dominio 2 · Arquitectura funcional

Tu lista (Foundation, Core, Business, Finance, Automation, Insights, Integrations, Industry, Experience) frente al código real:

| Dominio propuesto | Capa real hoy [H] (`docs/architecture/layers.json`) | Estado |
|---|---|---|
| Foundation | `lib/foundation` (utilidades, acceso a base, límites, QR, rate-limit) | Existe |
| Core | `lib/core`: auth, tenancy, capacidades, entitlements/planes, eventos, archivos, operaciones, terceros, sectores | Existe |
| Business | `lib/business`: clientes, catálogo, inventario, ventas, POS, compras, agenda, tienda, intercambio de datos, presencia, crecimiento | Existe |
| Finance | `lib/domains/finance` (**«hoy `finance`»**; `layers.json` lo describe como en migración desde sus carpetas de origen) | Existe, en transición |
| **Automation** | **No es una capa.** Hay piezas: motor de eventos con *outbox*, despachador y webhooks firmados (`lib/core/events`), registro de operaciones (`lib/core/operations`) expuesto como API y servidor MCP, ruta `cron/webhooks` | **Parcial y disperso** |
| **Insights** | **No es una capa.** `lib/experience/dashboard` (insights, notificaciones, catálogo de gráficos) | **Parcial, dentro de Experience** |
| Integrations | `lib/integrations`: `einvoice`, `google`, `maps`, `providers` (adaptadores: `sandbox`, `wompi`) | Existe |
| Industry | `lib/industry`: `construction`, `gym`, `museum` (en Prisma también `tourism`) | Existe; **restaurante no** |
| Experience | `lib/experience`: navegación, onboarding, dashboard, sitio, motion | Existe |
| (extra) Platform | `lib/platform`: Operations Center de Nexus (cuentas, facturación de Nexus, soporte, CRM propio, equipo) | Existe; **no es un segundo Core** |
| (extra) Runtime | raíz de composición | Existe |

**Regla de importación [H]:** cada capa solo importa las de su lista; ninguna industria importa a otra; solo `experience` importa industrias; lo verifica `scripts/check-layers.mjs`.

**Hallazgo clave [H→R]:** *Automation* e *Insights* aparecen en tu modelo mental pero **no tienen frontera en el código**. Recomiendo **no crear capas nuevas todavía**, sino declararlas como **dominios de experiencia** (qué ve y qué puede hacer el usuario) apoyados en lo que ya existe, y decidir en una fase posterior si merecen capa de código. Razón: evita abstracción prematura y reordenar `lib/` sin necesidad.

**Responsabilidades y flujo de información [R]:**

| Dominio | Responsable de | No debe hacer | Intercambia por |
|---|---|---|---|
| Core | Identidad, tenant, permisos, auditoría, planes, eventos | Conocer rubros | Contratos y eventos |
| Business | Clientes, catálogo, inventario, ventas, agenda | Reglas de dinero propias | Llama a Finance para dinero |
| Finance | Cobros, caja, gastos, impuestos, contabilidad | Interfaz de industria | Emite eventos (`payment.confirmed`) |
| Integrations | Hablar con terceros mediante puertos | Lógica de negocio | Puertos/adaptadores; eventos entrantes (`ProviderEvent`) |
| Industry | Flujos propios del oficio | Importar otra industria | Eventos hacia Business/Finance |
| Experience | Navegación, onboarding, dashboard | Reglas de negocio | Consume todo; compone |

La regla de la propuesta de rubros (#123) es la que gobierna: **[H, propuesta]** «fronteras de producto: no existen; fronteras de código: sí» (Core nunca depende de un rubro; algo sube de rubro a compartido cuando un **segundo** rubro lo necesita).

### C-3. Navegación, vocabulario y la distinción Cobro/Pago

**[H]** Hoy conviven en la navegación «Pagos» (ruta `/finance?tab=cobros`, descrito como «Cobros y control de pagos»), «Cobros en línea», «Facturación», «Cartera», «Gastos» (dentro de Compras y gastos).
**Observación importante frente a tu criterio:** la etiqueta «Pagos» abre la pestaña *cobros*, es decir, hoy **se usa «Pago» para lo que tu glosario llama «Cobro»**. Esto no es un error mío sino un hallazgo: la regla que definiste choca con la etiqueta vigente.

**[R] No renombrar aún.** En el glosario completo (entregable siguiente) se propondrá, para tu decisión:
- Cobro = dinero entrante de clientes; Pago = salida de dinero/liquidación de una obligación.
- Revisar qué muestra realmente cada pantalla («Pagos», «Cobros en línea», «Cartera») antes de proponer nombres.
- Nombre del módulo `payments` en código vs. etiqueta visible: el código puede conservar su identificador.

### C-4. Dominio 3 · Interoperabilidad

**Existente [H]:**

| Pieza | Estado verificado |
|---|---|
| Modelo `ExternalConnection` + `ProviderEvent` (webhook entrante con idempotencia) | Existe en Prisma (`integrations/providers.prisma`) |
| Adaptadores de pagos | `sandbox` y `wompi` (`lib/integrations/providers/registry.ts`; el comentario dice «el proveedor DIAN se agrega aquí cuando se elija») |
| Factura electrónica | Puerto `EInvoicePort` con `http-provider` y `sandbox`; módulo `factura-electronica`. **No verifiqué** si hay proveedor DIAN real conectado |
| Google (ficha) | `lib/integrations/google` + módulo `google` |
| WhatsApp | Módulo `whatsapp`; la visión lo describe como **parcial** (plantillas que abren `wa.me`) |
| Mapas | Leaflet/Photon |
| Salida | Webhooks firmados con *outbox* (`lib/core/events`), API `v1` con llaves, servidor MCP, `n8n-en-casa.md` |
| Importar/exportar | Clientes y catálogo, Excel/CSV |

**No existe [F]:** conectores a Alegra, Siigo u otros contables; sincronización bidireccional; marketplace; asignación de «sistema dueño del dato» por entidad; panel de conflictos.

**Modelo conceptual de interoperabilidad [R]** (diseño, no implementación):

1. **Tres modos por entidad** (clientes, productos, documentos, cobros…): *Nexus manda* · *Herramienta externa manda* · *Solo importar/exportar*. Un negocio puede tener **modos distintos por entidad**.
2. **Procedencia visible:** insignia «Origen: Alegra · sincronizado hace 2 h» en el registro; si es Nexus no se muestra ruido.
3. **Estados de conexión:** Conectado · Desconectado · Sincronizando · Requiere atención (alineado con el vocabulario de estados).
4. **Conflictos:** una cola revisable («este cliente cambió en ambos sistemas») con la opción de elegir fuente. Solo cuando exista sincronización real.
5. **Permisos de compartición:** qué entidades se comparten, en qué dirección, quién autorizó.
6. **Migración progresiva:** empezar en «Solo importar/exportar», pasar a «Nexus manda» por entidad, sin big bang.

**Hoja de camino de interoperabilidad (por riesgo) [R]:**
- Nivel 0 (hoy): importar/exportar CSV; webhooks y API para quien sepa usarlos.
- Nivel 1: **exportación contable** para contador/Alegra/Siigo (fórmula ya mencionada en la visión: «exportar movimientos al software contable»). Es lo que menos promete y más valor da.
- Nivel 2: conector de lectura/escritura **un solo proveedor** tras validar su API pública y el costo (la investigación de mercado debe repetirse con fuentes primarias: **no pude verificar Siigo ni Holded**).
- Nivel 3: catálogo de integraciones («Sistema → Integraciones») con las tres etiquetas honestas: disponible / prototipo / plan futuro.
- Nivel 4 [F]: marketplace de terceros — solo cuando exista API pública estable y modelo de permisos por aplicación.

**UX del centro de Integraciones (diseño para «Sistema»)** [R]: tarjeta por herramienta con estado, última sincronización, entidades compartidas, permisos, acciones («Conectar», «Reconectar», «Desconectar», «Ver historial»). Misma tarjeta sirve a un futuro marketplace; solo cambia la fuente del listado.

### C-5. Dominio 4 · Industrias (núcleo común, flujos adaptados)

**Hoy [H]:**
- 18 verticales en el enum; **7 se ofrecen al registrarse** (`SIGNUP_VERTICALS`: general, gimnasio, agencia de turismo, construcción, restaurante, inmobiliaria, museo).
- La personalización actual es **vocabulario y recetas de módulos** (`VERTICAL_RECIPES`, `vertical-terms`): un gimnasio ve «Socios», una constructora «Obras».
- Código propio de industria: **construcción, gimnasio, museo** (`lib/industry/`). Turismo existe en Prisma.
- **Restaurante:** está disponible en el registro, pero según el checklist del 25-oct (`D-checklist-restaurante.md`) **no tiene funciones propias**: hoy usa POS, inventario y compras generales. Mesas, comandas, recetas, QR y menú digital: **no existen**.

**Núcleo compartido + adaptación [R]:** el patrón ya aprobado como propuesta en #123 (tres anillos: Core → Compartido → Rubro) es el correcto para la experiencia:

| Elemento de experiencia | Compartido | Adaptado por rubro |
|---|---|---|
| Shell, navegación, búsqueda, notificaciones | ✔ | Orden y vocabulario |
| Tabla/lista, formularios, estados | ✔ | Columnas y campos |
| Cobrar | ✔ (`money-service`) | Qué se cobra: membresía, cuenta de mesa, presupuesto |
| Agenda | ✔ | Clase, reserva de mesa, cita |
| Pantalla de trabajo diaria | Plantilla «Gestión operativa» | Plano de mesas, control de acceso, avance de obra |
| Dispositivo principal | | Cocina: tablet fija · Mesero: móvil · Gerente: escritorio |

**Caso de estudio profundo: Restaurante** (estado propuesto, nada implementado)

*Fuente:* investigación de #122 (Colega Menus, cuenta propia, solo lectura, 71 pantallas) y propuesta de integración en #123. Los hechos sobre Colega son **observaciones de ese equipo en prueba gratuita**, algunas obtenidas del soporte público y no de capturas; no son una verificación mía.

*Actores y dispositivos* [R, hipótesis a validar con un restaurante real]:

| Actor | Tarea crítica | Dispositivo | Requisitos de experiencia |
|---|---|---|---|
| Cliente en mesa | Ver menú, pedir, pagar (si el negocio lo habilita) | Su móvil, vía QR | Sin instalar app; muy rápido; ≥ 320 px |
| Mesero | Abrir mesa, tomar pedido, enviar a cocina, dividir cuenta | Móvil (una mano) | Targets 44 px, offline tolerante |
| Cocina | Ver comandas por estado y tiempo | Tablet/pantalla fija horizontal (1180×820) | Contraste, semáforo por tiempo, sin texto pequeño |
| Cajero | Cobrar, propina, cierre de caja | Escritorio/tablet | Teclado y táctil; `money-service` |
| Gerente/dueño | Ventas del día, costos, inventario de insumos | Escritorio/móvil | Densidad estándar; datos de costos solo con permiso |

*Flujo de punta a punta (propuesto)*: Mesa (QR inmutable) → Cuenta abierta (**una por mesa**) → Pedido → Comanda → Cocina (nuevo → preparación → listo → entregado/cancelado con motivo) → Cuenta (división por producto/método + propina aparte) → Cobro (`money-service`, evento `restaurant.ticket.settled.v1` hacia ventas) → Cierre de caja.

*Mapa de brechas [H, checklist 25-oct]:*

| Capacidad | Estado |
|---|---|
| POS de caja, inventario, compras | Implementado (generales) |
| Pedidos | Parcial (`StoreOrder` de tienda; no pedido de mesa) |
| Mesas/zonas, comandas/cocina, recetas, cuenta/división/propinas | **Falta** |
| Reservas de mesa | Parcial (`Booking` general) |
| QR por mesa, menú digital | Aplazado (QR y catálogo existen como bloques) |
| Decisión G-04: pedido de restaurante como **objeto propio con evento hacia ventas** | Propuesta |

*Qué patrones del sistema se reutilizan* [R]: `DataTable` en versión lista (menú, inventario, comandas históricas), `ResponsiveSheet`/`FormDrawer` (editar plato), `ConfirmDialog` (cancelar pedido, destructivo), template «Gestión operativa» (plano de mesas y cocina), `Badge` de estado para el ciclo del pedido.
*Qué patrón nuevo requiere* [R]: **tablero de estados con tiempo** (kanban/columnas por estado con semáforo) y **plano de mesas** (arrastrar y soltar con alternativa por teclado: ya exige la regla del repo de `@dnd-kit/core`).
*Riesgos observados* en la investigación: cuentas duplicadas por mesa, inventario que no cuadra si no se devuelve al cancelar, cierre de caja descuadrado por propinas, venta duplicada sin red (offline requiere folio temporal e idempotencia).
*Primera pregunta antes de diseñar pantallas [R]:* ¿qué rubro de restaurante es el primero (café/rápida, a la carta, delivery)? Cambia mucho el flujo (mesa vs. mostrador).

**Gimnasio y turismo [H/R]:** gimnasio ya tiene membresías, control de acceso QR/NFC, agenda de clases y cupos; falta cobro recurrente y avisos automáticos (visión, «Hoy/Falta»). Turismo: esquema en Prisma, sin superficie de producto verificada por mí. **Los tres comparten** agenda, cobros y clientes: es la prueba de que esos tres deben ser compartidos y no duplicarse.

### C-6. Dominio 5 · Onboarding y adopción

**Realidad actual [H]:** un solo wizard (`/onboarding`): perfil → negocio → «Acceso» (empezar gratis o código de acceso) → confirmación; el servidor decide los módulos en piloto; plan `ESSENTIAL` en piloto; existe `SubscriptionStatus` con `TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`; el cobro de Nexus se coordina (aún no se cobra nada, texto del paso). Código de acceso/tarjeta NFC como vía de ingreso. **«Freemium» no está modelado como tal** [H: no encontré un plan gratuito permanente; hay `ESSENTIAL` y prueba].

**Recorridos [R]** (mismo producto, distinto punto de partida):

| Recorrido | Punto de partida | Qué cambia | Estado |
|---|---|---|---|
| Autoservicio | Registro | Wizard + recomendación por rubro | **Existe** |
| Prueba (trial) | Registro / código | Datos de ejemplo opcionales, aviso de fin de prueba | Parcial (estado TRIAL existe) |
| Demo comercial | Equipo de ventas | Negocio de muestra con datos coherentes del rubro, **marcado como demo**, aislado, reseteable | **Falta** [F]. Riesgo: confundir datos demo con reales |
| Implementación asistida | Equipo Nexus crea el negocio desde el Operations Center (`createTenantAction`) | El cliente entra, queda OWNER, retoma el wizard | **Existe** el mecanismo; falta guía del lado del cliente |
| Migración | Importar CSV (`/data`) o conector | Vista previa, errores por fila, deshacer | Parcial (importar existe) |
| Capacitación | Checklist y ayudas contextuales (`ContextHelp`, `WelcomeChecklist`) | Pasos que se marcan solos al ocurrir el hecho | Parcial |
| Freemium | — | Decisión de negocio, no de diseño | **No definido**; abierto en visión («¿cuánto cuesta por rubro?») |

**Principios [R]:** (1) preguntar por *cómo opera*, no por *qué módulos quiere*; (2) mostrar solo lo que sirve y avisar lo que está apagado (la paleta ya lo hace: «Funciones apagadas»); (3) el checklist se completa solo; (4) el primer valor llega antes de configurar todo.

### C-7. Dominio 6 · Roles, permisos y contexto

**Hoy [H]:**
- Roles del negocio: `SUPERADMIN`, `OWNER`, `ADMIN`, `RECEPTION`, `ADVISOR`, `STAFF`. La matriz está en `lib/core/auth/permissions.ts` (permisos `business.manage`, `team.manage`, `business.setup`, `money.handle`, `data.exchange`, `customers.delete` y específicos de construcción).
- Operations Center de Nexus tiene su **propio modelo** de permisos por clave y roles de sistema (Propietario, Finanzas, Comercial, Soporte, Técnico) en `lib/platform/team/permissions.ts`. Son dos modelos distintos y no deben confundirse.
- La regla de seguridad [H]: el servidor decide, la pantalla solo oculta.
- Sin permiso hoy hay dos tratamientos (`notFound()` y `StaffAccessNotice`).
- Hay un solo selector de negocio: **«Una cuenta = un negocio»** en modo create; la visión lo marca como futuro.

**Experiencia por rol [R]** (qué cambia en la interfaz, sin duplicar pantallas):

| Rol | Inicio | Navegación | Acciones rápidas |
|---|---|---|---|
| Dueño | Resumen del negocio, alertas, finanzas | Todo | Crear, ver reportes |
| Administración | Operación y dinero | Todo menos plan/configuración del negocio | Anular, ajustar inventario |
| Recepción | Cobros del día, agenda, accesos | Cobros, caja, agenda, clientes, membresías | Cobrar, registrar entrada |
| Asesor | Clientes y mensajes | Clientes, agenda, WhatsApp | Escribir, agendar |

**Reglas de diseño [R]:**
1. Lo que el rol no puede hacer **no se muestra como error**: no aparece, o aparece deshabilitado con motivo y a quién pedirlo (criterio que unifica los dos tratamientos).
2. El **Inicio se compone por rol** (widgets según permiso), no pantallas distintas. El dashboard ya es personalizable por widgets [H, `chart-catalog`, `layout`].
3. Un conjunto único de textos para «Sin permiso» en el glosario.
4. Auditoría visible: quién hizo qué (ya existe `logTenantAction`; la superficie para el dueño no la verifiqué).
5. Rol granular por sección y sede (observado en la investigación del restaurante: «sección × ver/editar × sucursal») **es futuro** [F]; hoy el modelo es por rol, no por sección.

### C-8. Dominio 7 · Experiencia multidispositivo (tareas, no tamaños)

Principio 08 aprobado [H]. Aquí se traduce a **tareas prioritarias** [R, hipótesis a validar con usuarios]:

| Tarea | Móvil | Tablet | Escritorio |
|---|---|---|---|
| Consultar cómo va el día | **Excelente** | Excelente | Excelente |
| Cobrar / registrar venta | **Excelente** (una mano) | **Excelente** (mostrador) | Excelente |
| Buscar cliente y escribirle | **Excelente** | Buena | Excelente |
| Registrar entrada / escanear QR | **Excelente** (cámara) | Buena | Buena |
| Gestionar comandas (cocina) | Aceptable | **Excelente** (pantalla fija) | Buena |
| Tomar pedido en mesa | **Excelente** | Buena | No aplica |
| Conciliar, importar, configurar, reportes | Consulta | Buena | **Excelente** |
| Editar catálogo en masa | No prioritario | Aceptable | **Excelente** |

**Implicación:** móvil no es «versión reducida»: es el contexto primario de cobrar, buscar y escanear; escritorio, el de administrar. Cada template declara qué dispositivo prioriza.
**Cobertura:** PWA ya existe [H, `pwa.md`]; el soporte sin conexión aplica política de caché que **excluye datos privados**. Qué tareas funcionan sin red: **no verificado**; la investigación de restaurante recomienda folio temporal + idempotencia (futuro).
**Limitación:** todo lo anterior son hipótesis. Hasta probar en dispositivos reales, ningún criterio R2/R4/R5 se da por cumplido.

### C-9. Dominio 8 · Inteligencia operativa

**Hoy [H]:**

| Capacidad | Estado verificado |
|---|---|
| Búsqueda global y acciones | `CommandPalette` (cmdk): resultados, «Ir a» (navegación), «Funciones apagadas», «Acciones» de creación; buscador de barra en PC con `Ctrl K`, hoja en móvil |
| Notificaciones | Campana; `buildNotifications`: cobros y gastos de hoy, citas de hoy, membresías por vencer/vencidas; solo módulos activos. **Se construyen al renderizar** a partir de datos del día, no son un sistema de eventos con bandeja persistente [Y: verificar] |
| Insights | Comparación con periodo anterior («Sin variación disponible» en vez de 0 % inventado), «¿cuánto hay? ¿cómo va? ¿qué puedo hacer?» |
| Actividad/auditoría | `logTenantAction`, panel de auditoría en admin; para el dueño no verificado |
| Automatización | Webhooks firmados con *outbox*, API, MCP, n8n externo. **No hay automatizaciones configurables por el usuario** en la interfaz (según lo revisado) |
| Asistencia inteligente | **No encontré** un asistente integrado al producto. Existe MCP (para clientes externos de IA) |

**Diseño objetivo [R]:**
1. **Un centro de actividad único** (template «Centro de actividad»): notificaciones + historial + tareas por hacer, con filtros, lectura/no lectura y enlace al registro.
2. **Notificaciones con tres niveles:** informa (sin acción) · requiere acción (atención) · urgente (dinero/sistema). Cada una con *qué pasó, qué significa, qué hacer*.
3. **Búsqueda global ampliada** de «navegación + acciones» a «registros» (clientes, ventas, productos), con límite en el servidor y respeto de permisos (regla del repo).
4. **Acciones rápidas por contexto y rol** (ya hay `quickActions`).
5. **Automatizaciones simples y visibles** [F]: reglas de «cuando pase X, hacer Y» con plantillas (recordatorio de membresía, cobro vencido). Prerrequisito: tareas programadas y mensajería real (según la visión, fase «Cobrar y avisar solos»); **no diseñar el editor antes de que existan los disparadores**.
6. **Asistencia inteligente** [F]: solo sobre datos ya presentes y con acciones previa confirmación; riesgo alto (dinero, privacidad). Se evalúa después del centro de actividad; la API y MCP ya dan una base técnica.

---

## D. Qué patrones deben reutilizarse y cuáles faltan (síntesis de los 7 niveles)

| Nivel | Se reutiliza (existe) | Falta para cubrir los 8 dominios |
|---|---|---|
| 1 Tokens | Marca, densidad, movimiento | `text-2xs`/`text-ui`, familia documento/impresión |
| 2 Primitivas | Button, Input, Select, Switch, Badge… | Resolver API Button/Input; mapa único de estados con icono |
| 3 Compuestos | Field, Alert, EmptyState, LoadingState, ResponsiveSheet, ConfirmDialog, CommandPalette, Breadcrumbs, Pagination | **ErrorState, FilterBar, NotificationItem, ConnectionCard** (los dos últimos con uso real solo cuando existan notificaciones persistentes e integraciones) |
| 4 Patrones | Formulario en panel, confirmación | **Tabla/lista adaptable, importar/exportar con previsualización, conexión de integración, centro de actividad, tablero de estados con tiempo, plano de mesas** |
| 5 Templates | Dashboard, TenantShell, etc. | Listado, Detalle, Configuración, Integraciones, Centro de actividad, Gestión operativa |
| 6 Experiencias | Onboarding, cobrar | Registrar cliente, conectar herramienta, importar datos, operar restaurante |
| 7 Módulos | 24 capacidades | Adopción gradual |

Regla: un componente nuevo sólo nace con dos usos reales (política vigente). **ConnectionCard** y **NotificationItem** no cumplen hoy y se mantienen como diseño hasta que se cumpla.

---

## E. Hoja de ruta integral

Tres carriles que avanzan juntos, con puntos de sincronización.

### E-1. Carriles
- **DS** = Design System (componentes, tokens, shell).
- **ARQ** = Arquitectura funcional (contratos, eventos, frontera de capas).
- **EXP** = Experiencia empresarial (onboarding, recorridos, rubro, ecosistema).

### E-2. Fases, dependencias, prioridad y riesgo

| ID | Fase | Carril | Depende de | Prioridad | Riesgo | Criterio de aceptación (verificable) |
|---|---|---|---|---|---|---|
| **P0** | Aprobar blueprint, glosario completo y decidir destino de la pila #141–#143 | Todos | — | Crítica | Nulo | Documento aprobado por ti; glosario revisado; sin renombrados aplicados |
| **P1** | **Estados de ruta** (`ErrorState`, `error.tsx`, `not-found`, `loading.tsx` faltantes) + historias Sin conexión/Guardando | DS | P0 | Alta | Bajo | 72/72 rutas con `error.tsx` o heredado documentado; `loading.tsx` ≥ rutas con datos; historias nuevas pasan axe |
| **P2** | **Tokens** `text-2xs`/`text-ui` + regla que congela la deuda (736) | DS | P0 | Alta | Bajo | Tokens definidos; test que impide crecer el conteo fuera de token; 0 cambios visuales en capturas |
| **P3** | **Tabla/lista adaptable** (`DataTable` real) + 2 módulos piloto | DS | P2 | Alta | Medio | Sin scroll horizontal ni recorte en 320/360/412/820/1280; 44 px en táctil; estados vacío/carga/error; 31→29 tablas manuales en los pilotos |
| **P4** | **Shell y tablet** (1024, riel con etiquetas abreviadas, 44 px, buscador sin atajo en táctil) | DS | P3 (tabla estable) | Alta | Medio | Capturas en 744/768/820/1023/1024/1180; suite responsive verde; sin regresión en Playwright de overlays |
| **P5** | **Glosario y UX Writing aplicados**: lista de botones, mapa de estados con icono, plantillas de mensaje | DS + EXP | P0 | Alta | Medio (toca textos de toda la app) | Conteo base de «Aceptar/OK/Enviar» medido y reducido en pilotos; glosario aprobado antes de cualquier renombrado |
| **P6** | **Roles y contexto**: criterio único de «sin permiso», Inicio por rol, auditoría visible | EXP + ARQ | P1 | Media | Medio | Matriz rol×pantalla documentada y probada; un solo tratamiento de «sin permiso» |
| **P7** | **Centro de actividad** (notificaciones + historial) como template | EXP + DS | P3, P6 | Media | Medio | Notificaciones con tres niveles; filtros; funciona 320–1280; solo con eventos reales |
| **P8** | **Dashboard** (densidad, jerarquía, por rol) | DS + EXP | P3, P4, P6 | Media | Medio | Línea base vs. después de densidad; importes ≥ 16 px; sin recortes |
| **P9** | **Integraciones (fase 1)**: «Sistema → Integraciones» con lo existente (Wompi, factura electrónica, Google, WhatsApp, importar/exportar), estados, etiquetas honestas | EXP + ARQ | P1, P5 | Media | Medio | Cada tarjeta refleja el estado real de `ExternalConnection`/módulo; ninguna promesa sin soporte |
| **P10** | **Interoperabilidad (fase 2)**: exportación contable; modelo «quién manda» por entidad; procedencia | ARQ + EXP | P9 + investigación con fuentes primarias de Alegra/Siigo | Media | Alto | Diseño aprobado; contrato de datos; prueba con archivo real del contador |
| **P11** | **Restaurante (diseño y MVP)**: decisión G-04, mesas/comandas/cuenta; tablero de estados; plano de mesas | EXP + ARQ + DS | P3, P6, P7, y validación con un restaurante | Media-alta | Alto | Flujo punta a punta probado en móvil/tablet; `money-service` sin cambios; ninguna capa rompe `check-layers` |
| **P12** | **Onboarding y adopción**: asistente por respuesta, datos de ejemplo/demo marcado, checklist que se completa solo | EXP | P5, P6 | Media | Medio | Métrica «tiempo hasta primer valor» con línea base; demo aislada del tenant real |
| **P13** | **Migración modular** de las 24 capacidades a los patrones | Todos | P3–P8 | Media | Variable | Checklist por módulo; reducción medida de tablas manuales y tamaños fuera de token |
| **P14** | **Automatización y asistencia** | ARQ + EXP | Tareas programadas, mensajería real, P7 | Baja ahora | Alto | Solo con disparadores existentes; confirmación antes de actuar |
| **P15** | **Marketplace** | ARQ + EXP | API pública estable, permisos por aplicación, P10 | Futura | Alto | Se evalúa cuando haya demanda medida |
| **P16** | **Validación integral** en dispositivos reales (Safari iOS, Android, iPad) | Todos | P4+ | Continua | — | Reporte por dispositivo; R2/R4/R5 evaluados |

### E-3. Puntos de sincronización
- **Antes de P3:** acordar la **forma del dato** de una fila (columnas con roles `primaria/secundaria/estado/acción`) para que lista y tabla compartan contrato.
- **Antes de P9/P10:** acordar el **vocabulario de estados de conexión** y la tabla de procedencia (Nexus/externo/importado).
- **Antes de P11:** acordar **G-04** y el contrato de evento hacia ventas.
- **Antes de cualquier renombrado:** glosario aprobado (P0/P5).

### E-4. Por qué este orden
1. Primero lo que **protege** la confianza y cuesta poco (P1, P2).
2. Luego lo que **desbloquea** muchas pantallas (P3 tabla), antes de tocar la navegación (P4), para no migrar dos veces.
3. El **lenguaje** (P5) y los **roles** (P6) antes de los nuevos módulos, para que nazcan bien.
4. Las **integraciones** empiezan por lo que existe (P9) y por exportación (P10) antes de sincronizar; el marketplace al final.
5. **Restaurante** como caso piloto de experiencia por industria, después de tener tabla, roles y centro de actividad.
6. **Automatización/IA** al final: dependen de datos y eventos que hoy se completan en P7–P10.

### E-5. Riesgos transversales

| Riesgo | Mitigación |
|---|---|
| Rediseñar la interfaz antes de acordar los recorridos | P0 con aprobación; piloto por flujo, no por pantalla |
| Prometer integraciones no existentes | Tres etiquetas (disponible/prototipo/futuro) y revisión de la guía de tono §6 |
| Renombrar y romper memoria del usuario | Glosario aprobado primero; renombrado por oleadas con notas de cambio |
| Mezclar datos demo con reales | Aislamiento por tenant y marcado visible |
| Restaurante sin validar con un restaurante real | Entrevista y prueba de campo antes de P11 |
| Pruebas solo en Chromium emulado | P16 en dispositivos; declarar siempre la limitación |
| Demasiadas piezas simultáneas | Una PR por objetivo; carriles con puntos de sincronización |
| Capa «Automation»/«Insights» creada sin necesidad | Mantenerlas como dominios de experiencia hasta que el código lo pida |

---

## F. Estrategia de pruebas y medición (resumen)

| Qué | Cómo | Línea base |
|---|---|---|
| Responsive | `pnpm test:responsive` en 320/360/375/412/744/768/820/1023/1024/1180/1280 | 224/224 en #143 (reporte, no reejecutado) |
| Accesibilidad | axe en Storybook + e2e; teclado y foco | Existe; sin medición global del producto |
| Consistencia | `pnpm design:inventory` | Cifras de §9 del primer documento |
| Estados | rutas con `loading`/`error`; historias de estado | 37/72 · 0/72 · estados en historias |
| Lenguaje | Conteo de botones genéricos; revisión del glosario | **No medido** |
| Experiencia | Tiempo hasta primer valor; tareas guiadas (encontrar X) con 5 personas por rubro | **No medido** |
| Dispositivos | Matriz iOS Safari / Android Chrome / iPad | **No ejecutada** |

---

## G. Lo que no sé y cómo se resuelve

| Pregunta abierta | Cómo se cierra |
|---|---|
| ¿WhatsApp, Wompi y factura electrónica funcionan de extremo a extremo con proveedor real? | Revisar adaptadores y probar en sandbox; hoy solo sé que existen puertos y adaptadores |
| ¿Cómo funcionan realmente Alegra, Siigo y Holded por dentro? | Documentación primaria o demo con acceso |
| ¿Qué hace el wizard de importación hoy (vista previa, errores)? | Recorrerlo en el entorno local (3001) |
| ¿Hay un asistente de IA en el producto? | No encontré; confirmar con el equipo |
| ¿Cuál es el primer subrubro de restaurante? | Decisión de producto + entrevistas |
| ¿Existe freemium? | Decisión comercial (modelo de planes) |
| ¿Funciona offline? | Prueba específica de PWA |
| ¿Qué porcentaje de usuarios usa móvil/tablet? | Analítica (no revisada) |

## H. Límites
- Basado en lectura de código, documentos del repo y de los PR #122/#123 (que están abiertos y sin fusionar, por lo que su contenido es **propuesta**, no producto).
- No ejecuté la aplicación para recorrer flujos; las capacidades «existe» se basan en archivos, rutas y esquemas, no en prueba funcional.
- Las observaciones de competidores en restaurante provienen del trabajo del equipo (#122), no de verificación independiente mía.
- Benchmark externo con las limitaciones ya declaradas en el primer documento.
