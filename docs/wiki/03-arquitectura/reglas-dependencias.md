# Reglas de dependencias de `lib/`

Estado: **vigente** (cierre de V10, 2026-10-31). Este documento dice quién puede importar a quién en `lib/`, qué fronteras no se cruzan, qué excepciones existen hoy y qué pruebas lo vigilan. Para saber *dónde poner* el código, ver [`guia-implementacion-lib.md`](guia-implementacion-lib.md); para el *por qué* de la estructura, [`V10-arquitectura-objetivo.md`](arquitectura-objetivo.md). La fuente de verdad de las reglas es [`layers.json`](../../architecture/layers.json) y las comprueba `pnpm check:layers`.

## 1. La regla en una tabla

La raíz de `lib/` tiene nueve áreas (y dos archivos de excepción, §6). Cada fila puede importar **solo** lo que dice su columna; todo lo demás está prohibido.

| Área | Puede importar | Responsabilidad |
|---|---|---|
| `foundation` | nada (solo paquetes externos) | Utilidades puras: formato, fechas, base de datos genérica, puertos, kernel financiero |
| `core` | foundation | Identidad, tenancy, permisos, planes, eventos, operaciones, API/MCP, sectores (sin código), capacidades |
| `business` | foundation, core | Capacidades empresariales reutilizables: clientes, catálogo, ventas, inventario, compras, POS, tienda… |
| `domains` | foundation, core, business | Dominios especializados con reglas propias (hoy `finance`) |
| `integrations` | foundation, core, business, domains | Adaptadores hacia proveedores externos (pagos, facturación electrónica, Google, mapas) |
| `industry` | foundation, core, business, domains, integrations | Particularidades por sector (`gym`, `museum`, `construction`) |
| `platform` | foundation, core, business, domains, integrations | Operación interna de Nexus como SaaS (Operations Center) |
| `experience` | foundation, core, business, domains, integrations, platform, industry | Navegación, dashboard, onboarding, sitio, movimiento, ayudas de captura |
| `runtime` | todas | Composición: conecta puertos, operaciones y sectores |

Lectura rápida: **las dependencias bajan, nunca suben.** `foundation` es la base y no conoce nada de Nexus; `runtime` está arriba del todo y solo lo importan los puntos de entrada y las pruebas.

## 2. Las tres reglas del verificador

`scripts/check-layers.mjs` calcula, para cada importación entre archivos de `lib/`, si la permite:

| Regla | Qué prohíbe | Ejemplo de infracción |
|---|---|---|
| **R1** · `nadie-importa-industry` | Que cualquier área distinta de `experience` y `runtime` importe una industria | `business/sales` importando `industry/construction` |
| **R2** · `industry-no-importa-industry` | Que un sector importe a otro | `industry/construction` importando `industry/gym` |
| **R3** · matriz de áreas | Cualquier importación que la tabla del §1 no permita | `core/api` importando `business/sales`; `foundation/format` importando `core/tenancy` |

Además:

- **Ciclos de valores: prohibidos** (0). Un ciclo es un conjunto de archivos que se importan entre sí con importaciones estáticas que no son de tipo.
- **Ciclos de solo tipos: tope de 3** (`maxCiclosDeTipos` en `exceptions.json`); el tope solo puede bajar.
- Las importaciones dinámicas (`import()`) son perezosas y **no cuentan** como ciclo de carga.
- **Unidades huérfanas:** una entrada de `layers.json` que apunta a algo que ya no existe hace fallar la comprobación.
- **Ubicación incoherente:** si una unidad de `layers.json` contradice el área que dice la ruta, falla.
- El resultado es reproducible: mismas fuentes, misma salida.

### Cómo se decide el área de un archivo

Por su **ruta**: `lib/<área>/…` pertenece a `<área>` y, dentro de `industry`, el sector es la carpeta siguiente (`lib/industry/<sector>/…`). No hace falta (ni conviene) declarar nada en `layers.json` para un módulo nuevo. Las únicas unidades que quedan en `layers.json` son las rutas **fuera** de las áreas:

| Unidad | Capa | Por qué |
|---|---|---|
| `prisma/` | foundation | El cliente de base de datos vive fuera de `lib/` |
| `lib/utils.ts`, `lib/cn.ts` | foundation | Excepciones documentadas de la raíz (§6) |
| `app/`, `components/` | experience | Las páginas y los componentes son la capa de presentación |

## 3. Dependencias dentro de un área

Estar en la misma área no autoriza cualquier importación. Hay tres niveles de regla, cada uno con su prueba:

| Área | Regla interna | Prueba |
|---|---|---|
| `business` | Los módulos no forman ciclos de valor entre sí. **Única excepción:** el par `inventory ⇄ sales` (§5.2) | `tests/architecture/v10-business.test.ts` |
| `platform` | Las dependencias entre módulos son exactamente un conjunto cerrado (`accounts` es la cima y `admin` la base) | `tests/architecture/v10-platform.test.ts` |
| `domains/finance` | Aristas exactas: `accounting → tax`, `payments → tax`, `receivables → accounting`, `receivables → tax`; sin ciclos; solo importa `foundation`, `business` y su propia familia | `tests/architecture/v10-finance.test.ts` |
| `industry` | Cada sector solo se importa a sí mismo (R2) | `check:layers` |

Entre **familias** de `domains` (cuando exista más de una) solo se hablaría por contrato; dentro de una familia, importación directa.

## 4. Cuando necesitas algo que la matriz no te deja importar

No se resuelve con una excepción: se resuelve invirtiendo la dependencia. Hay cuatro mecanismos, todos con su punto de composición único en `lib/runtime`:

| Necesidad | Mecanismo | Dónde se declara | Dónde se conecta | Prueba que lo exige |
|---|---|---|---|---|
| Un módulo de abajo necesita algo de uno de arriba (p. ej. `business` necesita contabilizar) | **Puerto** | Lo declara el módulo que lo necesita (`definePort` de `foundation/ports.ts`), con tipos propios | `lib/runtime/ports.ts` (`composePorts`) | `e5-puertos.test.ts`: todo puerto declarado está conectado |
| Exponer una capacidad por API/MCP/pantallas sin copiar la lógica | **Operación** | Cada módulo declara las suyas (`operations.ts`) | `lib/runtime/operations.ts` (lista explícita) | `v10-composicion.test.ts`, `e3-dominios.test.ts` |
| Core necesita saber de un sector sin importarlo | **Registro de sectores** | Core define el tipo `SectorDefinition` y `registerSector` (`core/sectors`); cada sector con código aportaría su definición en `industry/<sector>/sector.ts` (hoy ninguno la declara: llega con M7) | `lib/runtime/sectors.ts` (`composeSectors`) | `v10-sectores.test.ts` |
| Reaccionar a algo que ocurrió en otro módulo | **Evento** | Core (`core/events`: outbox, despachador, que no conoce a ningún dominio); cada módulo declara su suscriptor | Hoy los suscriptores se reúnen en la ruta del cron (`app/api/cron/webhooks/route.ts`); moverlos a `runtime` está pospuesto (P-11) | `e3-dominios.test.ts` |

Un puerto **falla cerrado**: usarlo sin conectar lanza `PortNotProvidedError`, no omite la operación en silencio. Un asiento contable perdido es peor que un error visible. Solo `lib/runtime` conoce a los dos lados; ningún módulo llama a `Port.provide(` fuera de `lib/runtime/ports.ts` ni a `registerSector(` fuera de `lib/runtime/sectors.ts`.

## 5. Excepciones vigentes (estado al cierre de V10)

La lista de excepciones del verificador **está vacía** y el tope es 0. Lo siguiente es lo único que se acepta hoy, cada punto con su justificación y su prueba. **No se añaden excepciones sin una decisión explícita del dueño**; una excepción nueva o una que ya no se necesita hace fallar la comprobación.

### 5.1 Ciclos de tipos (3; tope 3)

| Ciclo | Por qué se acepta |
|---|---|
| `core/auth/permissions ⇄ core/auth/roles` | Mismo módulo; uno solo importa tipos del otro |
| `business/inventory/stock-service ⇄ business/sales/money-service` | Ver §5.2 |
| `experience/dashboard/chart-catalog ⇄ experience/dashboard/layout` | Mismo módulo; uno solo importa tipos del otro |

### 5.2 Deuda arquitectónica: ciclo entre módulos `inventory ⇄ sales`

Identificado en M3 y aceptado como excepción **temporal y puntual** al juntar los módulos de `business` (decisión B-1, [`V10-decisiones.md`](../../decisions/V10-decisiones.md) §8.1). **No es un ciclo solo de tipos**: son cuatro dependencias exactas.

| Sentido | Archivo → archivo | Clase |
|---|---|---|
| `inventory → sales` | `stock-docs-db.ts` → `money-service.ts` | valor |
| `inventory → sales` | `stock-service.ts` → `accounting-port.ts` | valor |
| `inventory → sales` | `stock-service.ts` → `money-service.ts` | tipo |
| `sales → inventory` | `money-service.ts` → `stock-service.ts` | valor |

`v10-business.test.ts` permite **solo** ese par y exige que sus dependencias sean exactamente esas cuatro: una nueva, o una que desaparezca, hace fallar la prueba. **Es deuda pendiente, no una solución definitiva**; saldarla requiere un análisis propio (mover una de las dependencias, invertirla con un puerto o fusionar módulos) y al hacerlo se elimina la excepción.

