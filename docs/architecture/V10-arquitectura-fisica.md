# V10 — Arquitectura física extensible de `lib/`: auditoría y diseño

**Estado: diseño aprobado (2026-10-31). Ejecutadas M0, M1 y M2 — ver [`V10-M0-M2-resultados.md`](V10-M0-M2-resultados.md); M3–M8 siguen pendientes de autorización.** *Texto original del diseño:* **DISEÑO para revisión. No se implementó nada.** No se movió ningún archivo, no se cambió ningún import, contrato, `layers.json`, prueba, Prisma, migración ni dato.
Base: rama local `chore/HU-esquema-prisma-modular-01`, commit `f0b49cc` (E0–E5, E7, E9 y V cerradas; 0 excepciones; `pnpm verify` en verde; sin push, PR, merge ni despliegue).
Las cifras salen de scripts de solo lectura sobre el código (método en el apéndice A); lo que no se pudo medir está marcado como **[no medido]**.

---

## 0. Respuesta corta: ¿cómo crece Nexus sin rediseñar su estructura física?

Con tres ideas, en este orden de importancia:

1. **Separar tres ejes que hoy se mezclan.** *Área* (qué reglas de dependencia cumple), *módulo* (qué responsabilidad y contrato tiene) y *sector* (un paquete que se enchufa). Crecer casi siempre es **agregar un módulo dentro de un área** o **agregar un sector**, nunca crear un área ni mover lo existente.
2. **Las áreas son pocas, estables y se definen como datos.** Una área nueva solo se justifica con una regla de dependencia distinta, comprobable (§4.3). Los módulos son la parte abierta.
3. **Un sector es un paquete que se registra, no código esparcido.** El sector declara su terminología, sus capacidades y (si los tiene) sus procesos en un solo lugar; los módulos compartidos no lo conocen. Terminología, capacidades y procesos son tres cosas distintas con tres lugares distintos (§3).

Lo que cuesta cada tipo de crecimiento está en §6.3 (una tabla: qué se agrega, dónde, qué archivos compartidos se tocan y qué prueba falla si se olvida algo).

**Hallazgo principal de la auditoría:** la estructura *lógica* ya es buena (`layers.json` con 0 excepciones, 7 puertos conectados). Lo que impide crecer sin fricción no son las capas sino **cuatro carpetas que mezclan responsabilidades** (`business`, `admin`, `ops`, `tenant/db.ts`), **el conocimiento por sector repartido en siete tablas más un enum de base de datos**, y **la ausencia de una forma de registrar un sector**.

---

## 1. Auditoría del estado actual

### 1.1 Estado del repositorio

Rama `chore/HU-esquema-prisma-modular-01`, árbol limpio, 15 commits de arquitectura sobre `1ac5c5f`. 283 archivos de producción clasificados en `lib/` (~38 000 líneas); 151 pruebas junto al código y 23 en `tests/`; 1 941 imports `@/lib/...` repartidos en 673 archivos (app, components, lib y tests). Documentación leída: `E0` a `E9-V`, `NEXUS-V2-ARQUITECTURA-ETAPA-A`, `hoja-de-ruta`, `documentacion-de-modulos`, `layers.json`, `exceptions.json`, `lib/runtime/ports.ts` y los 7 contratos de puerto.

### 1.2 Lo que ya funciona y no se debe romper

| Mecanismo | Dónde | Por qué importa para V10 |
|---|---|---|
| Capas con `mayImport` como **datos** | `layers.json` + `scripts/check-layers.mjs` | Es el germen de «áreas como datos». V10 lo extiende, no lo reemplaza |
| Excepciones que solo se encogen | `exceptions.json` (hoy 0, tope 0) | Permite migrar por olas sin perder el control |
| Puertos con falla cerrada | `lib/ports.ts`, `lib/runtime/ports.ts` | Respuesta ya probada a «comunicar dominios sin importarlos» |
| Prueba de que todo puerto está conectado | `tests/architecture/e5-puertos.test.ts` | Patrón reutilizable para «todo sector está registrado» |
| Un registro de capacidades | `lib/capabilities/registry.ts` (ADR-0003) | Una sola fuente de módulos, menús y rutas |
| Vocabulario por receta | `VerticalTerms`, `VERTICAL_RECIPES` | Base del modelo de §3 |

### 1.3 Inventario de módulos (medido)

Columnas: archivos de producción / líneas / archivos que lo importan (app, components, lib, tests) / capa actual. «Naturaleza»: **G** = reutilizable por cualquier negocio, **S** = específico de un sector, **T** = transversal (técnico o de plataforma).

