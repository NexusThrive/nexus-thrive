# Revisión de los 13 documentos pendientes

Fecha: 2026-10-31 (fase 4). Método: cada documento se contrastó con el código actual (rutas citadas que aún existen), con su fecha y con quién lo referencia. **No se movió, fusionó ni eliminó ninguno**; los que citan rutas inexistentes llevan un aviso de «pendiente de validación» al principio. La decisión de cada uno es tuya.

Regla aplicada: si una afirmación no se puede confirmar en el código, queda marcada como pendiente de validación; no se presenta como vigente.

## Resumen

| # | Documento | Rutas citadas / inexistentes | Referenciado por | Veredicto recomendado |
|---|---|---|---|---|
| 1 | `docs/nexus-architecture/product-vision.md` | 0 / 0 | 8 | **Conservar y validar con producto.** Es visión, no código; promover a `02-producto` si el dueño la confirma |
| 2 | `docs/nexus-architecture/user-journey.md` | 19 / 12 | 3 | **Reescribir contra el código.** Es el único recorrido de usuario y dice describir «el comportamiento actual»; sus rutas (`lib/tenant-db.ts`, `lib/ops/access.ts`…) ya no existen |
| 3 | `docs/nexus-architecture/product-inventory.md` | 17 / 8 | 2 | **Fusionar** con `02-producto/mapa-de-capacidades.md` tras verificar cada fila; hoy se solapan |
| 4 | `docs/nexus-architecture/onboarding-and-ux.md` | 4 / 2 | 4 | **Validar**: su lista de problemas (p. ej. «turismo lleva a un 404») puede estar resuelta; si lo está, archivar |
| 5 | `docs/nexus-architecture/roadmap.md` | 4 / 1 | 5 | **Archivar**: sus etapas (contención de seguridad, aislamiento) las sustituyen V10 y la [hoja de ruta](../wiki/02-producto/hoja-de-ruta.md) |
| 6 | `docs/nexus-architecture/scaling-path.md` | 2 / 0 | 4 | **Conservar** como propuesta en `03-arquitectura`: complementa el ADR 0001 (monolito modular), que sigue en «propuesta» |
| 7 | `docs/construction/test-integration.md` | 1 / 1 | 0 | **Archivar**: lo cubre [Pruebas](../wiki/10-pruebas-y-calidad/pruebas.md); cita `lib/tenant-db.integration.test.ts`, hoy `tests/integration/core/tenancy/db.integration.test.ts` |
| 8 | `docs/construction/prisma8-queries.md` | 3 / 2 | 1 | **Promover** a `05-datos-y-base-de-datos` tras corregir dos rutas (`prisma/contract.prisma` → `prisma/schema/`; la prueba ahora es `tests/integration/prisma8-query-patterns.integration.test.ts`, que existe) |
| 9 | `docs/construction/tabla-permisos-catalogo.md` | 3 / 2 | 3 | **Reescribir**: la matriz real es `BUSINESS_PERMISSIONS` (p. ej. `apu.edit` incluye ADMIN y la tabla no); `canEditApuCatalog` vive ahora en `lib/core/auth/authorization.ts` |
| 10 | `docs/construction/convencion-semanas-lean.md` | 5 / 4 | 1 | **Promover** a `04-modulos` corrigiendo rutas (`lean-engine.ts` está en `lib/industry/construction/`); la convención de semanas es de dominio y sigue siendo válida |
| 11 | `docs/PENDIENTES.md` | 14 / 7 | 3 | **Revisar con el dueño** y fusionar con la hoja de ruta; es lista viva, no se archiva. Rutas con equivalente: `money-service` → `lib/business/sales/`, `inbox-providers` → `lib/platform/inbox/`, `rate-limit` → `lib/core/api/` y `lib/foundation/`, `finance-db` → `lib/business/sales/`, `products-db` → `lib/business/catalog/` |
| 12 | `docs/SIGUIENTE-PASO.md` | 1 / 0 (corregida) | 2 | **Fusionar** con la hoja de ruta cuando se decida el siguiente paso. Su enlace roto a `ARQUITECTURA-CORE-Y-RUBROS.md` ahora apunta a `B-core-y-compartidas.md` |
| 13 | `IDEAS-E-IMPLEMENTACIONES-IMPORTANTES.md` | 1 / 1 | — | **Revisar idea por idea** (invitaciones por correo, Wompi, NFC…): cita `lib/ops/invitations.ts`, que no existe; clasificar vigente / obsoleta antes de trasladar |

## Contraste de las cuatro páginas anteriores a V10

Se movieron de la wiki a [`historico/nexus-architecture/`](historico/nexus-architecture/README.md) y quedaron marcadas como **pendientes de validación**: de las 59 rutas que citan, **39 ya no existen** (`lib/tenant-db.ts`, `prisma/contract.prisma`, `lib/ops/*`, `lib/plans/*`…). Su cobertura vigente está en:

| Tema de la página antigua | Página vigente |
|---|---|
| Arquitectura técnica actual | [Arquitectura objetivo](../wiki/03-arquitectura/arquitectura-objetivo.md) y [guía de `lib/`](../wiki/03-arquitectura/guia-implementacion-lib.md) |
| Catálogo y dependencias de módulos | [Reglas de dependencias](../wiki/03-arquitectura/reglas-dependencias.md) y [documentación de módulos](../wiki/04-modulos/documentacion-de-modulos.md) |
| Modelo de dominio y datos | [Prisma: estructura](../wiki/05-datos-y-base-de-datos/prisma-estructura.md) |
| Arquitectura objetivo propuesta | [Arquitectura objetivo](../wiki/03-arquitectura/arquitectura-objetivo.md) |

Lo que esas páginas contienen y **no** tiene equivalente vigente (por ejemplo, el análisis de riesgos de aislamiento y el modelo de roles de 2026-10-22) sigue disponible allí, con el aviso, hasta que se reescriba contra el código.

## Páginas nuevas de esta fase

- `01-inicio/instalacion-y-primer-dia.md` — requisitos, puesta en marcha, comandos y primer cambio, con una nota para agentes de IA.
- `06-seguridad-y-permisos/autenticacion-permisos-y-aislamiento.md` — autenticación, matriz de permisos, aislamiento por negocio y checklist; cada ruta citada existe.
- `11-glosario/glosario.md` — 20 términos propios de Nexus.

Entrada de la fase 5: [rutas citadas que ya no existen](rutas-citadas-inexistentes.md) (103 en `docs/wiki` y `docs/decisions`, muchas legítimas por ser históricas).

## Lectores a los que sirve la wiki

| Lector | Dónde empezar |
|---|---|
| Desarrolladores | [Inicio](../wiki/01-inicio/README.md) → [Arquitectura](../wiki/03-arquitectura/README.md) → [Nueva funcionalidad](../wiki/09-desarrollo/nueva-funcionalidad.md) |
| Administradores técnicos | [Instalación](../wiki/01-inicio/instalacion-y-primer-dia.md) → [Operación](../wiki/08-operacion-y-despliegue/README.md) → [Datos](../wiki/05-datos-y-base-de-datos/README.md) |
| Agentes de IA | `CLAUDE.md` y `AGENTS.md` → [Seguridad](../wiki/06-seguridad-y-permisos/README.md) → [Reglas de dependencias](../wiki/03-arquitectura/reglas-dependencias.md) |
