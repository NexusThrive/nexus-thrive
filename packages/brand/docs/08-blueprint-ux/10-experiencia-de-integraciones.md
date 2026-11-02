# 10 · Experiencia de integraciones y ecosistema

[← Índice](README.md) · Decisiones citadas: DR-18, DR-23, DR-28, DR-33, DR-35, DR-47 (nueva), PD-12. Principios: **S5** continuidad, **P3** datos reales o nada, **B5** honestidad, **D6** complejidad progresiva.

> **Alcance de este documento:** la *experiencia* de integraciones que el producto **ya soporta**, y las reglas para que lo futuro entre sin romper el sistema. **No se implementan ni se prometen integraciones nuevas.** Nexus convive con herramientas externas; no exige abandonarlas (principio de producto).

## 1. Qué existe (hechos)

### 1.1 Modelo técnico

| Pieza | Qué es | Fuente |
|---|---|---|
| `ExternalConnection` | Conexión de un negocio con un proveedor, con `kind` (`PAYMENT`, `EINVOICE`, `MESSAGING`, `SHIPPING`), `provider`, `environment` (`sandbox`/`production`), **`status` (`DISCONNECTED`/`CONNECTED`/`ERROR`)**, `lastCheckedAt`, `lastError`. Credenciales cifradas, nunca visibles | `prisma/schema/integrations/providers.prisma` |
| `ProviderEvent` | Webhook entrante deduplicado por `(negocio, proveedor, id externo)`, con `processedAt` y `error` | idem |
| Puertos y adaptadores | Una interfaz por tipo; adaptadores registrados: `sandbox` y `wompi` (pagos). «El proveedor DIAN se agrega aquí cuando se elija» | `lib/integrations/providers/registry.ts` |
| Factura electrónica | Puerto `EInvoicePort` con adaptadores `http-provider` y `sandbox` | `lib/integrations/einvoice` |
| Google | Ficha de Google Business (BETA) | `lib/integrations/google` |
| Mapas | Leaflet y Photon (autocompletado de direcciones) | `lib/integrations/maps` |
| Salida | Webhooks firmados con *outbox*, API v1 con llaves, servidor MCP | `lib/core/events`, `app/api/v1`, `app/api/mcp` |
| Intercambio de datos | Importar y exportar clientes y catálogo (Excel/CSV), con asistente de mapeo en el catálogo | `/data`, `catalog/import` |

**Vocabulario ya existente de estado de conexión:** `DISCONNECTED` / `CONNECTED` / `ERROR` + entorno `sandbox`/`production`. La interfaz puede mostrarlos como **Desconectado · Conectado · Requiere atención** (vocabulario de `06` §6) **sin inventar un modelo nuevo** (DR-33, DR-47).

### 1.2 Superficies de usuario hoy

| Pantalla | Estado declarado | Qué hace realmente (según el código) | Tratamiento de acceso |
|---|---|---|---|
| **Cobros en línea** (`/cobros`) | `BETA` | Cobros con proveedor de pagos (Wompi, con `sandbox`) | Aviso si el rol no maneja cobros |
| **Factura electrónica** (`/factura-electronica`) | `BETA` | Configuración fiscal y emisión con puerto de proveedor | Aviso si no es dueño/administración |
| **Ficha de Google** (`/google`) | `BETA` | Gestión de la ficha | Aviso si no es dueño/administración |
| **WhatsApp** (`/whatsapp`) | `READY` | Plantillas que **abren la conversación en WhatsApp** con el texto listo. El propio código dice que la API de WhatsApp Business **sigue en el roadmap** | Sin comprobación |
| **Importar y exportar** (`/data`) | — | Clientes y catálogo, Excel/CSV | Aviso si no tiene `data.exchange` |
| **Configuración → llaves de API** | — | Llaves para la API (existen acciones de servidor; el panel `api-keys-panel` figura entre los componentes sin uso, **H-17**) | Dueño/administración |

**Lo que no existe (futuro, no se diseña como pantalla):** conectores con Alegra, Siigo u otros contables; sincronización bidireccional; procedencia de datos por registro; cola de conflictos; marketplace de terceros.

## 2. Problemas de experiencia (con principio)

| # | Problema | Evidencia | Principio |
|---|---|---|---|
| I-1 | Cada integración vive en su propio módulo; no hay un lugar donde ver **qué está conectado** | Cinco pantallas en cinco grupos del menú | S5, D2 |
| I-2 | La etiqueta «WhatsApp» sugiere una integración que hoy es un atajo manual | El comentario de la página lo reconoce | B5, P3 (DR-35) |
| I-3 | El estado de conexión no es visible de un vistazo | `status` existe en el modelo; la interfaz lo muestra en cada pantalla a su manera | D2, D7 |
| I-4 | El entorno (prueba o producción) no es evidente | `environment` existe | P3 (que nadie crea que cobra de verdad cuando está en prueba) |
| I-5 | El estado `BETA` no se comunica de forma uniforme | `BETA` en el registro; etiquetas no unificadas | DR-28, DR-33 |

