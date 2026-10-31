# Guía de implementación de `lib/`

Estado: **vigente** (cierre de V10, 2026-10-31). Es la guía para trabajar en `lib/` **sin romper su arquitectura**: dónde poner el código, qué revisar antes de tocarlo y qué verificar después. No describe solo cómo está organizado: ayuda a conservarlo. Complementos: [`reglas-dependencias.md`](reglas-dependencias.md) (quién puede importar a quién, excepciones vigentes), [`V10-arquitectura-objetivo.md`](arquitectura-objetivo.md) (por qué esta estructura) y [`../guias/nueva-funcionalidad.md`](../09-desarrollo/nueva-funcionalidad.md) (la receta de pantalla + acción + repositorio + prueba).

---

## 0. La regla fundamental

> **Antes de crear, mover o modificar código, identifica la responsabilidad, el área propietaria, sus dependencias, sus consumidores y los contratos afectados. No elijas una ubicación únicamente por conveniencia.**

La carpeta «más cómoda» es la que ya tienes abierta. La correcta es la del área cuya **responsabilidad** coincide con lo que el código hace. Si no sabes cuál es, la respuesta no está en las carpetas: está en las preguntas de la §1.

## 1. Preguntas obligatorias antes de tocar código

Respóndelas (aunque sea mentalmente) antes de crear, mover o cambiar algo. Si alguna no tiene respuesta clara, para y averigua.

| # | Pregunta | Cómo se responde |
|---|---|---|
| 1 | ¿A qué área pertenece esta responsabilidad? | §2: árbol de decisión |
| 2 | ¿Existe ya un módulo que debería hacerse cargo? | Busca por responsabilidad, no por nombre: `ls lib/<área>`, `grep -r` del verbo/entidad. §3 |
| 3 | ¿Estoy colocando la lógica en el área correcta o solo en la carpeta más cómoda? | Compara con la tabla de la §2; si el archivo importaría algo que su área no permite, está mal ubicado |
| 4 | ¿Qué módulos importan actualmente este código? | `grep -rn "@/lib/<ruta>" app components lib`; contando también `tests/` y `scripts/` |
| 5 | ¿La modificación introduce dependencias circulares o acoplamiento? | `pnpm check:layers`; §8 |
| 6 | ¿Afecta el aislamiento por `tenantId`, los permisos o la seguridad? | §9: cada consulta filtra por `tenantId`, cada acción comprueba permiso |
| 7 | ¿Cambia contratos públicos, operaciones, eventos o integraciones? | §10 |
| 8 | ¿Hay rutas literales, scripts, mocks o referencias indirectas que actualizar? | §11: lo que el compilador no ve |
| 9 | ¿Qué pruebas deben demostrar que el comportamiento sigue intacto? | §7 |
| 10 | ¿La solución resuelve el problema actual sin crear infraestructura innecesaria? | No crees carpetas, puertos ni abstracciones «por si acaso» |

## 2. ¿A qué área pertenece? (árbol de decisión)

Recorre las preguntas **en orden**; la primera respuesta afirmativa te da el área.

| # | Si el código… | Área | Ejemplos reales |
|---|---|---|---|
| 1 | Es puro, no sabe nada de Nexus (ni de tenants, ni de negocios) y podría vivir en cualquier proyecto | `foundation` | `foundation/format`, `dates/plain-date`, `db/db-transaction`, `kernel/aging` |
| 2 | Es parte de un **proveedor externo** (pagos, facturación electrónica, Google, mapas): traduce a/desde su API | `integrations` | `integrations/providers/wompi`, `einvoice/http-provider` |
| 3 | Pertenece a **un solo sector** (membresías de gimnasio, entradas de museo, presupuestos de obra) | `industry/<sector>` | `industry/gym/memberships-db`, `industry/construction/apu-engine` |
| 4 | Sirve para **operar Nexus como SaaS**, no al negocio cliente (facturar a negocios, soporte, CRM interno) | `platform` | `platform/billing`, `platform/support` |
| 5 | Es **presentación o interacción**: navegación, tableros, movimiento, flujos de pantalla, ayudas de captura | `experience` (y `app/`, `components/`) | `experience/navigation/tenant-nav`, `payment-input/keypad` |
| 6 | **Conecta** implementaciones con contratos (puertos, operaciones, sectores) | `runtime` | `runtime/ports.ts` |
| 7 | Es un **dominio especializado** con reglas propias y varios módulos que se hablan entre sí | `domains/<familia>` | `domains/finance/{accounting,tax,receivables,payments}` |
| 8 | Es una **capacidad que cualquier negocio usa**, sin importar el sector (clientes, ventas, inventario, compras, POS, tienda) | `business` | `business/sales`, `business/inventory` |
| 9 | Es **infraestructura común a toda la plataforma**: identidad, tenancy, permisos, planes, eventos, operaciones, API | `core` | `core/tenancy`, `core/auth`, `core/events`, `core/api` |

