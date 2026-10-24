---
id: hoja-de-ruta
titulo: "Hoja de ruta de implementación: PR por PR, de lo más básico a lo más avanzado"
type: plan
created: 2026-10-24
updated: 2026-10-24
tags: [plan, pr, migraciones, sql, orden]
---

# Hoja de ruta de implementación

Cómo empezamos y en qué orden se construye lo descrito en
[`vision-negocio-conectado.md`](vision-negocio-conectado.md), respetando las
reglas de [`integracion-api-mcp-webhooks.md`](integracion-api-mcp-webhooks.md).
Son **30 PR** pequeños, en orden de dependencia, **de lo más básico a lo más
avanzado**. Cada uno deja el producto funcionando.

Los borradores de esquema de cada PR están en [`sql/`](sql/README.md) (19
archivos, **validados** contra un Postgres 16 desechable: se ejecutan sin
errores, son idempotentes y sus restricciones —partida doble, HTTPS en
webhooks, tercero único— se probaron).

---

## 1. Cómo trabajamos

### Reglas de cada PR

1. **Un solo tema, revisable en una sentada** (orientación: ≲ 600 líneas
   netas sin contar migraciones ni pruebas). Si crece, se parte.
2. **Aditivo y reversible:** tablas y columnas nuevas con valor por defecto; lo
   viejo sigue funcionando. Lo que se retira se hace en un PR posterior
   («contraer»), nunca en el mismo que lo reemplaza.
3. **Trae todo lo suyo:** contrato (`prisma/contract.prisma`) + migración +
   repositorio en `lib/` (con `tenantId`, `can()`, `money-service` y
   `logTenantAction`) + **operación en el registro** (API, MCP y evento, según
   la regla transversal) + pantalla si la hay + pruebas + docs + casillas
   marcadas en `.docs/capas/`.
4. **Detrás de interruptor** cuando cambia comportamiento visible: módulo o
   capacidad activable por negocio (registro de capacidades, ADR-0003); el
   código nuevo llega apagado y se prende por negocio.
5. **CI en verde** (tipos, ESLint, pruebas unitarias y de integración,
   Storybook + Playwright/axe si toca UI) y **migración probada** antes de
   fusionar.
6. **Se marca solo lo que existe de punta a punta** (pantalla → servidor →
   base), con la nota «hecho: dónde», y se regenera el progreso
   (`node scripts/capas-progreso.mjs --write`).

Ramas: `integracion/<tema>` (columna), `datos/<tema>`, `cobro/<tema>`,
`contabilidad/<tema>`, `visibilidad/<tema>`. PR apilados solo cuando dependen
de verdad; si no, todos contra `main`.

### Plantilla del PR (copiar)

```
## Qué cambia y por qué            (1–3 líneas; subcapas: X.00 …)
## Contrato y migración            (tablas/columnas; archivo sql/PR-NN; ¿relleno de datos?)
## Operaciones nuevas              (id · permiso · módulo · riesgo · eventos · herramienta MCP)
## Pantallas                       (o «sin cambios visibles»)
## Pruebas                         (unitarias · integración con base · contrato API · e2e)
## Aislamiento y permisos          (probado con dos negocios; roles)
## Integración                     (OpenAPI · MCP · evento · ejemplo n8n)
## Casillas marcadas               (.docs/capas/… _hecho: dónde_)
## Riesgos y plan de vuelta atrás
```

---

## 2. Cómo se migra

El esquema vive en **`prisma/contract.prisma`** y los cambios llegan con
**migraciones de Prisma 8** (`migrations/app/<fecha>_<nombre>/`); los
`docs/prod-sql/*.sql` son historia (producción se reconstruyó desde las
migraciones el 2026-10-23). Los archivos de [`sql/`](sql/README.md) son el
**diseño** que cada PR debe producir: sirven para revisar el modelo *antes* de
escribirlo en el contrato.

Por cada PR con tablas:

1. **Revisar el borrador** `sql/PR-NN-*.sql` (qué tablas, llaves, índices,
   `CHECK`s). Es lo que se discute en la revisión del diseño.
2. **Editar el contrato** (`contract.prisma`): modelos con `@@rls`, `tenantId`
   con `onDelete: Cascade`, texto en vez de enums de base, `Decimal` para
   dinero, `@@index`/`@@unique` como en el borrador.
3. **Planear la migración:** `pnpm exec prisma migration plan` (genera la
   carpeta con `migration.ts`, `ops.json` y `migration.json`). Si hace falta
   **relleno de datos** (p. ej. crear un `Party` por cada `Customer`, la
   bodega «Principal»), se escribe en el `migration.ts` como transformación de
   datos idempotente y se **vuelve a emitir** (`node migrations/app/<dir>/migration.ts`).
   Lo que Prisma no expresa (el *trigger* de partida doble, `CHECK`s,
   índices parciales) va como operación SQL en la misma migración.
4. **Probarla:** pruebas de integración con `TEST_DATABASE_URL`
   (`pnpm test:integration`) y `prisma db migrate` sobre una base limpia **y**
   sobre una copia con datos.
5. **Antes de fusionar:** `pnpm exec prisma db migrate --db <producción>`
   (regla vigente del proyecto), y recién ahí se fusiona y se despliega.
6. **Vuelta atrás:** se corrige hacia adelante (otro PR). Por eso todo es
   aditivo; las operaciones destructivas solo en un PR de «contraer» posterior
   y con su confirmación explícita.

> Si un borrador y la herramienta no coinciden en un detalle (nombres de
> índices, orden de columnas), manda la herramienta; lo que importa es el
> modelo, las llaves y las restricciones.

---

## 3. Los 30 PR, adaptados a las capas

**Las capas son la guía.** Cada PR cierra casillas concretas de
[`capas/`](capas/README.md): en el README de cada subcapa, la casilla pendiente
lleva `_(PR-NN)_`; cuando el PR existe de punta a punta, se marca `- [x]` con
_hecho: dónde_. De esas marcas salen solas las **capas**, los **niveles (N)** y
las **etiquetas** de cada PR. Un PR toca una o pocas subcapas y, casi siempre,
**un solo nivel**: se completa el N1 de la cadena antes de subir a N2.