## 3. Diseño de la experiencia (para «Sistema → Integraciones», DR-18)

### 3.1 Ubicación y evolución
- **Hoy:** una pantalla dentro de «Sistema» que reúne las herramientas **que existen**, sin cambiar dónde viven sus pantallas de trabajo (Cobros en línea, Factura electrónica, etc.).
- **Mañana (evolución, no decisión):** puede subir a un centro propio con catálogo; la arquitectura (tarjeta única, estado único) lo permite sin rediseñar.
- **Porqué:** S5 (un solo lugar para ver), P3 (solo lo real), D6 (complejidad progresiva).

### 3.2 La ficha estándar de una herramienta (patrón «Conexión»)

Un único patrón para todas; sirve a lo existente y a lo futuro.

| Elemento | Contenido | Fuente | Regla |
|---|---|---|---|
| Nombre y tipo | «Wompi · Cobros en línea» | `provider` + `kind` | Nombre del glosario |
| **Estado** | **Conectado · Desconectado · Requiere atención** | `status` | Texto + icono + color (DR-27) |
| **Entorno** | «Pruebas» / «Producción» | `environment` | Visible siempre; «Pruebas» con aviso persistente |
| **Madurez** | Disponible · En prueba · En plan | Estado de la capacidad (`READY`/`BETA`/`PLANNED`) | DR-33; nunca inventar |
| Última verificación | «Verificado hoy a las 3:00 p. m.» | `lastCheckedAt` | Si no hay dato, se dice «Sin verificar» |
| Último error | Mensaje con qué hacer | `lastError` | Estructura qué pasó / qué hacer (`06` §7) |
| Qué datos usa | «Cobros de tus ventas» | Descripción | Sin tecnicismos |
| Quién puede gestionarla | «Dueño y administración» | Matriz de permisos | Derivado, no escrito a mano (DR-34) |
| Acciones | **Conectar · Reconectar · Desconectar · Ver historial** | — | Verbos del glosario; «Desconectar» con confirmación que explica el efecto |
| Enlace de trabajo | Ir a la pantalla de uso («Abrir Cobros en línea») | Ruta del módulo | No duplica la pantalla de trabajo |

### 3.3 Estados de la ficha (cada uno con su historia)

| Estado | Qué ve la persona | Mensaje (plantilla) |
|---|---|---|
| Sin conectar | «Aún no conectas {herramienta}» + `Conectar` | «Conecta {X} para {beneficio concreto}» |
| Conectando | Progreso y no se puede repetir la acción | «Conectando…» |
| Conectada | Estado verde con texto + última verificación | — |
| Requiere atención | Aviso con `lastError` y qué hacer | «No pudimos verificar {X}: {causa}. Reconecta o revisa tus credenciales.» |
| Sin permiso | Ficha visible sin acciones y motivo | Plantilla de `09` §4.2 |
| Sin conexión de red | Ficha en solo lectura | «Sin conexión. No podemos verificar el estado ahora.» |
| Cargando / error de carga | Esqueleto / reintento | — |

### 3.4 Honestidad por herramienta (DR-28, DR-33, DR-35)

| Herramienta | Madurez declarada | Descripción honesta propuesta |
|---|---|---|
| Wompi (cobros) | En prueba (`BETA`) | «Cobra con tarjeta, PSE y Nequi. En prueba.» *(solo si el proveedor lo cubre en el adaptador real; no se prometen medios no verificados)* |
| Factura electrónica | En prueba (`BETA`) | «Emite factura electrónica ante la DIAN a través de un proveedor habilitado. En prueba.» *(el comentario del registro indica que el proveedor DIAN aún no se ha elegido)* |
| Ficha de Google | En prueba (`BETA`) | Descripción según la página |
| WhatsApp | Disponible (`READY`) | **«Envía mensajes desde plantillas: se abre la conversación en WhatsApp.»** No decir «integrado». La API de WhatsApp Business **no existe todavía** |
| Importar y exportar | — | «Sube clientes y catálogo desde Excel o CSV y descarga copias.» |

*Las descripciones son propuestas de texto para PD-03/PD-12; ninguna se aplica sin aprobación. No se cambia el estado (`READY`/`BETA`) de ninguna capacidad.*

## 4. Importar y exportar como patrón (nivel 4)

El flujo existe; el patrón se documenta para reusarlo (clientes, catálogo y futuros).