### 2.1 ¿Core o Business? (la duda más frecuente)

| Pregunta | Si la respuesta es sí → |
|---|---|
| ¿Todo negocio la necesita aunque no venda, ni tenga inventario, ni clientes? (saber quién eres, qué puedes hacer, qué plan tienes, qué pasó) | **Core** |
| ¿Es una función que un negocio *ejecuta* para operar (vender, cobrar, reservar, comprar, controlar existencias)? | **Business** |
| ¿Core necesitaría llamarla? | **No puede importarla.** Se resuelve con un puerto, una operación o un evento (§12.1), no moviéndola a Core |

Regla práctica: si al ponerla en Core tendrías que importar un módulo de `business`, no es de Core. Y si al ponerla en Business no necesita nada de ningún sector ni de otros negocios, probablemente es reutilizable y va bien ahí.

### 2.2 Ejemplos correctos e incorrectos

| ✗ Incorrecto | ✓ Correcto | Por qué |
|---|---|---|
| `lib/business/sales/...` importa `@/lib/domains/finance/accounting/ledger-db` para asentar una venta | `sales` publica el hecho con `accountingPort`; `runtime/ports.ts` conecta la implementación | R3: `business` no importa `domains`. Además así `sales` no conoce cuentas ni períodos |
| Poner la lógica de membresías en `core/tenancy` porque «el gimnasio también tiene negocios» | `industry/gym/memberships.ts` | Core no conoce sectores (R1). Un sector nuevo no debe obligar a tocar Core |
| Crear `lib/helpers/` o `lib/misc/` en la raíz | Un módulo dentro del área correcta, o `foundation/` si es puro | La raíz solo admite las nueve áreas y `utils.ts`/`cn.ts` (lo comprueba una prueba) |
| Una página de `app/` que importa `@/prisma/db` para leer clientes | Un repositorio `lib/business/customers/customers-db.ts` que recibe `tenantId`; la página lo llama | Nada en `app/` toca la base; el repositorio filtra por `tenantId` |
| Repositorio con `where({ id })` sobre una tabla que tiene `tenantId` | `where({ tenantId, id })` | Sin el filtro, un negocio podría leer o escribir datos de otro. `tenant-scope.test.ts` lo detecta |
| `industry/construction` importando `industry/gym` para reusar una función | Subir la función a `business` o `foundation` si es reutilizable | R2: un sector no importa a otro |
| Duplicar `format.ts` dentro de un módulo «porque es pequeño» | `@/lib/foundation/format` | Una sola definición; si no cabe, es señal de que sobra o falta algo en `foundation` |

## 3. ¿Reutilizo un módulo o creo uno nuevo? (preguntas 1 y 2 del listado)

**Reutiliza o amplía un módulo existente cuando** la nueva responsabilidad es una de las que ese módulo ya declara en una frase. Ejemplo: un nuevo tipo de ajuste de inventario va a `business/inventory`; no justifica un módulo `adjustments`.

**Crea un módulo nuevo solo si se cumplen todas** (criterio V10 §5.1):

1. Tiene una responsabilidad nombrable en **una frase sin «y»**.
2. Al menos un archivo exporta algo que usan otros módulos (hay un contrato identificable).
3. Tiene al menos dos archivos o unas 150 líneas de lógica propia.
4. Sus dependencias salientes no son un superconjunto de las de otro módulo (no es un trozo de otro).

Un módulo nace con lo que **existe**, nunca vacío ni para «lo que vendrá». No se crean carpetas, áreas ni puertos por anticipación.

