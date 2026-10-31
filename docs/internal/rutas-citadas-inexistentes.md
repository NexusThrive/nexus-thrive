# Rutas citadas en la wiki que ya no existen: clasificación

Revisión de la fase 5 (2026-10-31). Se recorrieron todas las rutas entre comillas invertidas (`lib/…`, `app/…`, `prisma/…`, `tests/…`, `docs/…`) de `docs/wiki/` y `docs/decisions/`.

| Momento | Citas | Inexistentes |
|---|---|---|
| Al terminar la fase 4 | 442 | 103 |
| **Ahora** | **384** | **30** |

## Qué se hizo con las 103

| Clase | Cuántas | Tratamiento |
|---|---|---|
| **Error real corregido** | 41 por coincidencia única de nombre de archivo o por la correspondencia de carpetas de V10, y el resto a mano (`registry.ts`, `permissions.ts`, `contract.prisma`, `presence.ts`, `migrations/app/refs`, `tenant-scope.test.ts`) | Se reescribió la ruta a su ubicación actual (p. ej. `lib/construction/lean-engine.ts` → `lib/industry/construction/lean-engine.ts`; `lib/business/money-service.ts` → `lib/business/sales/money-service.ts`; `prisma/contract.prisma` → `prisma/schema/`) |
| **Página que era histórica y estaba entre las vigentes** | 2 páginas (con ~15 citas) | `hoja-de-ruta` (estado «tras E3») y `reglas-de-capas-e0` (E0, con «64 excepciones») pasaron a `docs/internal/historico/v10-y-etapas/`; la hoja de ruta vigente se reescribió |
| **Histórica legítima** | las que quedan en `docs/decisions/` y las frases «antes → después» | Se dejan: un ADR o una decisión nombra a propósito la ruta de entonces |
| **Intencional** | 5 | Ejemplos de lo que **no** hay que crear (`lib/helpers/`, `lib/misc/`), marcador de archivo que solo existe cuando se pausa el ciclo (`docs/ingenieria/PAUSA`) y puntos suspensivos de ejemplo (`tests/integration/…`) |
| **Pendiente** | 0 | — |

## Las que quedan, una por una

| Página | Ruta | Clase |
|---|---|---|
| `docs/decisions/V10-decisiones.md` | `lib/benefits` | Histórica legítima (ADR / decisión) |
| `docs/decisions/V10-decisiones.md` | `prisma/db` | Histórica legítima (ADR / decisión) |
| `docs/decisions/V10-decisiones.md` | `lib/admin/catalogs.ts` | Histórica legítima (ADR / decisión) |
| `docs/decisions/V10-decisiones.md` | `lib/admin` | Histórica legítima (ADR / decisión) |
| `docs/decisions/V10-decisiones.md` | `lib/tenant/tenant-scope.test.ts` | Histórica legítima (ADR / decisión) |
| `docs/decisions/V10-decisiones.md` | `lib/payment-input` | Histórica legítima (ADR / decisión) |
| `docs/decisions/arquitectura/0001-monolito-modular.md` | `lib/solutions` | Histórica legítima (ADR / decisión) |
| `docs/decisions/arquitectura/0003-registro-de-capacidades.md` | `lib/capabilities/registry.ts` | Histórica legítima (ADR / decisión) |
| `docs/decisions/arquitectura/0006-servicio-de-dinero.md` | `lib/capabilities/money` | Histórica legítima (ADR / decisión) |
| `docs/decisions/ingenieria/0001-nucleo-local-python.md` | `scripts/product-gate.py` | Histórica: motor Python retirado (ADR 0013) |
| `docs/decisions/ingenieria/0005-puente-http-n8n.md` | `tests/test_server.py` | Histórica: motor Python retirado (ADR 0013) |
| `docs/decisions/ingenieria/0007-reconstruccion-product-team.md` | `scripts/product-gate.py` | Histórica: motor Python retirado (ADR 0013) |
| `docs/decisions/ingenieria/0013-subagentes-nativos-en-plugin.md` | `scripts/nexus-eng` | Histórica: motor Python retirado (ADR 0013) |
| `docs/decisions/ingenieria/0013-subagentes-nativos-en-plugin.md` | `scripts/product-gate.py` | Histórica: motor Python retirado (ADR 0013) |
| `docs/decisions/ingenieria/resumen.md` | `scripts/product-gate.py` | Histórica: motor Python retirado (ADR 0013) |
| `docs/decisions/ingenieria/resumen.md` | `scripts/generate-agents.py` | Histórica: motor Python retirado (ADR 0013) |
| `docs/decisions/ingenieria/resumen.md` | `scripts/sync-client-adapters.py` | Histórica: motor Python retirado (ADR 0013) |
| `docs/wiki/03-arquitectura/arquitectura-objetivo.md` | `lib/ops` | Histórica en contexto («antes → después») |
| `docs/wiki/03-arquitectura/arquitectura-objetivo.md` | `lib/admin` | Histórica en contexto («antes → después») |
| `docs/wiki/03-arquitectura/arquitectura-objetivo.md` | `lib/finance` | Histórica en contexto («antes → después») |
| `docs/wiki/03-arquitectura/arquitectura-objetivo.md` | `lib/api` | Histórica en contexto («antes → después») |
| `docs/wiki/03-arquitectura/arquitectura-objetivo.md` | `lib/mcp` | Histórica en contexto («antes → después») |
| `docs/wiki/03-arquitectura/guia-implementacion-lib.md` | `lib/helpers` | Intencional (ejemplo o marcador) |
| `docs/wiki/03-arquitectura/guia-implementacion-lib.md` | `lib/misc` | Intencional (ejemplo o marcador) |
| `docs/wiki/03-arquitectura/guia-implementacion-lib.md` | `tests/integration/…` | Intencional (ejemplo o marcador) |
| `docs/wiki/09-desarrollo/equipo-ingenieria.md` | `docs/ingenieria/PAUSA` | Intencional (ejemplo o marcador) |
| `docs/wiki/10-pruebas-y-calidad/pruebas.md` | `tests/unit/industry/museum/…` | Intencional (ejemplo o marcador) |
| `docs/wiki/10-pruebas-y-calidad/pruebas.md` | `tests/integration/core/tenancy/…` | Intencional (ejemplo o marcador) |