Esta sección se genera con `node scripts/capas-pr.mjs --write` desde las
casillas (`scripts/capas-pr.data.mjs` guarda título, rama, dependencias y criterio
de «hecho»). No se edita a mano.

### Orden: olas de nivel sobre cadenas de valor

| Ola | Qué se cierra | PR | Capas |
| --- | --- | --- | --- |
| **0 · Integrable** | N1–N2 de la plataforma de integración | 01–07 | X, I, IX, VI |
| **1 · Datos maestros** | N1 de tercero, catálogo e inventario; N2 de variantes y bodegas | 08–12 | I, IV, VI |
| **2 · Documento y cobro** | N1 de impuestos, cartera y POS; N2 de POS y devoluciones | 13–16 | VII, V |
| **3 · Cobrar y facturar** | N1 de pagos y de factura electrónica (con puertos) | 17–20 | V, VII |
| **4 · Contabilidad** | N1 del motor contable; N2 de PUC y asientos | 21–23 | I, VII |
| **5 · Visible y vende** | N1 de sitio, tienda, SEO, reputación, atribución | 24–28 | II, III, V |
| **6 · Pulso** | Casillas nuevas de madurez NEXUS (objetivo 2026) | 29–30 | II, IX |

### Etiquetas de cada PR

`capa-I … capa-XI` · `N0 … N6` · `tipo:ui | docs | integracion | migracion | pwa | a11y` ·
`hito-1-integrable … hito-6-pulso` (los de la interfaz llevan `base-ui`).

<!-- pr:inicio -->
| PR | Hito | Qué | Capas | Niveles | Casillas | Esquema | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **01** | Integrable | Registro de operaciones | — | — | base técnica | — | pendiente |
| **02** | Integrable | API /api/v1 de lectura y llaves por negocio | X | N1, N2 | 6/7 | `PR-02-api-llaves` | pendiente |
| **03** | Integrable | Outbox y webhooks firmados | I | N1, N2 | 2/2 | `PR-03-outbox-webhooks` | hecho |
| **04** | Integrable | Servidor MCP de solo lectura | IX, X | N1, N2 | 2/2 | — | hecho |
| **05** | Integrable | Origen en la bitácora y cupos de uso | I | N1 | 1/1 | `PR-05-uso-y-origen` | hecho |
| **06** | Integrable | Conexiones externas y puertos | V | N1 | 0/1 | `PR-06-conexiones-externas` | pendiente |
| **07** | Integrable | n8n en casa: túnel, nodo y plantillas | VI | N1 | 0/1 | — | pendiente |
| **08** | Vende y controla | Tercero único mínimo | I, IV | N1, N2 | 0/5 | `PR-08-terceros` | pendiente |
| **09** | Vende y controla | Catálogo maestro: variantes, códigos de barras y precios | I, V | N2 | 0/4 | `PR-09-catalogo-maestro` | pendiente |
| **10** | Vende y controla | Inventario I: bodegas y kardex con costo | VI | N1, N2 | 0/4 | `PR-10-inventario-bodegas-kardex` | pendiente |
| **11** | Vende y controla | Inventario II: traslados, conteos y compras | VI | N1, N2 | 0/7 | `PR-11-traslados-conteos-compras` | pendiente |
| **12** | Vende y controla | Importar y exportar clientes y catálogo | I, IV | N1 | 0/2 | — | pendiente |
| **13** | Vende y controla | Impuestos y numeración por resolución | I, VII | N1, N2 | 0/8 | `PR-13-impuestos-y-numeracion` | pendiente |
| **14** | Vende y controla | Cartera: cuentas por cobrar y por pagar | VII | N1 | 0/2 | `PR-14-cartera` | pendiente |
| **15** | Vende y controla | POS I: terminales, turnos y venta multilínea | V | N2 | 0/3 | `PR-15-pos-terminales-turnos` | pendiente |
| **16** | Vende y controla | POS II: impresión, código de barras y devoluciones | V | N2 | 0/3 | — | pendiente |
| **17** | Cobra y factura | Pagos: intención de cobro, Nequi y conciliación | V | N1, N2 | 0/8 | `PR-17-pagos-intenciones-conciliacion` | pendiente |
| **18** | Cobra y factura | Facturación electrónica: puerto sin proveedor | VII | N1, N2 | 0/7 | `PR-18-facturacion-electronica` | pendiente |
| **19** | Cobra y factura | Adaptador de pagos Wompi | V | N2 | 0/1 | — | pendiente |
| **20** | Cobra y factura | Proveedor tecnológico DIAN | VII | N2 | 0/1 | — | pendiente |
| **21** | Contabilidad | Contabilidad I: plan de cuentas, períodos y reglas | I, VII | N1, N2 | 0/4 | `PR-21-contabilidad-plan-y-periodos` | pendiente |
| **22** | Contabilidad | Contabilidad II: asientos automáticos y partida doble | I, VII | N1, N2 | 0/4 | `PR-22-contabilidad-asientos` | pendiente |
| **23** | Contabilidad | Estados financieros y exportación al contador | VII | N1, N2 | 0/4 | — | pendiente |
| **24** | Visible y vende en línea | Presencia v2: pilares, fases y tendencia | II | N2 | 0/1 | `PR-24-presencia-v2` | pendiente |
| **25** | Visible y vende en línea | Mini-sitio con catálogo y SEO técnico | II | N1 | 0/6 | `PR-25-sitio-y-catalogo-publico` | pendiente |
| **26** | Visible y vende en línea | Tienda en línea: carrito, pedido y pago | V | N1 | 0/5 | `PR-26-tienda-carrito-y-envios` | pendiente |
| **27** | Visible y vende en línea | SEO local y Google Business | II | N1 | 0/1 | — | pendiente |
| **28** | Visible y vende en línea | Reputación y atribución de ventas | II, III | N1 | 0/5 | `PR-28-reputacion-y-atribucion` | pendiente |
| **29** | Pulso del negocio | Calculadores de madurez (fase B) | IX | N2 | 0/1 | — | pendiente |
| **30** | Pulso del negocio | Transición de fase y avisos | IX | N2 | 0/1 | — | pendiente |