### 5.3 Otras fronteras con reglas particulares

| Caso | Regla | Prueba |
|---|---|---|
| `experience` importa `industry` | **Permitido** por R1 (la experiencia compone pantallas de sector) | `check:layers` |
| `app/[tenant]` importa `platform` | Solo tres referencias, todas a `platform/benefits/benefits-db`: `app/[tenant]/layout.tsx`, `settings/page.tsx` y el tipo en `plan-tab.tsx`. No puede crecer sin una decisión (opción A, cierre de M4) | `v10-platform.test.ts` |
| Ningún módulo de `lib/` fuera de `platform`, `experience` y `runtime` importa `platform` | Siempre | `check:layers` |
| Aislamiento por negocio | Cada consulta a una tabla con `tenantId` lo filtra; **excluidos a propósito** (operan entre negocios con permiso del equipo): `platform/{admin,team,crm,billing,support,inbox,accounts,presence}` y los archivos `core/events/dispatcher.ts` e `integrations/providers/inbound.ts`; hay 18 excepciones puntuales con motivo escrito en la propia prueba. `platform/benefits` **no** está excluido | `lib/core/tenancy/tenant-scope.test.ts` |

## 6. Excepciones de la raíz de `lib/`

La raíz contiene exactamente las nueve áreas y **dos** archivos: `lib/utils.ts` y `lib/cn.ts`. Es una convención de shadcn/ui (los componentes generados importan `cn` desde `@/lib/utils`, 160 archivos más 13 de `@/lib/cn`); moverlos obligaría a reescribir 173 archivos y la CLI de shadcn volvería a escribir esa ruta. Cualquier otra cosa suelta en la raíz hace fallar `tests/architecture/v10-raiz-lib.test.ts`.

## 7. Qué comprueba cada cosa, y qué no

| Mecanismo | Qué vigila |
|---|---|
| `pnpm check:layers` | R1, R2, R3, ciclos, huérfanas, incoherentes. Corre dentro de `pnpm verify` |
| `tests/architecture/*.test.ts` | La forma de cada área (módulos exactos, carpetas antiguas inexistentes, área por ruta), aristas internas, puertos conectados, composición única, sectores registrados, reglas del sistema de diseño, raíz de `lib/` |
| `lib/core/tenancy/tenant-scope.test.ts` y `data-access.test.ts` | `tenantId` en cada consulta y que `app/` no use la base directamente |
| ESLint | Prohibiciones de imports concretas (p. ej. `moneyTransaction` no puede usarse desde `app/`) |
| `test-integration.sh` + una prueba | Que las pruebas de integración se ejecuten y que las rutas escritas a mano en el script existan |

**Límites del verificador (importan):**

- Solo escanea `lib/`. Las importaciones de `app/` y `components/` hacia `lib/` **no** pasan por él; se vigilan con pruebas puntuales.
- Ignora archivos de prueba, historias (`*.stories.tsx`) y `*.d.ts`. Una prueba puede importar lo que quiera.
- Solo ve importaciones estáticas y dinámicas escritas como cadena literal. Una ruta construida con variables o dentro de una expresión regular no se analiza.
- No sabe si una dependencia permitida es una *buena* dependencia: que la matriz la permita no significa que el módulo correcto sea ese.

## 8. Cómo cambiar una regla

1. **Una excepción nueva no se añade.** Si una importación está prohibida, se replantea (puerto, operación, evento, mover la responsabilidad), no se tolera.
2. **Una regla se cambia con decisión del dueño**, editando `layers.json` y esta documentación en el mismo cambio, y con una prueba que demuestre la regla nueva.
3. **Un área nueva** solo se crea si tiene una regla de dependencia propia que las existentes no expresan; se añade a `areas`, a `layers` y a esta tabla. No se crean áreas ni carpetas vacías por anticipación.
4. Al quitar una dependencia que estaba en una excepción (por ejemplo, el ciclo `inventory ⇄ sales`), se elimina la excepción en el mismo cambio.

## 9. Comandos

```bash
pnpm check:layers            # reglas de capas (corre dentro de verify)
node scripts/check-layers.mjs --report   # matriz real entre áreas y ciclos
node scripts/check-layers.mjs --json     # violaciones en JSON
pnpm exec tsc --noEmit       # tipos
pnpm test                    # pruebas unitarias y de arquitectura (sin base de datos)
pnpm test:integration        # integración; exige TEST_DATABASE_URL y DATABASE_URL apuntando a la misma base de PRUEBA
pnpm verify                  # todo: tipos, capas, unitarias, integración y build
```