| Módulo | Arch. | LOC | Import. | Capa actual | Nat. | Responsabilidad real |
|---|---|---|---|---|---|---|
| `construction` | 39 | 11 421 | 54 | industry | S | Obras: APU, presupuestos, bitácora, plan Lean, cotizaciones, informes, importador de packs |
| `ops` | 25 | 3 042 | 68 | platform | T | Panel de Nexus como empresa: cuentas, cobranza, soporte, leads, bandeja, equipo, salud |
| `business` | 24 | 2 578 | 89 | business | G | **Mezcla** (ver H1): clientes, documentos, dinero, caja, agenda, productos, recibos |
| `admin` | 6 | 2 182 | 124 | core | T | **Mezcla** (H2): catálogo de sectores/módulos + BD de superadmin + usuarios/límites + íconos |
| `tenant` | 10 | 2 086 | 159 | core | T | Negocio activo: contexto, membresía, equipo, borrado, ajustes, `db.ts` (1 168 LOC) |
| `industry/gym` | 6 | 1 013 | 32 | industry | S | Socios, membresías, inscripción |
| `industry/museum` | 2 | 337 | 5 | industry | S | Aforo, franjas, venta de entradas |
| `presence` | 13 | 979 | 19 | business | G | Presencia en línea del negocio: pilares, madurez, sitio web |
| `benefits` | 3 | 906 | 14 | business | T | Códigos promocionales/de acceso a Nexus (tarjetas NFC/QR) |
| `onboarding` | 9 | 848 | 21 | experience | T | Alta de negocio: flujo, validación, presets, prefill |
| `motion` | 8 | 717 | 30 | experience | T | Animaciones |
| `inventory` | 5 | 716 | 19 | business | G | Existencias, kardex, traslados, conteos |
| `accounting` | 6 | 676 | 12 | finance | G | Plan de cuentas, libro, informes |
| `api` | 7 | 644 | 7 | integrations | T | API pública `/api/v1` (llaves, límites, OpenAPI) |
| `plans` | 5 | 644 | 36 | core | T | Catálogo comercial, precios, cotizador |
| `events` | 8 | 570 | 19 | core | T | Outbox, despachador, webhooks, firma, SSRF |
| `dashboard` | 8 | 527 | 12 | experience | T | Distribución del inicio, notificaciones, catálogo de gráficos |
| `data-exchange` | 3 | 526 | 4 | business | G | Importar/exportar CSV |
| `capabilities` | 2 | 515 | 15 | core | T | Registro de capacidades y ruta→módulo |
| `finance` | 5 | 451 | 44 | finance + foundation | G | Vocabulario de pagos y series (puros) + entrada de montos y lectura de comprobantes |
| `operations` | 9 | 431 | 24 | core + integrations | T | Motor de operaciones (API/MCP/pantalla) + definiciones + **registro raíz** |
| `purchasing` | 3 | 419 | 8 | business | G | Órdenes de compra, facturas de proveedor |
| `einvoice` | 6 | 388 | 7 | integrations | T | Facturación electrónica: cola, payload, proveedor HTTP |
| `pos` | 4 | 385 | 7 | business | G | Terminales, turnos, venta, devoluciones, recibo |
| `providers` | 6 | 374 | 8 | integrations | T | Conexiones y webhooks de pasarelas (Wompi, sandbox) |
| `auth` | 5 | 355 | 72 | core | T | Roles, permisos, autorización, apariencia de Clerk |
| `tax` | 2 | 354 | 14 | finance | G | Tarifas, retenciones, resoluciones de numeración |
| `payments` | 3 | 330 | 10 | finance | G | Intenciones de cobro, conciliación |
| `growth` | 2 | 265 | 8 | business | G | Enlaces de campaña, reseñas |
| `qr` | 1 | 248 | 1 | foundation | T | Generador de QR |
| `catalog` | 2 | 243 | 1 | business | G | Variantes, códigos de barras, listas de precios |
| `store` | 4 | 236 | 9 | business | G | Tienda en línea |
| `navigation` | 3 | 233 | 32 | experience + core | T | Menú del negocio, «Crear», tipos de menú |
| `site` | 2 | 221 | 13 | experience | G | Sitio público del negocio |
| `parties` | 2 | 198 | 12 | core | G | Terceros (personas y empresas) |
| `format` | 1 | 196 | 109 | foundation | T | Formato de números y fechas |
| `functions` | 4 | 164 | 4 | automation | T | Página «Funciones»: qué módulos prender y sugerencias |
| `receivables` | 2 | 151 | 7 | finance + foundation | G | Cartera por cobrar/pagar |
| `usage` | 3 | 140 | 7 | core | T | Medidores y consumo frente a límites |
| `google` / `maps` | 2 / 2 | 127 / 141 | 6 / 1 | integrations | T | Ficha de Google / geocodificación y mapa |
| `mcp` | 1 | 113 | 1 | integrations | T | Servidor MCP |
| `runtime` | 1 | 93 | 1 | experience | T | **Raíz de composición** de puertos |
| `vertical-terms.ts` | 1 | 61 | 21 | core | T | Vocabulario por rubro |
| `files`, `hooks`, `fonts` | 1–2 | ≤57 | 3 / 10 / 1 | core / experience | T | Archivos del negocio; hooks de cliente; tipografías |
| 16 archivos sueltos de utilidad | 16 | ~1 000 | `utils` 159, `format` 109 | foundation | T | Fechas, SQL, transacciones, QR, límites de tasa… |
| `design`, `seo` | 0 | 0 | — | — | — | Carpetas con **solo una prueba** cada una (H16) |

### 1.4 Diagnóstico

Cada hallazgo indica evidencia. Ninguno se corrigió.

| # | Hallazgo | Evidencia | Por qué estorba el crecimiento |
|---|---|---|---|
| **H1** | `lib/business` es un cajón de varias responsabilidades | 24 archivos; su grafo interno tiene **11 componentes**: un clúster de 12 (documentos, dinero, caja, adjuntos, recibos) y 10 archivos aislados (agenda, clientes, notas, países, perfiles por rubro…). Incluye `receipt-share.ts` (dibuja en canvas del navegador) y `customer-fields.ts` (perfiles **por rubro**) | Cada módulo nuevo de Business «cabe» ahí, y la carpeta nunca dice qué contiene |
| **H2** | `lib/admin` mezcla cuatro cosas | `catalogs.ts` (71 importadores: rubros, módulos, recetas, términos) + `db.ts` (1 296 LOC, 62 importadores: superadmin, alta de negocios, auditoría) + `users-db`/`account-limits` + `vertical-icons.ts` (presentación). Está en *core*, pero `db.ts` es de plataforma. Genera el ciclo de tipos `admin/catalogs ⇄ capabilities/registry` | Cambiar la lista de sectores obliga a tocar el archivo más importado del repositorio junto con la BD de superadmin |
| **H3** | `lib/ops` contiene ~7 responsabilidades | 25 archivos: cuentas/cobranza/leads/salud/bandeja en un clúster de 17; equipo/permisos en otro de 5; soporte, satisfacción, presencia… Solo la importa `app/` (0 desde `lib`) | Sano hacia afuera, pero ningún límite interno |
| **H4** | La auditoría tiene 3 escritores y 1 envoltorio | `tenant/audit.ts`, `operations/audit.ts` y `admin/db.ts#logAudit` escriben `AuditLog`; `ops/audit.ts` envuelve al tercero (+ `admin/audit-labels.ts`) | Una nueva fuente de acciones escoge cuál copiar |
| **H5** | El conocimiento por sector está en ≥ 7 tablas + un enum de BD | `admin/catalogs` (etiquetas, recetas, términos, términos de cotización), `admin/vertical-icons`, `plans/catalog#VERTICAL_FACTORS`, `business/customer-fields#PROFILES`, `business/catalog-kinds#BY_VERTICAL`, `DEFAULT_MODULES_BY_VERTICAL`, y `enum Vertical` en `prisma/schema/core/tenant.prisma` | Agregar un sector toca ≥ 6 archivos **y una migración**. Es el obstáculo más concreto al crecimiento |
| **H6** | Los términos ya ocultan diferencias de proceso | En la receta de construcción `booking: "Proyecto"`; en restaurante `booking: "Mesa"`; en gimnasio `item: "Membresía"` (un producto genérico llamado membresía) | Es exactamente el riesgo señalado en la Parte 3: una etiqueta hace pasar un proyecto por una reserva |
| **H7** | Un rubro desconocido cae en gimnasio | `normalizeVertical` devuelve `"gym"` si no reconoce el valor | Un sector futuro sin definir mostraría «Socios, Clases, Membresías» |
| **H8** | `hasMemberAccess` decide por **sector**, no por **módulo activo** | `lib/vertical-terms.ts`; la hoja de ruta ya anotó que la ficha 360° consulta al gimnasio aunque `memberships` esté apagado | Una capacidad debería depender de que su módulo esté activo, no del rubro |
| **H9** | La capa `automation` no contiene automatización | Solo tiene `functions` (página «Funciones»: qué módulos prender y sugerencias); el sustrato real de eventos está en `events` (core) | Hay una capa declarada para una necesidad que aún no existe |
| **H10** | `integrations` mezcla adaptadores de salida y superficies de entrada | `providers`, `einvoice`, `google`, `maps` implementan puertos de otros; `api` y `mcp` exponen operaciones y solo dependen de Core (`operations`, `usage`, `tenant`) | Distintas reglas de dependencia en la misma capa |
| **H11** | Dos raíces de composición | `lib/runtime/ports.ts` (experience) y `lib/operations/registry.ts` (declarado `integrations`, vive en la carpeta de Core) | El «único lugar que lo conoce todo» está partido y mal ubicado |
| **H12** | `money-service` es Finance dentro de Business | `business/money-service.ts` (480 LOC, 30 importadores): registra cobros, gastos y caja; lo usan `pos`, `store`, `inventory`, `purchasing`, `payments` | Se dejó en Business para no multiplicar puertos (E5); sigue siendo una incongruencia conceptual |
| **H13** | Dos vocabularios de método de pago con nombres iguales | `finance/index#PAYMENT_METHODS` (CASH, NEQUI, WOMPI, TRANSFER) y `admin/catalogs#PAYMENT_METHODS` (CASH, TRANSFER, WOMPI, otras etiquetas); mismo nombre de tipo `PaymentMethodValue` | Hoy sirven a dominios distintos (pagos del negocio / cobranza de Nexus) pero se confunden fácil |
| **H14** | `lib/finance` reúne cosas de naturaleza distinta | `index`/`series` (puros, Foundation), `keypad`, `cop-amount`, `payment-scan` (ayudas de captura en pantalla) | La carpeta no describe su contenido |
| **H15** | Archivos > 600 líneas | `admin/db.ts` 1 296, `construction/shared.ts` 1 194, `tenant/db.ts` 1 168, `construction/budget.ts` 944, `benefits-db.ts` 633 | Dificultan división futura; `tenant/db.ts` ya está en la hoja de ruta |
| **H16** | Pruebas fuera de lugar | `lib/design/ui-rules.test.ts` y `lib/seo/metadata-routes.test.ts` (carpetas que solo contienen una prueba sobre `app/`), `lib/prisma8-query-patterns.integration.test.ts` suelta | Carpetas en `lib/` que no son módulos |
| **H17** | Una función genérica obliga a una dependencia | `business/customers-db.ts` importa `withinLimit` de `benefits/benefits.ts` | Business depende de «beneficios» por una comparación de una línea |
| **H18** | `onboarding` (experience) contiene reglas | `validation.ts` (281 LOC), `presets.ts`, `slug.ts`, `onboarding-db.ts` son reglas y datos del alta, no presentación | Experience no debería poseer reglas de negocio |
| **H19** | `presence` y `growth` están en Business por decisión de E0 | Miden la presencia en línea del negocio (análisis), no operan ventas | Candidatos a un dominio de análisis si aparece; hoy sin consumidores que lo exijan |
| **H20** | `lib/construction` fuera de `lib/industry/` | Conocido; etapa independiente | Dos convenciones de ruta para sectores |
| **H21** | La hoja de ruta está desactualizada | Su título dice «después de E3» y la sección 2 (documentación) sigue como pendiente | Solo se documenta aquí; no se corrige en esta fase |