### PR-01 · Registro de operaciones

- **Rama:** `integracion/registro-de-operaciones` · **Hito:** 1 · Integrable
- **Etiquetas:** `tipo:integracion` `hito-1-integrable`
- **Depende de:** —
- **Esquema:** sin tablas nuevas
- **Nota:** Declarar una operación una vez (módulo, permiso, esquema, riesgo, eventos) y registrar las lecturas que ya existen. No cierra casillas por sí solo: es la base técnica de X.02 (PR-02).
- **Hecho cuando:** Toda operación tiene permiso, módulo, esquema y riesgo (prueba); las lecturas registradas son las mismas que usan las pantallas.

### PR-02 · API /api/v1 de lectura y llaves por negocio

- **Rama:** `integracion/api-v1-y-llaves` · **Hito:** 1 · Integrable
- **Etiquetas:** `capa-X` `N1` `N2` `tipo:integracion` `tipo:migracion` `hito-1-integrable`
- **Depende de:** PR-01
- **Esquema:** [`sql/PR-02-api-llaves.sql`](sql/PR-02-api-llaves.sql)
- **Hecho cuando:** Una llave de prueba lee clientes y ventas de su negocio y de ningún otro (prueba con dos negocios); OpenAPI publicado; límites y errores RFC 9457.
- **Casillas que marca:**
  - [`X.02 · N1`](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/02-API-Webhooks-y-Marketplace-de-Modulos/README.md)
    - [x] Llaves de API por negocio _hecho: lib/api/keys.ts + Ajustes → Integraciones_
    - [x] API REST documentada _hecho: GET /api/v1/openapi.json, generado del registro_
    - [x] Límite de peticiones _hecho: lib/api/rate-limit.ts, 120/min por llave, en memoria_
    - [x] API interna `/api/v1` de solo lectura sobre los repositorios de `lib/` (contexto, permisos, módulos y bitácora)
  - [`X.02 · N2`](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/02-API-Webhooks-y-Marketplace-de-Modulos/README.md)
    - [ ] Documentación pública interactiva
    - [x] Alcances (scopes) granulares _hecho: lib/api/scopes.ts_
    - [x] Versionado de la API _hecho: prefijo /api/v1_

### PR-03 · Outbox y webhooks firmados

- **Rama:** `integracion/outbox-y-webhooks` · **Hito:** 1 · Integrable
- **Etiquetas:** `capa-I` `N1` `N2` `tipo:integracion` `tipo:migracion` `hito-1-integrable`
- **Depende de:** PR-01
- **Esquema:** [`sql/PR-03-outbox-webhooks.sql`](sql/PR-03-outbox-webhooks.sql)
- **Hecho cuando:** Un receptor de prueba recibe `sale.completed` firmado; si cae, reintenta y al volver recibe todo; reenvío manual.
- **Casillas que marca:**
  - [`I.05 · N1`](capas/I-Fundacion-Nucleo-e-Infraestructura/05-Motor-de-Eventos-y-Webhooks/README.md)
    - [x] Webhooks salientes _hecho: lib/events/dispatcher.ts + app/api/cron/webhooks_
  - [`I.05 · N2`](capas/I-Fundacion-Nucleo-e-Infraestructura/05-Motor-de-Eventos-y-Webhooks/README.md)
    - [x] Webhooks firmados _hecho: lib/events/signing.ts (HMAC-SHA256, rotación de secreto)_

### PR-04 · Servidor MCP de solo lectura

- **Rama:** `integracion/mcp-de-solo-lectura` · **Hito:** 1 · Integrable
- **Etiquetas:** `capa-IX` `capa-X` `N1` `N2` `tipo:integracion` `hito-1-integrable`
- **Depende de:** PR-02
- **Esquema:** sin tablas nuevas
- **Hecho cuando:** Un cliente MCP lista solo las herramientas que permite su llave y responde «¿cómo nos fue hoy?» con datos reales.
- **Casillas que marca:**
  - [`IX.04 · N1`](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/04-Copiloto-de-Inteligencia-Artificial/README.md)
    - [x] Agente de consulta de solo lectura: ventas, caja, clientes e inventario con datos reales
  - [`X.02 · N2`](capas/X-Plataforma-SaaS-Gobernanza-y-Escalabilidad/02-API-Webhooks-y-Marketplace-de-Modulos/README.md)
    - [x] MCP de NEXUS: capa delgada sobre la misma API, sin reglas propias

### PR-05 · Origen en la bitácora y cupos de uso

- **Rama:** `integracion/origen-y-cupos` · **Hito:** 1 · Integrable
- **Etiquetas:** `capa-I` `N1` `tipo:integracion` `tipo:migracion` `hito-1-integrable`
- **Depende de:** PR-02
- **Esquema:** [`sql/PR-05-uso-y-origen.sql`](sql/PR-05-uso-y-origen.sql)
- **Hecho cuando:** Cada acción por API/MCP deja quién fue; superar el cupo devuelve 429.
- **Casillas que marca:**
  - [`I.04 · N1`](capas/I-Fundacion-Nucleo-e-Infraestructura/04-Multi-Tenancy-y-Aislamiento-de-Datos/README.md)
    - [x] Medición de uso _hecho: lib/usage/meters.ts (UsageCounter, cupo mensual con 429) y origen en la bitácora (lib/operations/audit.ts)_

### PR-06 · Conexiones externas y puertos