## 4. ¿Dónde creo un módulo nuevo? (pregunta 1)

1. Decide el área con la §2.
2. Crea `lib/<área>/<módulo>/` con **archivos con un solo propósito**, siguiendo el patrón del repositorio:

   | Archivo | Contenido | Se prueba |
   |---|---|---|
   | `<tema>.ts` | Reglas puras: validar, calcular, tipos. Sin base de datos | Unitaria, sin base |
   | `<tema>-db.ts` | Repositorio: recibe `tenantId`, filtra siempre por él | Integración, con base de prueba |
   | `<tema>-port.ts` | Puerto, si el módulo necesita algo de un área que no puede importar | Arquitectura (`e5-puertos`) |
   | `operations.ts` | Operaciones que se exponen por API/MCP/pantallas | Unitaria + registro en `runtime/operations.ts` |
   | — | Las pruebas **no** van en `lib/`: viven en `tests/` (ver §7) | — |

3. **No toques `layers.json`**: el área se deduce de la ruta. Solo las rutas fuera de `lib/<área>/` necesitan unidad.
4. **Actualiza la prueba de forma del área** en el mismo cambio. Cada área tiene una que enumera sus módulos (`tests/architecture/v10-core.test.ts`, `v10-business-completo.test.ts`, `v10-integrations.test.ts`, `v10-experience.test.ts`, `v10-finance.test.ts`, `v10-platform.test.ts`, `v10-foundation.test.ts`). Es intencional: obliga a que un módulo nuevo sea una decisión consciente y no un archivo caído en una carpeta.
5. Si el módulo expone operaciones, regístralas en `lib/runtime/operations.ts`; si declara un puerto, conéctalo en `lib/runtime/ports.ts`.
6. Ejecuta `pnpm verify` (§13).

## 5. ¿Cuándo separo, fusiono, muevo o retiro un módulo? (pregunta 3)

| Acción | Cuándo (criterio V10 §5) |
|---|---|
| **Separar** | Se cumple **al menos una**: su grafo interno tiene ≥ 2 componentes conexos con ≥ 2 archivos cada uno; dos grupos de archivos comparten < 50 % de dependencias externas; supera 15 archivos o 2 500 líneas *y* lo anterior; o un archivo pasa de 800 líneas con ≥ 3 funciones públicas de dominios distintos |
| **Fusionar** | Se cumplen **todas**: tienen un ciclo entre sí (o uno es el único importador del otro); ninguno tiene consumidores fuera del otro; ambos son pequeños (< 300 líneas en total); separarlos no los hace más reutilizables. *Ejemplo real:* `sales` nació de fusionar `documents` y `money` porque se importaban mutuamente |
| **Mover de área** | Su conjunto real de imports salientes viola o sobra frente a la lista de su área, **y** la nueva ubicación no crea imports prohibidos. *Ejemplo real:* `api` y `mcp` estaban en `integrations`, pero solo dependían de Core y Foundation, así que pasaron a `core/api` |
| **Retirar** | Se cumplen **todas**: 0 importadores en producción, no aparece en el registro de capacidades ni en las operaciones, ningún contrato público lo expone, y se hace en un commit aparte y reversible |

**Un ciclo entre módulos casi siempre es la señal de que dos responsabilidades están mal cortadas**, no de que falte una excepción. La deuda conocida (`inventory ⇄ sales`, [`reglas-dependencias.md`](reglas-dependencias.md) §5.2) es exactamente eso, y por eso está registrada como deuda.

## 6. Cómo agregar un sector (pregunta 5)

Hay dos casos, y hoy conviene distinguirlos con honestidad.

### 6.1 Un sector sin código propio (solo datos)

Si el sector solo cambia vocabulario, módulos activados por defecto y recetas, vive como **datos** en `lib/core/sectors/catalog.ts` (`VERTICAL_RECIPES`, términos en `terms.ts`, léxico en `lexicon.ts`). No necesita carpeta en `industry/` ni registro en `runtime`. Atención: el listado de sectores del producto también está en el esquema de base de datos (un enum de Prisma); sumar un valor ahí es un cambio de Prisma + migración que requiere su propia aprobación.