---

## 2. Arquitectura conceptual revisada

### 2.1 Principios

1. **El área responde «¿quién puede importarme?»; el módulo responde «¿de qué soy responsable?».** Mezclar ambas preguntas en una sola carpeta es lo que produjo H1, H2 y H3.
2. **La estructura física refleja lo que el verificador puede comprobar.** Si una regla no se puede comprobar por script, no se convierte en carpeta.
3. **Crecer es agregar, no reorganizar.** El diseño se evalúa con una pregunta: *¿cuántos archivos compartidos se modifican para añadir X?* (§6.3).
4. **Nada para necesidades hipotéticas.** Una carpeta o área nueva requiere un caso real hoy (§4.3).

### 2.2 Evaluación de las categorías propuestas

| Categoría | Veredicto | Razón |
|---|---|---|
| **Foundation** | Sí | Existe y es correcta (sin importaciones de Nexus). Se ordena por subcarpeta solo donde hay ≥ 3 archivos afines |
| **Core** | Sí | Existe. Se afina: absorbe `api`/`mcp` (solo dependen de Core, H10), el catálogo de sectores (sale de `admin`) y la auditoría unificada (H4) |
| **Business** | Sí | Existe. `business/` deja de ser un módulo y pasa a ser un área con módulos propios (H1) |
| **Domains** | **Sí, con una sola familia hoy: `finance`.** Se llama así por el espacio que reserva, no porque existan más | Finance tiene 4–5 módulos con contratos propios y regla propia (puede importar Business; Business no la importa). *Automation* hoy no existe (H9), *Insights/Communication/Compliance* tampoco: **no se crean** |
| **Integrations** | Sí, **solo adaptadores de salida** | `providers`, `einvoice`, `google`, `maps`. Regla: implementan puertos de otros dominios |
| **Industry** | Sí | Existe. Cada sector es un paquete con `sector.ts` (§3) |
| **Experience** | Sí, **sin reglas de negocio** | Navegación, tablero, sitio, movimiento, hooks. Las reglas del alta (H18) salen hacia Core |
| **Platform** (nueva en la lista de 6, pero ya existe) | **Sí** | La operación de Nexus como empresa (`ops` + administración de superadmin). Regla distinta: puede importar todo menos industria y experiencia; ningún negocio la importa. Es de lo único que `ops` es dueño |
| **Runtime** (composición) | **Sí** | Es la raíz de composición, ya existe en `lib/runtime`. Regla única: puede importar todo; solo la importan los puntos de entrada (`instrumentation.ts`, pruebas) |
| **Shared / kernel** | **No como área** | La necesidad real existe (3 archivos puros con vocabulario compartido: `finance/index`, `finance/series`, `receivables/aging`) pero cabe en `foundation/kernel/` sin crear un área nueva |
| **Extensions** | **No ahora** | No hay hoy ningún requisito de código de terceros ni por negocio. El paquete de sector (§3) ya resuelve la extensión *de primera mano*; si un día llegan extensiones externas serán «sectores o módulos cargados dinámicamente» con el mismo contrato, y su introducción exigirá una decisión propia (§8, D-V10-8) |

Resultado: **9 áreas** (`foundation`, `core`, `business`, `domains`, `integrations`, `industry`, `platform`, `experience`, `runtime`). Hoy `layers.json` ya distingue 9 capas (foundation, core, business, finance, integrations, automation, platform, industry, experience): V10 las reordena, **elimina `automation` (vacía de contenido real)** y **convierte `finance` en la familia `finance` de `domains`**.

### 2.3 Cómo se relacionan los ejes

```
 ÁREA (regla de dependencia)       MÓDULO (responsabilidad + contrato)        SECTOR (paquete enchufable)
 foundation → nada                 business/documents  · domains/finance/tax    industry/gym/sector.ts
 core → foundation                 core/sectors        · integrations/google      industry/restaurant/sector.ts
 business → core                   ...                                            ↘ se registra en runtime
 domains → core, business          cada módulo declara qué expone y qué consume    ↘ el sector no es importado por nadie salvo runtime/experience
 ...
```

---

## 3. Terminología, capacidades y procesos por sector

### 3.1 Lo que existe hoy

`VerticalRecipe` = `{ modules, terms, memberAccess? }` y `VerticalTerms` = 7 términos obligatorios + 4 opcionales (`quotes`, `purchases`, `projects`, `newProject`, `profileTitle`). Se consume desde 14 archivos (`getVerticalTerms`) y 7 (`getQuoteTerms`). Es una buena base, con cuatro límites que V10 corrige en el diseño (H5–H8).