- **Rama:** `integracion/conexiones-y-puertos` · **Hito:** 1 · Integrable
- **Etiquetas:** `capa-V` `N1` `tipo:integracion` `tipo:migracion` `hito-1-integrable`
- **Depende de:** PR-03
- **Esquema:** [`sql/PR-06-conexiones-externas.sql`](sql/PR-06-conexiones-externas.sql)
- **Hecho cuando:** Un webhook de prueba entra con firma válida, se guarda una sola vez y se procesa; con firma inválida se rechaza.
- **Casillas que marca:**
  - [`V.00 · N1`](capas/V-Ventas-Digitales-Comercio-y-Pagos/00-Pasarelas-de-Pago-e-Integraciones-Financieras/README.md)
    - [ ] Una pasarela (Wompi o la que elijas) conectada

### PR-07 · n8n en casa: túnel, nodo y plantillas

- **Rama:** `integracion/n8n-en-casa` · **Hito:** 1 · Integrable
- **Etiquetas:** `capa-VI` `N1` `tipo:integracion` `tipo:docs` `hito-1-integrable`
- **Depende de:** PR-02, PR-03
- **Esquema:** sin tablas nuevas
- **Hecho cuando:** Un flujo real en casa reacciona a un evento y, tras apagar n8n un rato, se pone al día al volver.
- **Casillas que marca:**
  - [`VI.08 · N1`](capas/VI-Operacion-Productividad-y-Logistica/08-Automatizaciones-y-Flujos-de-Trabajo/README.md)
    - [ ] n8n conectado a NEXUS por la API con llave del negocio (nunca a la base)

### PR-08 · Tercero único mínimo

- **Rama:** `datos/tercero-unico` · **Hito:** 2 · Vende y controla
- **Etiquetas:** `capa-I` `capa-IV` `N1` `N2` `tipo:migracion` `hito-2-vende-y-controla`
- **Depende de:** —
- **Esquema:** [`sql/PR-08-terceros.sql`](sql/PR-08-terceros.sql)
- **Hecho cuando:** Cada cliente tiene su tercero; un NIT repetido en el mismo negocio es imposible; un proveedor se crea sin ser cliente.
- **Casillas que marca:**
  - [`I.00 · N1`](capas/I-Fundacion-Nucleo-e-Infraestructura/00-Nucleo-Transversal-y-Modelo-de-Tercero-Unico/README.md)
    - [ ] Tercero único con roles
  - [`I.01 · N1`](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md)
    - [ ] Clientes y proveedores
  - [`I.01 · N2`](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md)
    - [ ] Ficha de tercero completa
    - [ ] Detección de duplicados
  - [`IV.00 · N1`](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/00-Perfil-Integral-del-Cliente-CRM-360/README.md)
    - [ ] Empresas / clientes

### PR-09 · Catálogo maestro: variantes, códigos de barras y precios

- **Rama:** `datos/catalogo-maestro` · **Hito:** 2 · Vende y controla
- **Etiquetas:** `capa-I` `capa-V` `N2` `tipo:migracion` `hito-2-vende-y-controla`
- **Depende de:** PR-08
- **Esquema:** [`sql/PR-09-catalogo-maestro.sql`](sql/PR-09-catalogo-maestro.sql)
- **Hecho cuando:** Un producto con tallas y dos listas de precios se busca por código de barras.
- **Casillas que marca:**
  - [`I.01 · N2`](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md)
    - [ ] Variantes
    - [ ] Listas de precios
    - [ ] Clasificación fiscal por ítem
  - [`V.03 · N2`](capas/V-Ventas-Digitales-Comercio-y-Pagos/03-Punto-de-Venta-Fisico-y-Movil-POS/README.md)
    - [ ] Catálogo con búsqueda, categorías y código de barras.

### PR-10 · Inventario I: bodegas y kardex con costo

- **Rama:** `datos/inventario-bodegas-y-kardex` · **Hito:** 2 · Vende y controla
- **Etiquetas:** `capa-VI` `N1` `N2` `tipo:migracion` `hito-2-vende-y-controla`
- **Depende de:** PR-09
- **Esquema:** [`sql/PR-10-inventario-bodegas-kardex.sql`](sql/PR-10-inventario-bodegas-kardex.sql)
- **Hecho cuando:** Una venta descuenta con costo; el kardex cuadra con el stock; dos ventas simultáneas no dejan stock negativo.
- **Casillas que marca:**
  - [`VI.04 · N1`](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md)
    - [ ] Descuento automático al facturar y suma al recibir compras.
  - [`VI.04 · N2`](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md)
    - [ ] Múltiples bodegas
    - [ ] Kardex
    - [ ] Método de costeo

### PR-11 · Inventario II: traslados, conteos y compras

- **Rama:** `datos/traslados-conteos-y-compras` · **Hito:** 2 · Vende y controla
- **Etiquetas:** `capa-VI` `N1` `N2` `tipo:migracion` `hito-2-vende-y-controla`
- **Depende de:** PR-08, PR-10
- **Esquema:** [`sql/PR-11-traslados-conteos-compras.sql`](sql/PR-11-traslados-conteos-compras.sql)
- **Hecho cuando:** Recibir una compra sube stock y costo; un conteo con diferencia genera su ajuste con motivo.
- **Casillas que marca:**
  - [`VI.04 · N2`](capas/VI-Operacion-Productividad-y-Logistica/04-Inventarios-Bodegas-y-Logistica/README.md)
    - [ ] Stock mínimo, máximo y punto de reorden
    - [ ] Conteos físicos y ajustes por inventario
  - [`VI.05 · N1`](capas/VI-Operacion-Productividad-y-Logistica/05-Compras-y-Gestion-de-Proveedores/README.md)
    - [ ] Orden de compra
    - [ ] Registro de la factura del proveedor
    - [ ] Entrada de mercancía al inventario al recibir.
    - [ ] Ficha de proveedor
    - [ ] Listado y búsqueda

### PR-12 · Importar y exportar clientes y catálogo