### 6.2 Un sector con código propio

1. Crea `lib/industry/<sector>/` con sus repositorios y reglas (como `gym` o `construction`). Un sector **solo se importa a sí mismo** (R2) y **nadie lo importa** salvo `experience` y `runtime` (R1).
2. Usa Core y Business a través de sus módulos; lo que el sector aporta de más lo declara él. Si Core o Business necesitaran algo del sector, **no lo importan**: el sector implementa un puerto que Core/Business declaran, o se registra.
3. Mecanismo de registro: cada sector con código declara su definición en `lib/industry/<sector>/sector.ts` (tipo `SectorDefinition` de `core/sectors`) y se añade a `INDUSTRY_SECTORS` en `lib/runtime/sectors.ts`. `tests/architecture/v10-sectores.test.ts` falla si existe un `sector.ts` que no esté en esa lista.
   - **Estado real:** el mecanismo existe y está probado, pero **hoy ningún sector lo usa**: `gym`, `museum` y `construction` son módulos sin `sector.ts` y `INDUSTRY_SECTORS` está vacío. Migrarlos a `sector.ts` es el trabajo M7, fuera de V10 y sin iniciar.
4. Las pantallas del sector van en `app/` y `lib/experience/`; pueden importar el sector (R1 lo permite a `experience`).
5. Añade el sector a la lista fijada en `tests/architecture/v10-construction.test.ts` (la prueba que enumera los sectores de `lib/industry`), en el mismo cambio.

## 7. ¿Dónde coloco las pruebas? (pregunta 7)

| Tipo | Dónde | Cómo se ejecuta |
|---|---|---|
| Unitaria (reglas puras, sin base) | `tests/unit/<área>/<módulo>/<tema>.test.ts` (espejo de `lib/`) | `pnpm test` |
| Integración (con base de datos) | `tests/integration/<área>/<módulo>/<tema>.integration.test.ts`, o `tests/integration/<tema>/` si cruza varios módulos | `pnpm test:integration` (necesita `TEST_DATABASE_URL`) |
| Arquitectura (formas, fronteras, reglas del diseño) | `tests/architecture/` | `pnpm test` |
| Unitaria transversal (no pertenece a un módulo) | `tests/unit/` | `pnpm test` |
| Datos de apoyo de pruebas | `tests/fixtures/<área>/…` | — |
| Interfaz (accesibilidad, estados) | Historias de Storybook junto al componente + `e2e/` | `pnpm test:e2e` |

Reglas:

- **La integración nunca apunta a una base de desarrollo ni a producción.** Crea una base aparte (idealmente desechable) y exporta `TEST_DATABASE_URL` y `DATABASE_URL` con la **misma** URL; el script lo exige. La base debe tener `CREATE EXTENSION pg_trgm` antes de aplicar migraciones.
- `lib/` es solo implementación: `tests/architecture/v10-pruebas.test.ts` falla si aparece un `*.test.ts` o un fixture dentro de `lib/`. Si mueves un módulo, mueve su carpeta espejo en `tests/`. Los imports de las pruebas usan siempre `@/lib/…`.
- `test-integration.sh` lista a mano cuatro pruebas por nombre (en `tests/integration/…`); si mueves esas carpetas, actualiza el script (una prueba de arquitectura lo exige).
- Una prueba de arquitectura **no basta con que dé verde**: debe poder fallar. Cuando la escribas, comprueba que falla con una infracción deliberada (§13.3).

## 8. Cómo evitar ciclos y dependencias indebidas (pregunta 8)

1. **Antes de escribir un `import`**, comprueba la matriz ([`reglas-dependencias.md`](reglas-dependencias.md) §1). Si el destino queda arriba o al lado sin permiso, no lo escribas.
2. **Si necesitas algo de un área que no puedes importar**, invierte la dependencia (§12.1). No pidas una excepción.
3. **Si dos archivos se necesitan mutuamente**, extrae lo común a un tercero *más bajo* (un tipo, una constante, una regla pura) y haz que ambos lo importen. Mover la mitad de una función a «utils» no resuelve nada si la responsabilidad sigue partida.
4. **No escondas un ciclo** con `import type` o con un `import()` dinámico: los ciclos de tipos tienen un tope (3) que solo puede bajar, y un ciclo oculto sigue siendo un acoplamiento.
5. **Ejecuta `pnpm check:layers`** (corre dentro de `pnpm verify`). Falla si hay una dependencia prohibida, un ciclo de valores, una unidad huérfana o una excepción nueva.
6. **No amplíes ninguna excepción.** Hoy: 0 excepciones de capas, tope de 3 ciclos de tipos, y el ciclo exacto `inventory ⇄ sales` fijado por prueba. Si crees que necesitas una, es una decisión del dueño, no tuya.