### 3.2 Tres conceptos, tres lugares

| Concepto | Pregunta | Qué cambia | Dónde vive (propuesto) | Quién lo consume |
|---|---|---|---|---|
| **Terminología** | ¿Cómo lo llama este sector? | Solo texto. Nunca validación, campos, estados, cálculos ni permisos | `industry/<sector>/sector.ts` → `terms`; esquema y claves en `core/sectors/lexicon.ts` | Cualquier módulo, vía `term(concept)` |
| **Capacidades** | ¿Qué funciones puede usar? | Qué módulos están disponibles/sugeridos y qué pantallas aparecen | `industry/<sector>/sector.ts` → `capabilities` (ids del registro); el registro sigue en `core/capabilities` | Onboarding, menú, página «Funciones», `isRouteEnabled` |
| **Procesos** | ¿Cómo se ejecuta la operación? | Reglas, estados, flujos, cálculos | **Código del sector** (`industry/<sector>/...`) que **implementa un contrato definido por el dominio dueño** (p. ej. un puerto de Business) | Solo el dominio dueño, vía el contrato |

**Prueba de decisión** (tres preguntas, en orden): (1) ¿cambiar la etiqueta exige cambiar también un campo, una validación, un estado, un cálculo, un permiso o una pantalla? Si sí, **no es terminología**. (2) ¿Es una función que se enciende o apaga? Es una **capacidad**. (3) ¿Cambia el orden o las reglas de una operación? Es un **proceso** y necesita un contrato en el dominio dueño.

Aplicación a los casos actuales:
- «Socio» por «Cliente», «Comensal», «Turista»: **terminología**.
- `booking: "Proyecto"` (construcción): una obra no es una reserva (tiene presupuesto, avances, APU). Debe ser la **capacidad `construction`** con su propio módulo, no el término `booking`. Hoy `bookings` no está en la receta de construcción, así que el término probablemente no se usa; **[no medido]** si algún lugar lo lee igualmente.
- `item: "Membresía"` (gimnasio): una membresía tiene inicio, fin, congelamiento y cancelación; un «producto» no. Es una **capacidad (`memberships`)** que además usa el término.
- `hasMemberAccess` (QR + estado de membresía): es una **capacidad** y debe activarse por módulo (`memberships` activo), no por `vertical === "gym"` ni por un `boolean` de la receta (H8).

### 3.3 Reglas del vocabulario (responden los 8 puntos de la Parte 3)

| # | Pregunta | Regla propuesta |
|---|---|---|
| 1 | Centralizar el vocabulario | Un archivo por sector (`industry/<sector>/sector.ts`) para lo que tiene código; los sectores **sin código** viven en un único catálogo de datos en `core/sectors/catalog.ts`. Nunca más de una fuente por sector |
| 2 | Evitar comparaciones dispersas | Ya garantizado por la regla R4 del verificador. V10 la mantiene y la amplía: ningún módulo compartido importa un `sector.ts`; todos leen `term()` / `hasCapability()` |
| 3 | Términos generales por defecto | Cadena de respaldo **sector → general → texto base del módulo**. El sector solo declara lo que cambia (como hoy, con campos opcionales). El sector `general` define todas las claves |
| 4 | Etiqueta vs. concepto | La prueba de §3.2. Si falla la pregunta 1, se crea una capacidad o un contrato, no un término |
| 5 | No ocultar procesos | Cada término del esquema tiene una nota «solo texto». Revisión de PR: un término nuevo que se use en una condición (`if`) o en un cálculo es un defecto. **Criterio verificable:** las claves de `lexicon.ts` solo pueden usarse como argumento de `term()` y renderizarse; una regla de lint puede prohibir comparar su resultado |
| 6 | Nuevos sectores sin tocar compartidos | Agregar `industry/<id>/sector.ts` + una línea en `runtime/sectors.ts` (registro explícito). Una prueba exige que todo `industry/*/sector.ts` esté registrado |
| 7 | Sectores desconocidos/heredados/futuros | Alias heredados siguen resolviéndose (`barber→beauty`…). Un valor **no reconocido** cae en `general`, **no en `gym`** (H7). Es un cambio de comportamiento: **requiere aprobación** (D-V10-5) |
| 8 | Que la receta no controle lo que es del dominio | La receta **declara** (términos, ids de capacidades, presets). **No ejecuta** nada. Lo que un dominio decide (precio, validación, permisos) sigue en su módulo, indexado por `sectorId` si hace falta. Ejemplo: el factor de precio por sector (`plans/catalog#VERTICAL_FACTORS`) es política comercial de Nexus y se queda en `core/entitlements`; los íconos son presentación y se quedan en `experience` |

### 3.4 Forma del paquete de sector

```ts
// industry/restaurant/sector.ts  (propuesto; no existe)
export const restaurant = defineSector({
  id: "restaurant",
  label: "Restaurante",
  terms: { customer: "Comensal", customers: "Comensales", purchases: "Compras de insumos" /* … */ },
  capabilities: { preset: ["orders", "inventory", "purchases", "payments", "finance"], specialized: ["kitchen", "tables"] },
  facets: {                      // datos que otros módulos interpretan; tipados en core/sectors/facets.ts
    customerProfile: [ /* campos */ ],
    productKinds: ["PRODUCT", "SERVICE"],
  },
});
```

- `facets` son *formas de datos* definidas en **Core** (sin importar Business), para que los sectores sin código puedan declarar perfil de cliente o tipos de producto en `core/sectors/catalog.ts` sin que Core dependa de Business. Hoy esos datos están en `business/customer-fields.ts` y `business/catalog-kinds.ts` (H5).
- **Procesos**: si el restaurante necesita, por ejemplo, un ciclo comanda→cocina→cuenta, el dominio dueño (Business) define el contrato (`OrderFulfillmentPort`) y `industry/restaurant/` lo implementa; `runtime/` lo conecta cuando la capacidad está activa. El sector **no** se importa desde Business.
- Un sector puede componer capacidades de `business`, `domains` e `integrations`; nadie los importa a él (regla R1 actual).

### 3.5 Obstáculo fuera del alcance de `lib/`

`Tenant.vertical` es un `enum Vertical` en Prisma. Mientras lo sea, **agregar un sector exige una migración** aunque todo el código esté listo. La solución (guardar el sector como texto validado por el registro de sectores) toca Prisma (P5/P6) y **no se incluye en V10**; queda documentada como dependencia (§8, D-V10-6).

---

## 4. Reglas de dependencia y contratos

### 4.1 Matriz de áreas (propuesta; `mayImport`)

