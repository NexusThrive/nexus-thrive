# E9 y V — Tipos de interfaz y vocabulario por rubro: resultados

Ejecutado en la rama local `chore/HU-esquema-prisma-modular-01`, sin push ni PR, a partir de [`E7-resultados.md`](E7-resultados.md)
(10 excepciones). **Las 10 quedan resueltas: la lista de excepciones está vacía** (de 64 al inicio de E0).

## E9 · tipos y reglas de navegación y alta fuera de la experiencia (4 excepciones)

| Cambio | Resuelve |
|---|---|
| `NavItem` y `NavGroup` pasan a `lib/navigation/nav-types.ts` (solo tipos, Core); `tenant-nav.ts` los reexporta y `lib/ops/nav.ts` importa de ahí | EX-032 |
| La regla «qué módulos habilitan cada ruta» (`MODULE_NAV`, `modulesForRoute`) pasa a `lib/capabilities/route-modules.ts`, junto al registro de capacidades (Core): es una regla de acceso del servidor (SEC-06), no de presentación. `tenant-nav.ts` la reexporta y `lib/tenant/context.ts` la importa de Core | EX-041 |
| `lib/onboarding/types.ts` (tipos del alta, sin pantalla ni servidor) se clasifica como Core por archivo | EX-003, EX-006 |

La API pública no cambia (las pruebas de `modulesForRoute` y de autorización de páginas pasan sin tocarse). El menú del negocio y el resto del onboarding siguen siendo de experiencia.

## V · vocabulario y capacidades por rubro (6 excepciones)

Seis lugares comparaban `vertical === "gym" | "restaurant" | "construction"` para decidir textos o una capacidad. Ahora salen de `VERTICAL_RECIPES`:

| Dato | Dónde se declara | Lo usan | Resuelve |
|---|---|---|---|
| `VerticalTerms.purchases` («Compras de insumos» en restaurante) | receta de restaurante | menú de capacidades, pantalla de compras | EX-061, EX-062 |
| `VerticalTerms.projects` («Obras») y `newProject` («Nueva obra») | receta de construcción | menú de capacidades, acción «Crear» | EX-063, EX-064 |
| `VerticalTerms.profileTitle` («Datos físicos y objetivo») | receta de gimnasio | ficha del cliente | EX-060 |
| `VerticalRecipe.memberAccess` + `hasMemberAccess()` | receta de gimnasio | ficha del cliente (QR y estado de la membresía) | EX-059 |

Sin valor, cada texto es el de siempre. `hasMemberAccess` no normaliza el rubro, de modo que uno desconocido o heredado sigue sin tener control de acceso (antes, la comparación daba `false` igual).
Una prueba recorre todos los rubros y comprueba que cada texto y capacidad coincide con lo que daban las comparaciones (`tests/unit/vocabulario-por-rubro.test.ts`).

## Revisión arquitectónica

- **Excepciones**: 0 abiertas, tope 0. El verificador (`pnpm check:layers`) sigue fallando ante cualquier dependencia o comparación de rubro nueva, y ante una excepción que sobre.
- **Reclasificaciones por archivo** (cada una es pura: solo vocabulario, tipos o funciones sin acceso a datos, y el verificador impide que Foundation importe algo): `finance/index.ts`, `finance/series.ts`, `receivables/aging.ts` → Foundation; `navigation/nav-types.ts`, `onboarding/types.ts` → Core; `operations/registry.ts` → integraciones (raíz de composición de E3).
- **Puertos** (7): `accounting`, `numbering`, `payment-gateway`, `tenant-provisioning`, `fiscal-queue`, `payment-checkout`, `google-listing`. Cada uno tiene al menos un uso y una conexión en `lib/runtime/ports.ts`; una prueba de arquitectura exige que todo puerto declarado quede conectado y que el arranque los conecte. Solo `instrumentation.ts`, `vitest.setup.ts` y las pruebas importan `lib/runtime`.
- **Ciclos**: 4 de solo tipos (`admin/catalogs ⇄ capabilities/registry`, `auth/permissions ⇄ auth/roles`, `money-service ⇄ stock-service`, `dashboard/chart-catalog ⇄ layout`), 0 de valores. Sin cambios frente a E3.
- **Sin tocar**: modelos Prisma, migraciones, RLS, datos, autenticación, ledger, saldos históricos ni períodos cerrados.

## Validación

`pnpm verify` en verde (capas 0/0; lint 0 errores; pruebas unitarias; integración sobre base desechable; build). Contrato Prisma sin cambios (`storageHash 191a1245…`, `git diff` vacío en `prisma/` y `migrations/`; guardián SQL: sin cambio de tablas).

## Riesgos y pendientes

- Los puertos dependen de que `instrumentation.ts` ejecute `register()` antes de atender peticiones; sin conexión, la operación falla con `PortNotProvidedError`. Conviene confirmarlo en un despliegue de prueba (no se hizo: sin despliegues).
- `hasMemberAccess`/`profileTitle` asumen que el rubro del negocio es un valor del catálogo; un valor desconocido recibe los textos por defecto.
- Siguen pendientes, y no estaban autorizados: migrar las 151 pruebas a `tests/`, mover `lib/construction` a `lib/industry/construction`, dividir `tenant/db.ts`, Prisma P3–P6, y decidir push/PR. La regla de capas ya está vacía de excepciones; lo que viene es mantenerla así.