## 9. Aislamiento por negocio, permisos y seguridad (pregunta 6)

Toda funcionalidad que lee o escribe datos de un negocio cumple las seis cosas de siempre ([`../guias/nueva-funcionalidad.md`](../09-desarrollo/nueva-funcionalidad.md)):

1. `app/` **nunca** importa `@/prisma/db`; todo pasa por un repositorio de `lib/`.
2. El repositorio recibe `tenantId` y lo pone en **cada** `where` sobre una tabla con `tenantId` (`tenant-scope.test.ts` lo comprueba).
3. Las acciones comprueban el permiso con `can(ctx.role, "<permiso>")` (`core/auth/permissions`).
4. El dinero lo mueve **solo** `money-service` (`business/sales/money-service`); las transacciones de dinero viven en `lib/`, no en `app/` (ESLint lo prohíbe).
5. Lo sensible deja rastro con `logTenantAction` (`core/tenancy/audit`).
6. Sin permiso: `notFound()` o aviso, nunca datos.

Excepciones **vigentes y explícitas**: las carpetas de `platform` que operan entre negocios con permiso del equipo de Nexus y unos pocos archivos con motivo escrito (lista cerrada en `tenant-scope.test.ts`, ver [`reglas-dependencias.md`](reglas-dependencias.md) §5.3). Una consulta sin `tenantId` fuera de esa lista **falla la prueba**; no se añade a la lista para que pase.

## 10. Antes de cambiar un contrato (pregunta 9)

«Contrato» es todo lo que otro código o persona usa y espera estable. Identifica cuál tocas:

| Contrato | Quién lo consume | Qué hacer antes de cambiarlo |
|---|---|---|
| **Operaciones** (las 15 expuestas por `/api/v1`, MCP y pantallas) y su **OpenAPI** | Integraciones externas, el MCP, las pantallas | No cambiar nombre, esquema, permiso ni riesgo sin decisión del dueño. Revisar `lib/runtime/operations.ts` y las pruebas de `lib/core/api` y `lib/runtime` |
| **Eventos** (cargas de webhook, nombres de evento) | Suscriptores internos y webhooks de clientes | Añadir campos es compatible; quitar o renombrar no. Revisar `core/events` y los suscriptores |
| **Puertos** (contratos internos entre áreas) | Quien los declara y quien los implementa | Cambiar el tipo en el módulo que lo declara **y** la implementación conectada en `runtime/ports.ts`; `e5-puertos` exige que todos estén conectados |
| **Exportaciones públicas de un módulo** | Otros módulos | Busca todos los importadores (pregunta 4) antes de renombrar o quitar |
| **Esquema de base de datos** (Prisma) y migraciones | Todo | Es un cambio aparte, con su propia aprobación, su migración y su SQL de producción (`scripts/check-prod-sql.sh` lo exige) |
| **Autenticación, RLS, permisos** | Todo | Nunca como efecto lateral de otro cambio |

Para comprobar que un movimiento o refactor **no** cambió nada público, compara antes y después: lista de exportaciones por archivo, las 15 operaciones y el OpenAPI generado (byte a byte), y el recuento de pruebas. Durante V10 se hizo con herramientas de apoyo locales que **no están en el repositorio** (ver «Decisiones pendientes» en [`V10-cierre-resultados.md`](../../architecture/V10-cierre-resultados.md)).

## 11. Lo que el compilador no ve: referencias indirectas (pregunta 8)

Mover o renombrar código rompe cosas que `tsc` y las pruebas pueden no detectar. Revisa **todo** esto cada vez; apareció de verdad durante V10:

| Trampa | Ejemplo real | Cómo detectarla |
|---|---|---|
| Rutas dentro de **expresiones regulares** o listas en una cadena | Pruebas con `/@\/lib\/(a\|b\|c)/` que, tras mover una carpeta, dejan de coincidir con nada y **pasan sin vigilar** | `grep -rn` de la ruta vieja escrita de las formas posibles: con `/`, con `\/`, entre paréntesis, en plantillas |
| Comprobaciones del tipo «este archivo **no** existe» | `exists("lib/operations/definitions/x.ts") === false` sigue verde aunque la carpeta ya no exista | Haz que apunten a la ruta nueva y demuestra que fallan creando el archivo |
| Rutas **relativas al propio archivo** que solo usa el build | `next/font/local` con `../app/fonts/…`: `tsc` y las pruebas pasaban; falló `next build` | `pnpm verify` completo (incluye el build) y una prueba que compruebe que el archivo existe |
| **Listas a mano** en scripts que filtran por texto | `test-integration.sh` nombraba dos pruebas; al mover la carpeta dejaron de ejecutarse **sin error** | Comparar el recuento de pruebas, no solo el color de `pnpm verify` |
| Importaciones de **archivos que no son TypeScript** | `import … from "../../eslint/legacy-db-access.mjs"` | `tsc`, y una búsqueda de imports relativos que no resuelven |
| **Comentarios, plantillas de PR, documentación viva** con la ruta vieja | `.github/pull_request_template.md`, comentarios en CSS | `grep` en todo el repositorio (excepto `node_modules`) |
| Mutaciones mal construidas | Añadir un `import` a un archivo que no termina en salto de línea lo pega a la última línea y no se detecta | Terminar siempre las mutaciones con un salto de línea previo |

**Compara siempre el recuento de pruebas** (unitarias e integración) antes y después. Un verde con menos pruebas no es un verde.

## 12. Cómo conectar piezas

### 12.1 Cuando una dependencia está prohibida: puertos, operaciones, eventos, sectores

Ver el cuadro de [`reglas-dependencias.md`](reglas-dependencias.md) §4. En una línea: el módulo que necesita algo **declara el contrato** (un puerto con sus propios tipos), el que lo tiene **lo implementa**, y **solo `lib/runtime` conoce a los dos** y los conecta al arrancar. Un puerto sin conectar falla cerrado (`PortNotProvidedError`).

### 12.2 Cómo conecto una integración externa (pregunta 6)

1. **Declara el puerto** en el módulo que necesita el servicio (p. ej. `business/store/payment-gateway-port.ts`, `domains/finance/payments/checkout-port.ts`), con tipos propios. El dominio nunca importa al proveedor.
2. **Implementa el adaptador** en `lib/integrations/<proveedor>/` (p. ej. `integrations/providers/wompi.ts`). Solo traduce: formato del proveedor ↔ contrato del puerto. Sin reglas de negocio.
3. **Guarda las credenciales cifradas por negocio** con `integrations/providers/connections` (la clave de cifrado es `WEBHOOK_ENCRYPTION_KEY`); nunca en código ni en el repositorio.
4. **Conecta** el puerto en `lib/runtime/ports.ts` (`miPuerto.provide({ … })`).
5. Si el proveedor envía **webhooks entrantes**, sigue el patrón de `integrations/providers/inbound.ts` y de las rutas `app/api/webhooks/*`: verifica firma o secreto, resuelve el negocio y delega. Estos puntos de entrada operan entre negocios por diseño y están en la lista de exclusiones documentada de `tenant-scope`.
6. **Pruebas:** unitarias del adaptador con respuestas simuladas, y `e5-puertos` exige que el puerto esté conectado. No llames a un proveedor real desde las pruebas.
7. Si el proveedor es nuevo, valida antes sus condiciones de uso; es una decisión de producto, no solo técnica.

### 12.3 Cómo agrego una operación (API · MCP · pantallas)

Se declara **una vez** (módulo, permiso, esquema, riesgo, eventos) en el `operations.ts` de su módulo y se añade a la lista de `lib/runtime/operations.ts`. La pantalla usa esa misma operación, no una copia de la lógica. Reglas y definición de «hecho»: `docs/wiki/07-integraciones/api-mcp-webhooks.md`.