| Área | Puede importar | Notas verificables |
|---|---|---|
| `foundation` | nada | Sin imports de Nexus. `kernel/` solo vocabulario puro (sin `db`, `fs`, `process.env`, red) |
| `core` | foundation | Sin sectores. Solo tipos de datos genéricos (`facets`) |
| `business` | foundation, core | Reutilizable: nunca importa `industry`, `domains` ni `integrations`; usa puertos |
| `domains` | foundation, core, business | Entre **familias** (`finance` ↔ otra futura) solo por contrato. Dentro de una familia, import directo |
| `integrations` | foundation, core, business, domains | Implementan puertos; los dominios no los importan |
| `industry` | foundation, core, business, domains, integrations | Un sector no importa a otro (R2). Nadie lo importa salvo `runtime` y `experience` (R1) |
| `platform` | foundation, core, business, domains, integrations | Ningún negocio la importa |
| `experience` | todas excepto `runtime` | Sin reglas de negocio propias |
| `runtime` | todas | Solo la importan los puntos de entrada y las pruebas |

Difiere de hoy en que `automation` desaparece (H9) y `finance` pasa a `domains`; `api`/`mcp` pasan a Core (H10).

### 4.2 Cuándo corresponde cada herramienta

| Necesidad | Herramienta | Criterio verificable |
|---|---|---|
| Lógica pura reutilizada por ≥ 2 módulos de la misma área | **Función compartida** dentro del módulo dueño | Se exporta desde un solo módulo; el resto la importa |
| Lógica pura que una **capa inferior** necesita | **`foundation/kernel`** | Sin imports de Nexus; el verificador de capas lo garantiza |
| Una responsabilidad con datos, reglas y contrato propios | **Módulo** (carpeta) | Pasa el test de §5.1 |
| Un conjunto de módulos que comparten reglas de negocio y se importan entre sí | **Familia** dentro de `domains` | ≥ 3 módulos con ≥ 1 dependencia interna cada uno |
| Un servicio especializado que Business necesita pero no puede importar | **Contrato (puerto)** | La llamada cruza el límite hacia una capa que Business no puede importar |
| Un comportamiento propio de un sector | **Extensión sectorial** | Solo aplica con un sector activo; implementa un contrato de un dominio |
| Una regla de dependencia nueva y distinta | **Área nueva** | Pasa el test de §4.3 |

**No hace falta un puerto cuando:** el consumidor ya puede importar al proveedor por la matriz (p. ej. `domains` → `business`, `industry` → todo lo de abajo); el dato es solo tipos; o la comunicación es de lectura pura sin transacción compartida. Un puerto se justifica por *límite de capa* y/o *transacción compartida*, no por costumbre.

### 4.3 Test para crear un área nueva (todos deben cumplirse)

1. Tiene una lista `mayImport` **distinta** de todas las existentes.
2. Existen **≥ 2 módulos** hoy que la necesitarían (o 1 con ≥ 500 líneas y consumidores reales).
3. Su regla se puede **comprobar por script** (el verificador la lee de `layers.json`).
4. No cabe como módulo en un área existente sin debilitar una regla.

Con ese test: `platform` y `runtime` pasan; `automation` no pasa hoy; `shared` no pasa (cabe en `foundation/kernel`); `extensions` no pasa.

### 4.4 Reglas adicionales

- **Proveedores externos** solo dentro de `integrations`, detrás de puertos declarados por el consumidor. Un adaptador nuevo = un módulo en `integrations/` + una línea en `runtime/ports.ts`.
- **Puertos**: cada uno declarado por el dominio consumidor, con falla cerrada y una prueba de que está conectado (patrón actual).
- **Ciclos de valores**: 0 (prueba de arquitectura existente). Los ciclos de tipos (hoy 4) se justifican con un comentario en el archivo o se eliminan; V10 propone eliminar el de `admin/catalogs ⇄ capabilities/registry` al separar `core/sectors`.
- **Superficie pública**: un módulo declara qué archivos son públicos (§6.4). **No** se recomienda un `index.ts` obligatorio: en Next.js, importar un barril desde un componente de cliente puede arrastrar código de servidor al paquete. Se usa una lista de exportación verificada por script.

---

## 5. Reglas para la evolución de módulos

Todos los criterios se pueden obtener con un script de solo lectura (propuesto: `scripts/arch-report.mjs`, no creado). Los umbrales son punto de partida y se calibran con el inventario de §1.3.

### 5.1 Crear un módulo cuando…

Se cumplen **todos**: (a) una responsabilidad nombrable en una frase sin «y»; (b) ≥ 1 archivo con exportaciones usadas por otros módulos (un contrato identificable); (c) ≥ 2 archivos o ≥ 150 líneas de lógica propia; (d) sus dependencias salientes no son un superconjunto de otro módulo (no es una porción de otro).

### 5.2 Dividir un módulo cuando…

Se cumple **al menos uno**: (a) su grafo interno de imports tiene **≥ 2 componentes conexos** con ≥ 2 archivos cada uno (hoy: `business` 11, `ops` 5, `admin` 2); (b) dos grupos de archivos tienen conjuntos de dependencias externas con < 50 % de solape; (c) más de 15 archivos o 2 500 líneas **y** (a) o (b); (d) un archivo supera 800 líneas con ≥ 3 funciones públicas de dominios distintos (`tenant/db.ts`).

### 5.3 Fusionar módulos cuando…

Se cumplen **todos**: (a) tienen un ciclo de imports entre sí o uno importa al otro y es su único importador; (b) ninguno tiene consumidores fuera del otro; (c) ambos son pequeños (< 300 líneas en total); (d) separarlos no los hace más probables de reutilizar. Ejemplo candidato: `tenant/audit` + `operations/audit` + `ops/audit` + `logAudit` de admin (H4) tras comprobar que sus contratos coinciden.

### 5.4 Reubicar un módulo cuando…

Se cumple: **su conjunto real de imports salientes viola o sobra frente a la lista de su área** (un módulo que solo importa `foundation` pero vive en `business`; o que importa `core` y vive en `integrations`: `api`/`mcp`), **y** la nueva ubicación no crea imports prohibidos (lo comprueba `pnpm check:layers` con el cambio aplicado).

### 5.5 Retirar un módulo cuando…

Se cumplen **todos**: (a) 0 importadores en producción (app, components, lib), contando pruebas aparte; (b) no aparece en el registro de capacidades ni en la tabla de operaciones; (c) ningún contrato público (API/MCP/OpenAPI) lo expone; (d) el cambio se hace en un commit separado, reversible. **Observación del inventario:** hoy no hay ningún candidato a retiro por importadores; `lib/design` y `lib/seo` no son módulos (solo una prueba cada una).

---

## 6. Arquitectura física propuesta

### 6.1 Árbol (no creado; ejemplos de lo que cambia, sin carpetas vacías)