- **Rama:** `datos/importar-y-exportar` · **Hito:** 2 · Vende y controla
- **Etiquetas:** `capa-I` `capa-IV` `N1` `hito-2-vende-y-controla`
- **Depende de:** PR-08, PR-09
- **Esquema:** sin tablas nuevas
- **Hecho cuando:** Un archivo de 2 000 filas se importa con reporte de errores por fila; reimportar es idempotente.
- **Casillas que marca:**
  - [`I.01 · N1`](capas/I-Fundacion-Nucleo-e-Infraestructura/01-Catalogo-Maestro-de-Productos-y-Servicios/README.md)
    - [ ] Importación desde Excel con validación.
  - [`IV.00 · N1`](capas/IV-Gestion-Comercial-y-Relacion-con-Clientes/00-Perfil-Integral-del-Cliente-CRM-360/README.md)
    - [ ] Importar y exportar

### PR-13 · Impuestos y numeración por resolución

- **Rama:** `cobro/impuestos-y-numeracion` · **Hito:** 2 · Vende y controla
- **Etiquetas:** `capa-I` `capa-VII` `N1` `N2` `tipo:migracion` `hito-2-vende-y-controla`
- **Depende de:** PR-08, PR-09
- **Esquema:** [`sql/PR-13-impuestos-y-numeracion.sql`](sql/PR-13-impuestos-y-numeracion.sql)
- **Hecho cuando:** Una venta con IVA 19 % y 5 % y retefuente calcula bien (casos de un contador); la numeración respeta el rango y avisa.
- **Casillas que marca:**
  - [`I.00 · N1`](capas/I-Fundacion-Nucleo-e-Infraestructura/00-Nucleo-Transversal-y-Modelo-de-Tercero-Unico/README.md)
    - [ ] Impuestos y retenciones parametrizables con vigencia
    - [ ] Numeración y resoluciones
  - [`VII.03 · N1`](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/03-Documentos-Transaccionales-y-Reglas-Fiscales/README.md)
    - [ ] Impuestos y retenciones parametrizables con vigencia
    - [ ] Numeración y resoluciones
    - [ ] Beneficiario
    - [ ] Tipo de comprobante
  - [`VII.04 · N2`](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/04-Facturacion-Electronica-y-RADIAN/README.md)
    - [ ] Impuestos por ítem y por tercero
    - [ ] Gestión de resoluciones y consecutivos

### PR-14 · Cartera: cuentas por cobrar y por pagar

- **Rama:** `cobro/cartera` · **Hito:** 2 · Vende y controla
- **Etiquetas:** `capa-VII` `N1` `tipo:migracion` `hito-2-vende-y-controla`
- **Depende de:** PR-13
- **Esquema:** [`sql/PR-14-cartera.sql`](sql/PR-14-cartera.sql)
- **Hecho cuando:** Un abono baja el saldo en la misma transacción; el reporte por antigüedad suma la cartera.
- **Casillas que marca:**
  - [`VII.02 · N1`](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/02-Cuentas-por-Cobrar-Cuentas-por-Pagar-y-Cartera/README.md)
    - [ ] Cuentas por cobrar
    - [ ] Cuentas por pagar

### PR-15 · POS I: terminales, turnos y venta multilínea

- **Rama:** `cobro/pos-terminales-y-turnos` · **Hito:** 2 · Vende y controla
- **Etiquetas:** `capa-V` `N2` `tipo:migracion` `hito-2-vende-y-controla`
- **Depende de:** PR-10, PR-13
- **Esquema:** [`sql/PR-15-pos-terminales-turnos.sql`](sql/PR-15-pos-terminales-turnos.sql)
- **Hecho cuando:** Un cajero abre turno, vende 5 líneas con efectivo + Nequi y cierra con arqueo; todo descuenta inventario.
- **Casillas que marca:**
  - [`V.03 · N2`](capas/V-Ventas-Digitales-Comercio-y-Pagos/03-Punto-de-Venta-Fisico-y-Movil-POS/README.md)
    - [ ] Descuentos, propinas y pago mixto
    - [ ] Turnos por cajero
    - [ ] Funciona en celular y tablet.

### PR-16 · POS II: impresión, código de barras y devoluciones

- **Rama:** `cobro/pos-impresion-y-devoluciones` · **Hito:** 2 · Vende y controla
- **Etiquetas:** `capa-V` `N2` `hito-2-vende-y-controla`
- **Depende de:** PR-15
- **Esquema:** sin tablas nuevas
- **Hecho cuando:** Escanear agrega la línea; una devolución genera su nota crédito y reingresa el stock.
- **Casillas que marca:**
  - [`V.03 · N2`](capas/V-Ventas-Digitales-Comercio-y-Pagos/03-Punto-de-Venta-Fisico-y-Movil-POS/README.md)
    - [ ] Impresoras térmicas
  - [`V.06 · N2`](capas/V-Ventas-Digitales-Comercio-y-Pagos/06-Ventas-Pedidos-y-Entregas/README.md)
    - [ ] Notas crédito y débito
    - [ ] Devoluciones

### PR-17 · Pagos: intención de cobro, Nequi y conciliación

- **Rama:** `cobro/pagos-intencion-y-conciliacion` · **Hito:** 3 · Cobra y factura
- **Etiquetas:** `capa-V` `N1` `N2` `tipo:integracion` `tipo:migracion` `hito-3-cobra-y-factura`
- **Depende de:** PR-06, PR-14
- **Esquema:** [`sql/PR-17-pagos-intenciones-conciliacion.sql`](sql/PR-17-pagos-intenciones-conciliacion.sql)
- **Hecho cuando:** Cobrar por enlace sandbox → webhook → pago confirmado una sola vez aunque el webhook llegue repetido; la conciliación marca una diferencia sembrada.
- **Casillas que marca:**
  - [`V.00 · N1`](capas/V-Ventas-Digitales-Comercio-y-Pagos/00-Pasarelas-de-Pago-e-Integraciones-Financieras/README.md)
    - [ ] Pago con tarjeta, PSE y Nequi desde un checkout alojado por la pasarela.
    - [ ] Confirmación de pago por webhook y estado visible en la orden.
    - [ ] Nequi Negocios: QR dinámico e intención de cobro; solo se registra el ingreso con el estado oficial
  - [`V.00 · N2`](capas/V-Ventas-Digitales-Comercio-y-Pagos/00-Pasarelas-de-Pago-e-Integraciones-Financieras/README.md)
    - [ ] Reembolsos totales y parciales
    - [ ] Conciliación diaria
  - [`V.01 · N1`](capas/V-Ventas-Digitales-Comercio-y-Pagos/01-Enlaces-y-Solicitudes-de-Cobro/README.md)
    - [ ] Link de pago
    - [ ] Botón de pago
    - [ ] Estado del link (pendiente, pagado, vencido).

