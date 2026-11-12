# Pruebas de arquitectura

Las pruebas de `tests/architecture/` no prueban funcionalidad: **vigilan la forma del sistema**. Si una falla, normalmente significa que un cambio rompió una regla de estructura, no que haya un error de lógica. Corren con `pnpm test` y dentro de `pnpm verify`.

Esta lista se generó a partir del comentario inicial de cada archivo (30 archivos). Las familias `v10-*`, `e1-*`…`e9-*` fijan por etapa la estructura que dejó la reorganización de `lib/`; `layers`, `tenant-scope`, `data-access` y `page-authorization` son reglas permanentes.

| Archivo | Qué vigila |
|---|---|
| `brand-docs.test.ts` | Todo el diseño operativo vive en `packages/brand/`. Evita que los documentos de diseño vuelvan a repartirse por el repositorio y comprueba que el índice del paquete, Storybook y los enlaces de su documentación siguen al día. |
| `stories-coverage.test.ts` | Storybook es la fuente de verdad (DESIGN.md §3): ningún componente nuevo de `components/` llega sin historia. La deuda heredada está en `stories-baseline.json` y solo baja (`node scripts/stories-baseline.mjs`). |
| `type-scale-freeze.test.ts` | Congela la deuda de la escala tipográfica (DR-02): ningún archivo puede tener más usos de `text-[Npx]` que su línea base (`type-scale-baseline.json`); un archivo nuevo no puede traerlos. La línea base solo baja (`node scripts/type-scale-baseline.mjs`). |
| `check-prod-sql.test.ts` | Guardián de SQL de producción (scripts/check-prod-sql.sh). |
| `data-access.test.ts` | ARCH-04 (bloque A.1–A.2): `app/` no consulta la base. La deuda llegó a cero el 2026-10-23; esta prueba evita que vuelva, además de la regla de ESLint. |
| `e1-core-industria.test.ts` | E1 · Core no conoce las industrias. |
| `e2-reubicaciones.test.ts` | E2 · Lo que estaba mal ubicado ya está donde corresponde. |
| `e3-dominios.test.ts` | E3 · Cada dominio declara lo suyo y Core no lo conoce. |
| `e5-compartido.test.ts` | E5 · Lo que Business y Core comparten con Finance sin escribir en Finance. |
| `e5-puertos.test.ts` | E5 · Los puertos entre dominios están todos conectados, y se conectan al arrancar. |
| `e9-tipos-compartidos.test.ts` | E9 · Tipos y reglas de navegación que las capas bajas necesitan sin depender de la experiencia. |
| `layers.test.ts` | Reglas de dependencia entre capas (E0). Comprueba scripts/check-layers.mjs y, con el último caso, que el repositorio actual las cumple. No toca archivos: las pruebas negativas inyectan fuentes virtuales. |
| `page-authorization.test.ts` | SEC-03 (docs/internal/historico/nexus-architecture/security-audit.md): cada página de un negocio comprueba sesión + membresía activa por sí misma. El layout de `app/[tenant]` no basta: en la navegación del App Router puede no ejec… |
| `tenant-scope.test.ts` | Bloque A.4: todo repositorio de `lib/` que lee o escribe una tabla de un negocio (las que tienen `tenantId` en el contrato) filtra por `tenantId` en su `.where({ ... })`. Se lee el código: la prueba falla con el archivo, la línea … |
| `ui-rules.test.ts` | Reglas del sistema de diseño que se pueden leer en el código (DESIGN.md §3, packages/brand/docs/04-patrones/interaction-patterns.md). Lo que ya existía y aún no se migró está en las listas de deuda: solo se achican. Si migras un archivo, sácalo de la… |
| `no-private-storage.test.ts` | Los datos de un negocio no se guardan en el navegador (`pwa.md`): la caché de secciones (`lib/experience/hooks/section-cache.ts`) vive solo en memoria, sin `localStorage`, `sessionStorage` ni IndexedDB, y la interfaz no usa IndexedDB. |
| `v10-business-completo.test.ts` | V10 · Etapa B · Business completo. |
| `v10-business.test.ts` | V10 · M3 — `lib/business` deja de ser un cajón y pasa a módulos con una responsabilidad cada uno. |
| `v10-composicion.test.ts` | V10 · M1 — Una sola raíz de composición: `lib/runtime`. |
| `v10-construction.test.ts` | V10 · Etapa N · Construction como sector. |
| `v10-core.test.ts` | V10 · Etapa C · Core. |
| `v10-experience.test.ts` | V10 · Etapas X y Z · Experience. |
| `v10-finance.test.ts` | V10 · M5 · Finance como familia de dominios. |
| `v10-foundation.test.ts` | V10 · Etapa F · Foundation. |
| `v10-integrations.test.ts` | V10 · Etapa I · Integrations. |
| `v10-platform.test.ts` | V10 · M4 — `platform` pasa a ser un área con módulos propios (admin, benefits, team, billing, crm, support, inbox, accounts, presence). |
| `v10-pruebas.test.ts` | Separación física de pruebas · `lib/` es solo implementación. |
| `v10-raiz-lib.test.ts` | V10 · Cierre · La raíz de `lib/`. |
| `v10-sectores.test.ts` | V10 · M2 — El catálogo de sectores vive en Core, separado de la administración de la plataforma, y no depende de industrias. |
| `v10-verificador.test.ts` | V10 · M0 — El verificador arquitectónico entiende áreas por ruta, ciclos y resultados reproducibles. |
| `verify-script.test.ts` | `pnpm verify` no puede ocultar fallos. |
| `wiki.test.ts` | La wiki (docs/wiki) es la fuente única de la documentación vigente. Esta prueba evita que se pudra: las páginas generadas del código no se desfasan, los enlaces resuelven, cada sección tiene índice completo y nada marcado como histórico se cuela entre las vigentes. |
| `wiki-sync.test.ts` | La sincronización con la Wiki de GitHub (scripts/wiki-sync.mjs) genera una copia plana de docs/wiki. Comprueba que la copia es consistente (sin enlaces rotos ni páginas huérfanas) y que no hay publicación sin confirmación. |

Reglas para tocarlas: no se añade una excepción a una lista cerrada para que una prueba pase; se corrige el código, o se documenta la decisión (ver [decisiones](../../decisions/README.md)). Otras guías de pruebas: [pruebas](pruebas.md).