```
lib/
├── foundation/
│   ├── db/              transaction, errors, sql-like
│   ├── time/            plain-date, bogota-month, calendar
│   ├── kernel/          payments (de finance/index), series (de finance/series), aging (de receivables/aging)
│   └── format.ts · ports.ts · rate-limit.ts · qr.ts · app-url.ts · image-upload.ts · contact.ts · init-scripts.ts · utils.ts · cn.ts · temporal.d.ts
│
├── core/
│   ├── tenancy/         contexto, membresía, equipo, ajustes, borrado, límites, alta (provisioning, validación/presets/slug del onboarding)
│   ├── auth/            roles, permisos, autorización
│   ├── audit/           (unificación de los 3 escritores y el envoltorio — pendiente de comprobar sus contratos)
│   ├── parties/  files/
│   ├── sectors/         lexicon, facets, registry, catalog (sectores sin código), defineSector — viene de admin/catalogs + vertical-terms
│   ├── capabilities/    registry, route-modules, nav-types, discovery (hoy lib/functions)
│   ├── entitlements/    plans, usage
│   ├── events/          outbox, despachador, webhooks, firma, SSRF
│   ├── operations/      motor, tipos, definiciones transversales
│   └── api/             handler, llaves, límites, OpenAPI, mcp/
│
├── business/
│   ├── customers/       clientes, notas, campos (la parte por sector pasa a los facets)
│   ├── catalog/         productos, variantes, códigos de barras, listas de precios, tipos de ítem
│   ├── documents/       tipos de documento, emisión, facturas, notas, recibos
│   ├── money/           money-service, caja, cargos, adjuntos  ← ubicación sujeta a D-V10-4 (¿Finance?)
│   ├── scheduling/      agenda y reservas (bookings, calendar)
│   ├── inventory/  purchasing/  pos/  store/  data-exchange/
│   └── growth/  presence/                    ← sujetos a D-V10-7 (¿dominio de análisis?)
│
├── domains/
│   └── finance/         accounting/  tax/  receivables/  payments/   (+ money/ si D-V10-4 lo decide)
│
├── integrations/        providers/  einvoice/  google/  maps/        (solo adaptadores de salida)
│
├── industry/
│   ├── gym/             sector.ts · memberships/ · members/ (lo existente)
│   ├── museum/          sector.ts · tickets/
│   ├── construction/    sector.ts · apu/ budget/ field-log/ lean/ quotes/ reports/   (movimiento propio, pendiente aparte)
│   └── restaurant/      (nace cuando se implemente; no antes)
│
├── platform/
│   ├── admin/           superadmin, negocios, usuarios, límites por cuenta
│   ├── billing/  support/  crm/  inbox/  team/  health/      (lo que hoy es ops/, dividido; ver §7)
│   └── benefits/        (códigos de acceso a Nexus; ubicación sujeta a D-V10-7)
│
├── experience/
│   ├── navigation/  dashboard/  onboarding/  site/  motion/  hooks/  fonts.ts
│   └── admin-visuals/   (íconos por sector; hoy admin/vertical-icons)
│
└── runtime/             ports.ts · operations.ts · sectors.ts   (raíces de composición)
```

### 6.2 Por qué esta forma y no el árbol de ejemplo

El árbol de ejemplo es un buen punto de partida conceptual. Se ajustó en estos puntos, cada uno con su evidencia:

| Del ejemplo | Aquí | Razón |
|---|---|---|
| `domains/` con finance, automation, integrations, booking, communication, insights, analytics | `domains/finance` **solamente** | Los demás no existen (H9) o son otra regla: `integrations` implementa puertos de dominios y no al revés → área propia. `booking` ya es `business/scheduling`. Crear `communication`, `insights`, `analytics` ahora serían carpetas vacías |
| `core/notifications`, `core/configuration`, `core/identity` | No se crean | No hay código que justifique cada una. `identity` ya es `auth` + Clerk; `notifications` hoy se arma en `dashboard` (experience); configuración está en `tenancy`/`sectors` |
| `shared/` y `extensions/` | No | Ver §2.2 |
| Carpetas por sector con sub-dominios (`kitchen/`, `tables/`, `orders/`…) | Subcarpetas **cuando el sector tenga ese código** | `gym` y `museum` hoy son ~6 y 2 archivos: subcarpetas vacías o de un archivo violan «evitar anidación excesiva» |
| `business/sales`, `suppliers`, `projects`, `workforce` | No | No existen como módulos hoy. «Sales» se identifica con `documents`; «projects» es `construction`; «suppliers» son terceros (`parties`); «workforce» no existe |

**Profundidad máxima propuesta:** `lib/<área>/<módulo>/<archivo>` (3 niveles) para casi todo; 4 niveles (`lib/<área>/<familia o módulo>/<submódulo>/<archivo>`) solo en `domains/finance` y en módulos con > 15 archivos (hoy solo `construction`).

### 6.3 Cómo evoluciona: qué se toca para crecer

| Caso | Qué se agrega | Archivos compartidos que se modifican | Qué prueba falla si se olvida algo |
|---|---|---|---|
| **Nuevo sector** (restaurante) | `industry/restaurant/sector.ts` (+ módulos si tiene código) | 1 línea en `runtime/sectors.ts` (+ el enum de BD hasta D-V10-6) | «todo `sector.ts` está registrado» |
| **Nueva capacidad compartida** (nómina) | Módulo en `business/` o `domains/` + entrada en el registro de capacidades | `core/capabilities/registry` (1 entrada) | prueba de rutas↔módulos existente |
| **Nuevo dominio especializado** (cumplimiento) | `domains/compliance/` solo si tiene regla de dependencia propia; si no, módulo en una familia | `layers.json` (si es familia nueva) | `pnpm check:layers` |
| **Nuevo proveedor** (Alegra) | `integrations/<proveedor>/` implementando el puerto existente | 1 línea en `runtime/ports.ts` | prueba de que todo puerto está conectado |
| **Nueva experiencia** (portal del cliente) | Módulo en `experience/` (+ rutas en `app/`) | ninguno de `lib/` | `check:layers` (experience no exporta reglas) |
| **Nueva necesidad transversal** (observabilidad) | Módulo en `foundation/` si es técnica y sin imports de Nexus; `core/` si conoce el negocio | ninguno | `check:layers` |
| **Módulo que crece** (`documents`) | Subcarpetas dentro del módulo al pasar los umbrales de §5.2 | ninguno fuera del módulo | `arch-report` (propuesto) |
| **Módulo que se divide** | Sus archivos pasan a dos módulos hermanos | imports del módulo anterior (codemod) | `tsc`, `check:layers` |

### 6.4 Superficie pública y manifiesto (opcional, no obligatorio al inicio)

Cada módulo puede declarar un `module.json` con dos campos: `public` (archivos que otros pueden importar) y, si hace falta, `consumes` (módulos que puede usar, más estricto que su área). Es **opt-in**: se agrega a un módulo cuando sus internos empiezan a ser importados por terceros. Evita imponer `index.ts` a ~60 módulos y el riesgo de barriles en Next.js.

---

## 7. Plan de migración incremental

**Principio:** cada paso es un commit reversible (`git revert`), se valida con `tsc`, `pnpm check:layers`, pruebas del área y `pnpm verify`, y se mueve con un codemod que actualiza imports y se prueba con `tsc`. Cantidades de archivos importadores de §1.3 (medidas); «**[no medido]**» donde falta.

> **Precaución previa:** D-1 (aprobada el 2026-10-30) decidió *no mover la organización física*. V10 propone revisarla. **Ningún paso de este plan debe empezar sin una decisión explícita que sustituya a D-1** (§8, D-V10-1).

### M0 — Preparar el verificador (sin mover nada)