| Paso | Qué debe ocurrir | Porqué |
|---|---|---|
| 1. Elegir qué | Tipo de dato y plantilla descargable | D6 |
| 2. Subir | Formatos aceptados y límite visibles | P3 |
| 3. **Vista previa y mapeo** | Columnas ↔ campos; primeras filas | S3 confianza (el catálogo ya tiene `mapping-editor`) |
| 4. **Revisión de errores** | Errores **por fila**, con causa y cómo corregir; opción de descargar el reporte | P5, guía de tono §4 |
| 5. Confirmar | Resumen: «Se crearán N, se actualizarán M, se omitirán K» | D7 |
| 6. Resultado | Hecho + qué sigue; historial del lote | S4 |

**H-04:** no se verificó si el flujo actual cubre los pasos 3–6; debe recorrerse en `localhost:3001`. Los permisos (`data.exchange`) ya existen.

## 5. Interoperabilidad futura (modelo conceptual, sin pantalla)

Se conserva como **principio de diseño** para que lo existente no cierre puertas. **No hay interfaz ahora (DR-23 y P3).**

1. **Modo por entidad:** «Nexus manda», «herramienta externa manda» o «solo importar/exportar». Un negocio puede tener modos distintos por entidad (clientes, productos, documentos…).
2. **Procedencia visible** cuando exista origen externo («Origen: {herramienta} · sincronizado hace 2 h»). Si el dato nació en Nexus, no se muestra nada.
3. **Estados** de sincronización: Sincronizando · Sincronizado · Requiere atención (se suma al vocabulario de §3.2).
4. **Conflictos:** cola revisable, con elección de fuente; solo cuando exista sincronización bidireccional.
5. **Permisos de compartición:** qué entidad, en qué dirección, quién autorizó (`team.manage`/`business.setup`).
6. **Migración progresiva** por entidad, sin cambio de golpe.

**Escalera de madurez (hoja de ruta de producto, no de diseño):**

| Nivel | Capacidad | Estado hoy |
|---|---|---|
| 0 | Importar/exportar CSV; API, webhooks y MCP para quien sepa usarlos | **Existe** |
| 1 | Exportación orientada a contabilidad (para el contador) | Futuro |
| 2 | Un conector real (lectura/escritura) con un proveedor, tras validar su API pública | Futuro; **no verificado** (no se obtuvo fuente primaria de Alegra, Siigo ni Holded) |
| 3 | Catálogo de integraciones con filtros y categorías | Futuro |
| 4 | Marketplace de terceros | Futuro; exige API pública estable y permisos por aplicación |

## 6. Cómo se incorpora una integración nueva sin romper el sistema

Aplica el **contrato de módulo** (`12` §2) con estos requisitos adicionales:

1. Se registra como adaptador de un **puerto** existente (o un puerto nuevo con dos adaptadores reales).
2. Aparece en «Sistema → Integraciones» con la **ficha estándar** (§3.2); no crea su propia pantalla de estado.
3. Declara su **madurez** desde el estado de la capacidad.
4. Su pantalla de trabajo sigue las plantillas y patrones del sistema.
5. Sus errores usan la plantilla de `06` §7.
6. No se lista hasta que **se pueda conectar de verdad** (P3).

## 7. Decisiones

| ID | Estado | Resumen |
|---|---|---|
| DR-18 | **A** | Integraciones en «Sistema» |
| DR-28 / DR-33 | D / N | Madurez desde el estado de la capacidad |
| DR-35 | N | Descripción honesta de WhatsApp |
| DR-47 | N | Ficha única «Conexión» (patrón) con el estado del modelo existente |
| PD-12 | Pendiente | Textos oficiales de las descripciones por herramienta (§3.4) |

## 8. Criterios de aceptación

| Criterio | Medida |
|---|---|
| Un solo lugar muestra el estado de todas las conexiones existentes | Revisión de la pantalla con un negocio de prueba |
| La ficha usa `status`, `environment`, `lastCheckedAt` y `lastError` | Prueba de historia por estado |
| Ninguna herramienta listada sin conexión real posible | 0 casos |
| WhatsApp descrito sin decir «integrado» | Revisión de textos |
| Estados de la ficha con historia y axe | 0 violaciones |
| Importar/exportar con vista previa y errores por fila | Recorrido (H-04) |

## 9. Límites
- No se conectó ninguna integración ni se probó Wompi, el proveedor de factura electrónica o Google: se describe lo que dicen el esquema, los puertos y las páginas.
- No hay fuentes primarias de Alegra, Siigo ni Holded; la escalera de §5 es una hoja de ruta de producto, no una afirmación de compatibilidad.
- La existencia de `api-keys-panel` entre los componentes sin uso (H-17) no se contrastó con la pantalla de Configuración.