## 13. Qué verificar antes de cerrar un cambio (pregunta 10)

### 13.1 Siempre

```bash
pnpm exec tsc --noEmit       # tipos
pnpm lint                    # reglas de código (0 errores)
pnpm check:layers            # fronteras entre áreas
pnpm test                    # unitarias + arquitectura
```

### 13.2 Si el cambio toca datos, repositorios o lo que ejecutan las integraciones

```bash
# con una base de PRUEBA propia (nunca la de desarrollo ni producción)
export TEST_DATABASE_URL=postgresql://…/nexus_test
export DATABASE_URL="$TEST_DATABASE_URL"        # el script exige la misma URL
export WEBHOOK_ENCRYPTION_KEY=$(openssl rand -hex 32)   # solo para pruebas
pnpm verify                  # tipos, capas, unitarias, integración y build
```

`pnpm verify` es la compuerta completa: si ejecutas solo `pnpm test`, no has demostrado que la integración y el build sigan bien.

### 13.3 Si el cambio toca arquitectura (mover, renombrar, crear módulos, cambiar reglas)

1. **Compara recuentos:** número de archivos y de pruebas de unitarias e integración antes y después (no deben bajar sin explicación).
2. **Compara la matriz de dependencias:** `node scripts/check-layers.mjs --report` antes y después; solo debe cambiar lo que pretendías.
3. **Compara las exportaciones** de lo movido y, si puede afectar a lo público, las 15 operaciones y el OpenAPI.
4. **Verifica desde una copia limpia** (`git archive HEAD` en otra carpeta): `tsc`, `check:layers` y pruebas, para asegurar que no dependes de archivos sin confirmar.
5. **Prueba que las reglas detectan:** introduce a propósito una infracción en la copia (por ejemplo, un import prohibido o una consulta sin `tenantId`) y comprueba que falla la prueba o el verificador correspondiente. Una regla que nunca se ha visto fallar no está demostrada.
6. **Busca referencias indirectas** (§11) con `grep`.
7. **Actualiza la documentación** de lo que cambió: este documento, `reglas-dependencias.md`, `V10-arquitectura-objetivo.md` y las pruebas de forma del área.

### 13.4 Antes de dar un trabajo por terminado

- El árbol está limpio y todo lo que cambiaste está confirmado (`git status`).
- No hay `git stash` olvidados (`git stash list`).
- No dependes de archivos ignorados o locales.
- Lo que dices que verificaste lo verificaste: si un paso se omitió, dilo.

## 14. Estructura actual de `lib/` (referencia)

La raíz tiene **nueve áreas y dos archivos** (`utils.ts`, `cn.ts`). Detalle y estado en [`V10-arquitectura-objetivo.md`](arquitectura-objetivo.md) §10.

```
lib/
├── foundation/     kernel/ · dates/ · db/ · format · qr · rate-limit · ports · app-url · contact · image-upload · init-scripts · countries · limits
├── core/           tenancy/ · auth/ · parties/ · files/ · sectors/ · capabilities/ · entitlements/ · events/ · operations/ · api/
├── business/       customers/ · catalog/ · sales/ · scheduling/ · inventory/ · purchasing/ · pos/ · store/ · data-exchange/ · growth/ · presence/
├── domains/        finance/ → accounting/ · tax/ · receivables/ · payments/
├── integrations/   providers/ · einvoice/ · google/ · maps/
├── industry/       gym/ · museum/ · construction/
├── platform/       admin/ · team/ · billing/ · support/ · crm/ · inbox/ · accounts/ · presence/ · benefits/
├── experience/     navigation/ · dashboard/ · onboarding/ · site/ · motion/ · hooks/ · payment-input/ · fonts · vertical-icons
├── runtime/        ports · operations · sectors · api-deps
├── utils.ts        (excepción documentada: convención shadcn/ui)
└── cn.ts           (excepción documentada: convención shadcn/ui)
```

## 15. Mantener esta guía viva

Si cambias la estructura, las reglas o los comandos, actualiza esta guía y [`reglas-dependencias.md`](reglas-dependencias.md) en el mismo cambio. Una guía que describe una estructura que ya no existe es peor que no tener guía.