| Campo | Contenido |
|---|---|
| Módulos | `scripts/check-layers.mjs`, `layers.json`, pruebas de arquitectura |
| Cambio | Que el verificador derive el área desde la **ruta** (`lib/<área>/…`) además de `units`; agregar `scripts/arch-report.mjs` (importadores, componentes, dependencias por área, umbrales de §5) |
| Justificación | Con el área en la ruta desaparecen las reclasificaciones por archivo (hoy 6) y el orden de la lista |
| Imports afectados | Ninguno |
| Riesgos | Bajo: el verificador debe seguir dando el mismo resultado sobre la estructura actual |
| Pruebas | Las 129 pruebas de arquitectura actuales + una que compare la clasificación vieja con la nueva para los 278 archivos |
| Aceptación | `check:layers` con el mismo resultado; `arch-report` reproduce las cifras de §1.3 |
| Reversible | Sí (`git revert`) |

### M1 — Raíz de composición única

| Campo | Contenido |
|---|---|
| Módulos | `operations/registry.ts` → `runtime/operations.ts` |
| Justificación | H11: dos raíces de composición; hoy una vive en Core aunque importa Business y presencia |
| Imports | 16 archivos importan `registry` |
| Riesgos | Bajo; el registro tiene una prueba de construcción |
| Pruebas | Pruebas de operaciones y del registro; `check:layers` |
| Aceptación | Ningún archivo de Core (motor de operaciones, tipos) importa Business; solo `runtime/` conoce las definiciones |
| Reversible | Sí |

### M2 — Catálogo de sectores a `core/sectors`

| Campo | Contenido |
|---|---|
| Módulos | `admin/catalogs.ts` (sectores, módulos, recetas, términos, alias) + `vertical-terms.ts` → `core/sectors/` (+ `lexicon`, `facets`); `admin/vertical-icons.ts` → `experience` |
| Justificación | H2, H5, H6, H7: separa la lista de sectores de la BD de superadmin; elimina el ciclo `catalogs ⇄ registry` |
| Imports | `admin/catalogs.ts` = **71** importadores; `vertical-terms.ts` = **21**; `vertical-icons` = 9 |
| Riesgos | Medio: es el archivo más importado. Mitigación: un solo codemod, verificado con `tsc` |
| Pruebas | `vocabulario-por-rubro`, `page-authorization`, `tenant-nav`, recetas de onboarding |
| Aceptación | 0 ciclos de tipos entre sectores y capacidades; mismos textos por rubro (prueba de equivalencia existente) |
| Reversible | Sí. **No incluye** cambiar el fallback a `general` (D-V10-5) |

### M3 — Dividir `business` en módulos

| Módulo nuevo | Archivos (hoy en `lib/business/`) | Importadores (del archivo mayor) |
|---|---|---|
| `business/customers` | `customers-db`, `customer-fields`, `customer-notes` | 14 |
| `business/catalog` | `products-db`, `catalog-kinds` (+ `lib/catalog`) | 17 |
| `business/documents` | `commercial-document`, `documents-db`, `invoice`, `invoices-db`, `charge`, `receipt-qr`, `receipt-share`, puertos `accounting`/`fiscal`/`numbering` | 22 (`documents-db`) |
| `business/money` | `money-service`, `money`, `money-error`, `cash`, `finance-db` | 30 (`money-service`) |
| `business/scheduling` | `bookings-db`, `calendar` | 9 |
| (a otra parte) | `countries` → `foundation`; `inventory.ts` (validación de stock) → `business/inventory` | 2 / 6 |

Justificación: H1. Riesgos: medio (muchos importadores; sin cambios de lógica). Orden dentro de M3: de menos a más importadores (`scheduling` → `customers` → `catalog` → `documents` → `money`). Cada módulo es un commit. Pruebas: las de cada módulo + integración de contabilidad, POS y tienda. Aceptación: cada módulo pasa §5.1; el grafo interno de cada uno tiene 1 componente. Reversible por commit. `money` queda sujeto a D-V10-4.

### M4 — Dividir `admin` y `ops` en `platform`

| Campo | Contenido |
|---|---|
| Módulos | `admin/db.ts`, `users-db`, `account-limits`, `audit-labels` → `platform/admin`; `ops/*` → `platform/{billing,support,crm,inbox,team,health}` según los 5 componentes medidos |
| Justificación | H2, H3 |
| Imports | `admin/db.ts` = 62 (11 desde `lib`); `ops/access.ts` = 39, `ops/leads.ts` = 17, todos desde `app/` (`ops` tiene 0 importadores en `lib`) |
| Riesgos | Medio-bajo: solo `app/` importa `ops` |
| Pruebas | Pruebas de `ops`, `admin`, panel `/admin` y `/ops` |
| Aceptación | Ningún negocio (`app/[tenant]`) importa `platform` |
| Reversible | Sí |

### M5 — `finance` como familia de `domains` y `kernel`

| Campo | Contenido |
|---|---|
| Módulos | `accounting`, `tax`, `receivables`, `payments` → `domains/finance/*`; `finance/index`, `finance/series`, `receivables/aging` → `foundation/kernel`; `finance/{keypad,cop-amount,payment-scan}` → `experience` o `business/money` según D-V10-4 |
| Justificación | H14; hace explícito el límite de la familia Finance |
| Imports | `finance/index` = 37; `tax` = 14; `accounting` = 12; `payments` = 10; `receivables` = 7 |
| Riesgos | Medio: `finance/index` lo importan 37 archivos |
| Pruebas | Contabilidad, impuestos, cartera y pagos (integración) |
| Aceptación | 0 imports de Finance hacia `industry`; los 3 archivos de `kernel` siguen sin imports de Nexus |
| Reversible | Sí |

### M6 — Core: `api`/`mcp`, `functions`, auditoría y reglas del alta

| Paso | Cambio | Justificación | Imports |
|---|---|---|---|
| M6a | `api` + `mcp` → `core/api` | H10: solo dependen de Core | 7 + 1 |
| M6b | `functions` → `core/capabilities/discovery` | H9 | 4 |
| M6c | Auditoría: comprobar si los 3 escritores (y el envoltorio de `ops`) comparten contrato; si sí, unificar en `core/audit` | H4 | 2 + 2 + 9 (`ops/audit`) + `logAudit` de admin |
| M6d | `onboarding/{validation,presets,slug,onboarding-db}` → `core/tenancy` (el flujo y los componentes se quedan en `experience`) | H18 | 1–4 cada uno |
| M6e | `withinLimit` de `benefits` → `foundation` | H17 | 1 |

Riesgos: bajo-medio (M6c solo si los contratos coinciden; si no, se documenta y no se fusiona).

### M7 — Registro de sectores y primer sector como prueba

| Campo | Contenido |
|---|---|
| Módulos | `runtime/sectors.ts`, `defineSector`, mover `gym` y `museum` a `industry/<sector>/sector.ts` con `terms`/`capabilities`/`facets` |
| Justificación | Cumple §3.4 y la respuesta a «nuevo sector» |
| Imports | `industry/gym` = 32 (no cambian sus rutas) |
| Riesgos | Medio: toca el flujo de recetas; depende de M2 |
| Pruebas | Equivalencia de textos y capacidades para los 18 rubros; prueba de «todo sector registrado» |
| Aceptación | Agregar un sector de prueba no requiere editar ningún módulo compartido salvo `runtime/sectors.ts` |
| Reversible | Sí |

