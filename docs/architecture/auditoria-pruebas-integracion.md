# Auditoría de las pruebas de integración fuera de `test-integration.sh`

Estado: **solo auditoría estática**. No se activó, ejecutó ni modificó ninguna prueba, ni el CI, ni `test-integration.sh`.
No hay `TEST_DATABASE_URL` en este entorno, así que nada se corrió contra una base.

## Qué pasa hoy

| Dato | Valor |
|---|---|
| Pruebas `*.integration.test.ts` en `lib/` | 54 |
| Archivos que lista `test-integration.sh` | 24 (20 `*.integration` + 4 con otro nombre) |
| `*.integration.test.ts` **fuera** de la lista | **34** (178 casos de prueba) |
| Casos de prueba en las 20 integración listadas | 145 |

Esas 34 se omiten en el paso «Unit tests» del CI (`TEST_DATABASE_URL=""` → `describe.skipIf`) y no están en el paso «Integration tests», que
llama a `test-integration.sh`. **Hoy no se ejecutan en CI.**

### Por qué quedaron fuera (evidencia)

- `test-integration.sh` se modificó por última vez el **2026-10-23**.
- 33 de las 34 pruebas se agregaron el **2026-10-24**, después; la otra (`master-pack-import.file`) es del 2026-10-22.
- Conclusión razonable: se crearon después de la última edición de la lista y nadie la actualizó. No hay evidencia de que se hayan excluido a propósito.

## Método

Para cada archivo se revisó, sin ejecutarlo: número de casos, si limpia lo que crea, si usa un negocio propio, si toca tablas globales,
si cambia `process.env`, si hace `fetch` real o inyectado, si lee archivos, si depende de variables o archivos externos, si sus imports
siguen existiendo, fecha de alta y si tiene una unitaria hermana.

Resultados comunes a los 34:
- **Los 34 comprueban que `DATABASE_URL` sea igual a `TEST_DATABASE_URL`** antes de escribir (protección contra tocar otra base).
- Los 34 crean negocio propio con un sufijo único y limpian al terminar; ninguno borra tablas completas sin filtro.
- Ningún import apunta a un archivo que ya no exista.
- Ninguna hace una llamada de red real: las que simulan red inyectan `fetch` (`fetchImpl` o un `fetch` falso). Las URL que aparecen son de ejemplo o de datos de prueba.
- La CI ya prepara la base con las migraciones (paso «Migraciones sobre base limpia»); estas pruebas usan tablas que las migraciones crean.

## Clasificación

### A. Ejecutables en CI con la misma infraestructura que las 24 (33 archivos, 175 casos)

Solo necesitan Postgres migrado y `TEST_DATABASE_URL`/`DATABASE_URL`.

**A1 · Solo base de datos (27 archivos, 146 casos):**
`accounting/{accounting,ledger,reports}` · `admin/users` · `api/api` · `business/adjustment-notes` · `catalog/catalog` · `data-exchange/exchange` ·
`einvoice/einvoice` · `events/feed` · `growth/growth` · `inventory/{inventory,stock-docs}` · `mcp/mcp` · `operations/operations` · `parties/parties` ·
`pos/{pos,returns}` · `presence/pillars` · `purchasing/purchases` · `receivables/receivables` · `site/site` · `store/store` · `tax/tax` ·
`tenant/{business-context,organizations}` · `usage/usage`.

Nota sobre `admin/users`: escribe en `AccountLimit` (tabla de plataforma) con un correo único por ejecución y lo borra al terminar;
si el proceso se corta, deja una fila huérfana con ese correo.

**A2 · Solo base de datos, pero cambian `process.env` (6 archivos, 29 casos):**
`einvoice/http-provider` · `events/events` · `google/google` · `payments/intents` · `payments/wompi` · `providers/providers`.

Cada una fija `process.env.WEBHOOK_ENCRYPTION_KEY` dentro de la prueba y **no lo restaura**; además, `events/events` usa un valor distinto
(`"b"×64`) del resto (`"d"×64`). Es inocuo mientras cada archivo corra aislado (el comportamiento por defecto de Vitest, que no se
reconfigura aquí y que el script ya combina con `--no-file-parallelism`). Se anota porque cambiaría si alguien activara `isolate: false`.

### B. Ejecutables con infraestructura adicional (1 archivo, 3 casos)

`construction/apu-importer/master-pack-import.file`: importa **dos veces el pack completo (2.288 APU, 1.323 fotos)** y exige la variable
`MASTER_PACK_FILE` apuntando a un archivo que **no está en el repositorio**. Sin ella se omite. Necesita además una base de prueba y
tiempo largo. Es una prueba de carga/aceptación, no de regresión rápida.

### C. Pendientes de adaptación

**Ninguna por evidencia estática.** Lo único a revisar, sin ser un bloqueo, es la fila huérfana de `admin/users` y el entorno no restaurado de A2.

### D. Obsoletas o redundantes

**Ninguna con evidencia.** 14 de las 34 tienen una unitaria hermana con el mismo nombre base (`ledger`, `reports`, `http-provider`, `events`,
`growth`, `stock-docs`, `parties`, `intents`, `pillars`, `providers`, `purchases`, `site`, `tax`, `business-context`), pero las unitarias
prueban lógica pura y las de integración prueban la base de datos, la concurrencia o el aislamiento entre negocios; no se solapan.

## Límites de esta auditoría

- **Nada se ejecutó.** «Ejecutable en CI» significa que no encontré un requisito que el CI no cumpla, no que la prueba pase. Se escribieron
  el 24 de octubre y nunca corrieron en el CI: pueden fallar por motivos ocultos.
- No se revisó la calidad ni la utilidad de cada aserción.
- No se midió el tiempo; 175 casos extra sobre 145 actuales alargarían el paso de integración, que ya corre sin paralelismo.
- Hay Postgres y Docker instalados en esta máquina (`psql`, `pg_isready`, `docker`), pero no se usaron: ejecutar requiere una base
  desechable y autorización.

## Camino recomendado (no ejecutado)

1. **Ensayo en una base desechable** (contenedor Postgres local, `pg_trgm`, `prisma db migrate`): correr las 33 con
   `--no-file-parallelism` y registrar cuáles fallan. Sin tocar el CI.
2. Corregir lo que falle, en un PR aparte, sin mezclarlo con la migración de carpetas.
3. Sustituir la lista fija de `test-integration.sh` por un patrón (`**/*.integration.test.ts`) **solo cuando** esas 33 estén en verde.
   Mientras tanto se pueden añadir de a grupos pequeños (por ejemplo `accounting`, `tax`, `receivables`).
4. Dejar la de `master-pack` fuera del CI rutinario (ejecución manual o programada) y documentar cómo obtener el archivo.
5. Hacerlo **antes** de la ola 5 del plan de migración (`plan-migracion-tests.md`), para migrar pruebas que ya se sabe que pasan.