### PR-18 · Facturación electrónica: puerto sin proveedor

- **Rama:** `cobro/facturacion-electronica-puerto` · **Hito:** 3 · Cobra y factura
- **Etiquetas:** `capa-VII` `N1` `N2` `tipo:integracion` `tipo:migracion` `hito-3-cobra-y-factura`
- **Depende de:** PR-06, PR-13, PR-17
- **Esquema:** [`sql/PR-18-facturacion-electronica.sql`](sql/PR-18-facturacion-electronica.sql)
- **Hecho cuando:** Toda venta genera su documento fiscal y queda PENDING_PROVIDER; el sandbox lo acepta o rechaza con causa legible; vender nunca se bloquea.
- **Casillas que marca:**
  - [`VII.04 · N1`](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/04-Facturacion-Electronica-y-RADIAN/README.md)
    - [ ] Factura electrónica
    - [ ] Datos del emisor y del adquirente
    - [ ] PDF y XML
    - [ ] Documento soporte
    - [ ] Factura electrónica por proveedor tecnológico detrás de un puerto (`EInvoicePort`); no firmar XML propio
  - [`VII.04 · N2`](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/04-Facturacion-Electronica-y-RADIAN/README.md)
    - [ ] Factura automática
    - [ ] Estado ante la DIAN

### PR-19 · Adaptador de pagos Wompi

- **Rama:** `cobro/wompi` · **Hito:** 3 · Cobra y factura
- **Etiquetas:** `capa-V` `N2` `tipo:integracion` `hito-3-cobra-y-factura`
- **Depende de:** PR-17
- **Esquema:** sin tablas nuevas
- **Hecho cuando:** Pago de prueba de punta a punta; la conciliación contra el reporte del proveedor cuadra. (Cuando se decida.)
- **Casillas que marca:**
  - [`V.00 · N2`](capas/V-Ventas-Digitales-Comercio-y-Pagos/00-Pasarelas-de-Pago-e-Integraciones-Financieras/README.md)
    - [ ] Varias pasarelas

### PR-20 · Proveedor tecnológico DIAN

- **Rama:** `cobro/proveedor-dian` · **Hito:** 3 · Cobra y factura
- **Etiquetas:** `capa-VII` `N2` `tipo:integracion` `hito-3-cobra-y-factura`
- **Depende de:** PR-18
- **Esquema:** sin tablas nuevas
- **Hecho cuando:** Un documento del set de pruebas queda aceptado y los pendientes históricos se envían en orden sin duplicar. (Cuando se elija.)
- **Casillas que marca:**
  - [`VII.04 · N2`](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/04-Facturacion-Electronica-y-RADIAN/README.md)
    - [ ] Notas crédito y débito electrónicas

### PR-21 · Contabilidad I: plan de cuentas, períodos y reglas

- **Rama:** `contabilidad/plan-y-periodos` · **Hito:** 4 · Contabilidad
- **Etiquetas:** `capa-I` `capa-VII` `N1` `N2` `tipo:migracion` `hito-4-contabilidad`
- **Depende de:** PR-08
- **Esquema:** [`sql/PR-21-contabilidad-plan-y-periodos.sql`](sql/PR-21-contabilidad-plan-y-periodos.sql)
- **Hecho cuando:** Un negocio nuevo trae su PUC; las reglas iniciales se pueden ver y desactivar.
- **Casillas que marca:**
  - [`I.00 · N1`](capas/I-Fundacion-Nucleo-e-Infraestructura/00-Nucleo-Transversal-y-Modelo-de-Tercero-Unico/README.md)
    - [ ] Dimensiones analíticas
    - [ ] Periodos y cierres
  - [`VII.05 · N2`](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md)
    - [ ] Plan de cuentas (PUC)
  - [`VII.06 · N1`](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/06-Presupuestos-y-Centros-de-Costo/README.md)
    - [ ] Centros de costo y sucursales

### PR-22 · Contabilidad II: asientos automáticos y partida doble

- **Rama:** `contabilidad/asientos-y-partida-doble` · **Hito:** 4 · Contabilidad
- **Etiquetas:** `capa-I` `capa-VII` `N1` `N2` `tipo:migracion` `hito-4-contabilidad`
- **Depende de:** PR-14, PR-21
- **Esquema:** [`sql/PR-22-contabilidad-asientos.sql`](sql/PR-22-contabilidad-asientos.sql)
- **Hecho cuando:** Una venta con IVA, costo y cobro genera un asiento cuadrado y trazable; anular lo reversa; cerrar el mes bloquea cambios.
- **Casillas que marca:**
  - [`I.00 · N1`](capas/I-Fundacion-Nucleo-e-Infraestructura/00-Nucleo-Transversal-y-Modelo-de-Tercero-Unico/README.md)
    - [ ] Motor contable
    - [ ] Libro mayor inalterable
  - [`VII.05 · N2`](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md)
    - [ ] Asientos automáticos
    - [ ] Terceros y centros de costo en cada asiento

### PR-23 · Estados financieros y exportación al contador