### M8 — Pruebas y carpetas sin módulo

`lib/design`, `lib/seo` y `prisma8-query-patterns` → `tests/architecture` o `tests/integration` (H16). **Se coordina con la migración de las 151 pruebas, no se hace dentro de V10.**

### Orden y relaciones

M0 → M1 → M2 → M6a/b/e → M3 → M4 → M5 → M6c/d → M7. M2 y M3 son los de mayor riesgo y beneficio. Cada ola termina con `pnpm verify`.

| Trabajo independiente | Relación con V10 | ¿Entra en V10? |
|---|---|---|
| Migrar las 151 pruebas a `tests/` | Mueve las rutas de las pruebas; conviene decidir el orden antes de M3 (las pruebas colocalizadas se mueven con su módulo si no se migran antes) | No |
| `lib/construction` → `industry/construction` | Es el mismo movimiento que M7 prevé para el sector; V10 lo asume hecho o lo hace después | No |
| Dividir `tenant/db.ts` (1 168 LOC) | M2/M3 lo acotan sin tocarlo; su división sigue el criterio §5.2(d) | No |
| Prisma P3–P6 | D-V10-6 (sector como texto) depende de P5 | No |
| Datos históricos | Ninguna | No |

---

## 8. Riesgos y decisiones que necesitan aprobación

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| **D-V10-1** | **Sustituir D-1** («no mover la organización física») | A: no mover, solo documentar. B: mover por olas (M0–M8). C: árbol de ejemplo completo | **B**, con M0–M2 como primera autorización y revisión antes de M3. C crea áreas y carpetas sin contenido |
| **D-V10-2** | Nombre y número de áreas | 9 áreas (§2.2) vs. 6 del ejemplo + `shared` + `extensions` | Las 9. `platform` y `runtime` ya existen de hecho |
| **D-V10-3** | `domains/finance/<módulo>` (4 niveles) vs. `finance/<módulo>` (3) | Con `domains/` se reserva sitio para futuras familias; sin él se ahorra un nivel pero un segundo dominio exigiría mover Finance | `domains/finance`: es el único caso de cuatro niveles aceptado |
| **D-V10-4** | ¿`money-service` pasa a Finance? (H12) | A: queda en `business/money`. B: pasa a `domains/finance/money` y Business lo usa por puerto (30 importadores y varias transacciones) | **A** ahora; reevaluar cuando haya un segundo consumidor que no sea Business |
| **D-V10-5** | Rubro desconocido → `general` en lugar de `gym` (H7) | Cambio de comportamiento pequeño pero visible | Sí, con prueba y aviso |
| **D-V10-6** | `Tenant.vertical` de enum a texto validado | Quita la migración por sector. Toca Prisma | Fuera de V10; dependencia anotada para P5 |
| **D-V10-7** | Ubicación de `presence`, `growth` y `benefits` | `presence`/`growth`: dejar en `business` o crear una familia de análisis. `benefits`: `platform` | `benefits` → `platform`; `presence`/`growth` se quedan hasta que aparezca un segundo módulo de análisis (no crear la familia hoy) |
| **D-V10-8** | Extensiones de terceros | No introducir ahora | Sí. Reabrir cuando exista un requisito real de código externo o por negocio |
| **D-V10-9** | Capacidad `member-access` por módulo en vez de `memberAccess` por sector (H8) | Cambio de comportamiento: la ficha 360° dejaría de consultar el gimnasio con el módulo apagado | Sí, junto con M7 |

**Riesgos del plan:** (1) volumen de imports (1 941 en 673 archivos): mitigado con codemod + `tsc` en cada paso; (2) mezclar mover con cambiar lógica: V10 **no** cambia lógica, salvo D-V10-5 y D-V10-9, que son pasos separados; (3) conflictos con trabajo en paralelo: las olas deben ser cortas y coordinadas; (4) rutas de pruebas: coordinar con la migración de pruebas; (5) el verificador debe seguir dando el mismo resultado tras M0.

**Lo que no se verificó:** si algún lugar lee `terms.booking` en construcción (H6); los contratos de los escritores de auditoría (M6c); el número exacto de importadores de cada archivo de `ops` fuera de los medidos; que el rendimiento de compilación de Next no cambie con rutas más largas (no se espera, pero no se midió).

---

## 9. Comparación: estructura actual vs. propuesta

| Aspecto | Hoy | Propuesto |
|---|---|---|
| Entradas en `lib/` | ~60 carpetas y archivos sueltos | 9 áreas |
| Dónde se ve la capa de un módulo | Solo en `layers.json` (más 6 reclasificaciones por archivo) | En la **ruta** (`lib/<área>/…`) |
| Módulos con varias responsabilidades | `business`, `admin`, `ops`, `tenant/db.ts`, `finance`, `operations`, `navigation` | Cada carpeta describe una responsabilidad |
| Sectores | `construction` y `industry/*` en dos rutas; conocimiento en ≥ 7 tablas + enum | `industry/<sector>/sector.ts` + `core/sectors` + registro en `runtime` |
| Agregar un sector | ≥ 6 archivos + migración | 1 archivo nuevo + 1 línea (+ la migración hasta D-V10-6) |
| Composición | 2 raíces (`runtime`, `operations/registry`) | `runtime/` |
| Auditoría | 3 escritores + 1 envoltorio | 1 (si M6c lo permite) |
| Capas declaradas | 9 (incluye `automation` sin contenido) | 9 áreas, todas con contenido |
| Superficie pública | Convención | Opcional y verificada (`module.json`) |
| Crecimiento | Se decide caso a caso en `business`/`admin`/`ops` | §6.3 y §4.3: reglas medibles |

**Contra el árbol de ejemplo:** mismo espíritu de seis categorías, con tres diferencias de fondo: (1) sin carpetas para necesidades hipotéticas (`communication`, `insights`, `analytics`, `shared`, `extensions`, subdominios sectoriales vacíos); (2) se añaden las áreas que **ya existen** y tienen regla propia (`platform`, `integrations`, `runtime`); (3) `kernel` dentro de `foundation` en lugar de `shared/`.

---

## Apéndice A — Método

Scripts de solo lectura en el espacio temporal de la sesión (no forman parte del repositorio): inventario de módulos (archivos, líneas, capa según `scripts/check-layers.mjs`, importadores únicos), componentes conexos del grafo interno de imports (unión-búsqueda sobre imports reales, sin pruebas), matriz capa→capa y conteo de importadores por archivo. Se leyeron además las cabeceras y firmas de los archivos citados. Las cifras de importadores cuentan archivos distintos de app, components, lib y tests; las de líneas, archivos de producción (sin pruebas, historias ni `.d.ts`).

## Apéndice B — Defectos e inconsistencias documentados (no corregidos)

H1–H21 de §1.4. Los que cambiarían comportamiento son H7 (fallback a gym) y H8 (acceso de socios por sector); ambos quedan como decisiones D-V10-5 y D-V10-9. Ningún defecto se corrigió en esta fase.