- **Rama:** `contabilidad/estados-y-exportacion` · **Hito:** 4 · Contabilidad
- **Etiquetas:** `capa-VII` `N1` `N2` `hito-4-contabilidad`
- **Depende de:** PR-22
- **Esquema:** sin tablas nuevas
- **Hecho cuando:** El balance de prueba cuadra con una muestra revisada por un contador; el archivo se importa en su software.
- **Casillas que marca:**
  - [`VII.05 · N1`](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md)
    - [ ] Reportes simples
    - [ ] Exportación
  - [`VII.05 · N2`](capas/VII-Caja-Menor-Finanzas-Operativas-y-Contabilidad/05-Contabilidad-General-Puc-y-Estados-Financieros/README.md)
    - [ ] Libros auxiliares, libro diario, libro mayor y balance de prueba.
    - [ ] Reportes para el contador

### PR-24 · Presencia v2: pilares, fases y tendencia

- **Rama:** `visibilidad/presencia-v2` · **Hito:** 5 · Visible y vende en línea
- **Etiquetas:** `capa-II` `N2` `tipo:integracion` `tipo:migracion` `hito-5-visible-y-vende`
- **Depende de:** PR-02, PR-03
- **Esquema:** [`sql/PR-24-presencia-v2.sql`](sql/PR-24-presencia-v2.sql)
- **Hecho cuando:** La barra muestra la fase A con pilares nuevos y su tendencia; `get_presence` responde por MCP; se recalcula por eventos.
- **Casillas que marca:**
  - [`II.00 · N2`](capas/II-Visibilidad-Captacion-y-Presencia-Digital/00-Sitios-Web-Landing-Pages-y-Cms/README.md)
    - [ ] Barra de Presencia en dos fases: visibilidad **verificada** (venta en línea, reputación, atribución) y, cuando está llena, madurez NEXUS

### PR-25 · Mini-sitio con catálogo y SEO técnico

- **Rama:** `visibilidad/mini-sitio-con-catalogo` · **Hito:** 5 · Visible y vende en línea
- **Etiquetas:** `capa-II` `N1` `tipo:migracion` `hito-5-visible-y-vende`
- **Depende de:** PR-09, PR-24
- **Esquema:** [`sql/PR-25-sitio-y-catalogo-publico.sql`](sql/PR-25-sitio-y-catalogo-publico.sql)
- **Hecho cuando:** El sitio sale en un negocio real, rápido en móvil, con datos estructurados válidos; el pilar «Sitio» pasa a verificado.
- **Casillas que marca:**
  - [`II.00 · N1`](capas/II-Visibilidad-Captacion-y-Presencia-Digital/00-Sitios-Web-Landing-Pages-y-Cms/README.md)
    - [ ] Plantillas por vertical, con edición de textos, imágenes y colores.
    - [ ] Subdominio automático (`negocio.nexusthrive.co`).
    - [ ] Botón flotante de WhatsApp, mapa y datos de contacto.
    - [ ] Diseño responsive (celular primero).
  - [`II.01 · N1`](capas/II-Visibilidad-Captacion-y-Presencia-Digital/01-SEO-Tecnico-y-Posicionamiento-Local/README.md)
    - [ ] Títulos, descripciones y URLs editables
    - [ ] Sitemap, robots y etiquetas básicas automáticas.

### PR-26 · Tienda en línea: carrito, pedido y pago

- **Rama:** `visibilidad/tienda-en-linea` · **Hito:** 5 · Visible y vende en línea
- **Etiquetas:** `capa-V` `N1` `tipo:migracion` `hito-5-visible-y-vende`
- **Depende de:** PR-10, PR-17, PR-25
- **Esquema:** [`sql/PR-26-tienda-carrito-y-envios.sql`](sql/PR-26-tienda-carrito-y-envios.sql)
- **Hecho cuando:** Un cliente compra de punta a punta (sandbox): pedido → pago → stock → documento fiscal en cola → aviso; el abandono dispara un evento.
- **Casillas que marca:**
  - [`V.04 · N1`](capas/V-Ventas-Digitales-Comercio-y-Pagos/04-Comercio-Electronico/README.md)
    - [ ] Catálogo con fotos, descripción, precio y categoría.
    - [ ] Carrito y checkout con datos del cliente.
    - [ ] Pago por link o por transferencia con confirmación manual.
    - [ ] Pedido que llega por correo y WhatsApp al negocio.
  - [`V.05 · N1`](capas/V-Ventas-Digitales-Comercio-y-Pagos/05-Reservas-y-Control-de-Disponibilidad/README.md)
    - [ ] Formulario de solicitud de reserva

### PR-27 · SEO local y Google Business

- **Rama:** `visibilidad/google-business` · **Hito:** 5 · Visible y vende en línea
- **Etiquetas:** `capa-II` `N1` `tipo:integracion` `hito-5-visible-y-vende`
- **Depende de:** PR-25
- **Esquema:** sin tablas nuevas
- **Hecho cuando:** La ficha se sincroniza en un negocio piloto; el pilar «Google» pasa a verificado.
- **Casillas que marca:**
  - [`II.01 · N1`](capas/II-Visibilidad-Captacion-y-Presencia-Digital/01-SEO-Tecnico-y-Posicionamiento-Local/README.md)
    - [ ] Ficha de Google Business

### PR-28 · Reputación y atribución de ventas

- **Rama:** `visibilidad/reputacion-y-atribucion` · **Hito:** 5 · Visible y vende en línea
- **Etiquetas:** `capa-II` `capa-III` `N1` `tipo:migracion` `hito-5-visible-y-vende`
- **Depende de:** PR-26
- **Esquema:** [`sql/PR-28-reputacion-y-atribucion.sql`](sql/PR-28-reputacion-y-atribucion.sql)
- **Hecho cuando:** El tablero dice de dónde vino cada venta; una reseña de 1–2 estrellas dispara una alerta.
- **Casillas que marca:**
  - [`II.02 · N1`](capas/II-Visibilidad-Captacion-y-Presencia-Digital/02-Publicidad-Digital-y-Atribucion-Multicanal/README.md)
    - [ ] UTM automáticos
    - [ ] Reporte simple: inversión vs. leads recibidos por origen.
  - [`II.03 · N1`](capas/II-Visibilidad-Captacion-y-Presencia-Digital/03-Formularios-Enlaces-Cortos-y-Codigos-Qr/README.md)
    - [ ] Enlaces cortos
    - [ ] Formulario simple
  - [`III.04 · N1`](capas/III-Atencion-y-Comunicacion/04-Encuestas-de-Satisfaccion-y-Reputacion/README.md)
    - [ ] Enlace a Google Reviews

### PR-29 · Calculadores de madurez (fase B)

- **Rama:** `pulso/calculadores-de-madurez` · **Hito:** 6 · Pulso del negocio
- **Etiquetas:** `capa-IX` `N2` `hito-6-pulso`
- **Depende de:** PR-14, PR-18, PR-22, PR-24
- **Esquema:** sin tablas nuevas
- **Hecho cuando:** Cada señal sale de datos reales y tiene prueba con casos límite; un dato malo baja su señal y dice cómo arreglarlo.
- **Casillas que marca:**
  - [`IX.00 · N2`](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/00-Dashboards-y-Analitica-Operativa/README.md)
    - [ ] Pulso del negocio: señales de madurez con acción sugerida y avisos por WhatsApp/correo cuando una empeora

### PR-30 · Transición de fase y avisos

- **Rama:** `pulso/transicion-y-avisos` · **Hito:** 6 · Pulso del negocio
- **Etiquetas:** `capa-IX` `N2` `tipo:integracion` `hito-6-pulso`
- **Depende de:** PR-29, PR-07
- **Esquema:** sin tablas nuevas
- **Hecho cuando:** Un negocio que sostiene la fase A entra a la fase B; si una señal empeora llega el aviso; el reporte semanal sale solo.
- **Casillas que marca:**
  - [`IX.00 · N2`](capas/IX-Inteligencia-de-Negocio-Analitica-e-IA/00-Dashboards-y-Analitica-Operativa/README.md)
    - [ ] Pulso del negocio: señales de madurez con acción sugerida y avisos por WhatsApp/correo cuando una empeora

<!-- pr:fin -->

## 4. Orden de ejecución

No es un calendario: se avanza **en el orden de la tabla** y se abre el
siguiente PR cuando el anterior está listo para revisión.

1. **PR-01 y PR-08** salen primero y en paralelo (no se pisan): el 01 es solo
   código y pruebas (el registro de operaciones); el 08 es el primer cambio de
   esquema y sirve para practicar **todo el procedimiento de §2** con relleno
   real de datos.
2. **PR-02** (API de lectura) fija para siempre errores, paginación y OpenAPI;
   **PR-09** va en paralelo.
3. **PR-03** (outbox) hace las integraciones reactivas; **PR-10** (inventario) lo
   necesita casi todo lo demás.
4. Con **PR-04, 05, 06 y 07** se cierra el **Hito 1** y se hace la primera demo:
   un flujo de n8n en casa avisando de un pago y Claude respondiendo por MCP cómo
   fue el día.
5. Desde ahí, las olas 1 → 6 salen de las dependencias; **PR-24 (Presencia v2)**
   puede adelantarse en cuanto existan 02 y 03, porque no depende del dinero.

## 5. Decisiones ya tomadas y abiertas

| Tema | Decisión |
| --- | --- |
| **n8n** | **Autohospedado en casa** por túnel; fuera del camino crítico (cobrar, facturar, descontar, contabilizar viven en NEXUS); reintento 24 h + puesta al día por consulta |
| **Proveedor DIAN** | **Aún no hay.** Puerto y flujo completos; adaptador `none`; documentos en `PENDING_PROVIDER`; el proveedor se elige después (PR-20) |
| **Wompi** | **Futuro.** Puerto de pagos listo (PR-17); adaptador en PR-19. Nequi y sandbox primero |
| **Contabilidad** | Exportable al contador; NEXUS no reemplaza al contador |
| Costo de inventario | Propuesta: **costo promedio ponderado** (lo común en pymes); PEPS/UEPS fuera de alcance. *Confirmar con un contador.* |
| Estilo de IDs y tipos | Los del esquema actual: `text` (uuid de la app), `timestamptz`, `numeric`; sin enums de base |
| Umbrales de la barra (85, 14 días, 70) y pesos | **Propuesta a calibrar** con negocios reales |
| Plantilla PUC y tarifas de impuestos | Sembrarlas con un contador; revisar vigencia en la DIAN antes de usarlas |
| Retención de soportes y datos personales | Plazos legales vigentes y Ley 1581: validar con quien corresponda (X.03) |
| ¿Dominio propio por negocio en el sitio? | Subdominio primero (PR-25); dominio propio como segundo paso |

## 6. Riesgos principales

1. **Estado del inventario** (PR-10): tocar el stock desde dos caminos rompe el
   kardex. Mitigación: un solo servicio, prueba de concurrencia, `Product.stock`
   derivado.
2. **Numeración fiscal** (PR-13): saltos o duplicados son un problema legal.
   Mitigación: reserva del consecutivo dentro de la transacción de emisión,
   rango y vigencia validados, alerta previa.
3. **Dinero doble** (PR-17): un webhook repetido no puede cobrar dos veces.
   Mitigación: idempotencia por `(provider, externalId)` y estado final
   confirmado con el proveedor.
4. **n8n en casa se cae** (PR-07): mitigado por el diseño (no es crítico), pero
   los avisos se retrasan. Mitigación: bandeja de fallidos y puesta al día.
5. **Presión por la barra:** que el puntaje empuje a «declarar» cosas. Mitigación:
   solo suma lo **verificado**.
6. **Tamaño:** 30 PR es mucho. Mitigación: cada hito deja algo vendible; se
   puede parar tras cualquiera.
