# NEXUS · Artefacto maestro de arquitectura

> Auditoría de solo lectura del repositorio. Reconstruye cómo funciona NEXUS hoy,
> con evidencia del código, y propone cómo evolucionar sin tirar lo construido.

| Dato | Valor |
|---|---|
| Fecha de la auditoría | 2026-10-22 |
| Commit analizado | `1551e9a` (`main` = `origin/main` = rama de trabajo) |
| Árbol de Git | limpio al empezar; esta auditoría solo añade `docs/nexus-architecture/` |
| Base de datos desplegada | **No inspeccionada** (sin acceso). Todo lo dicho sobre producción sale de `docs/prod-sql/` y debe confirmarse en Supabase |
| Validación ejecutada | Ver [validation-log.md](validation-log.md) |

## Cómo leer este artefacto

| # | Documento | Para qué |
|---|---|---|
| 00 | Este README | Resumen ejecutivo y mapa |
| 01 | [product-inventory.md](product-inventory.md) | Qué funcionalidades existen de verdad, rutas y estado |
| 02 | [user-journey.md](user-journey.md) | Del registro al uso diario, con diagramas |
| 03 | [current-architecture.md](current-architecture.md) | Frontend, backend, datos e integraciones tal como están |
| 04 | [domain-and-data-model.md](domain-and-data-model.md) | Entidades reales, relaciones y diagrama ER |
| 05 | [modules-and-dependencies.md](modules-and-dependencies.md) | Catálogo de módulos, acoplamientos y rubros |
| 06 | [security-audit.md](security-audit.md) | Autenticación, autorización, aislamiento y riesgos |
| 07 | [technical-debt.md](technical-debt.md) | Registro de hallazgos con prioridad P0–P3 |
| 08 | [target-architecture.md](target-architecture.md) | Arquitectura objetivo (propuesta, no implementada) |
| 09 | [onboarding-and-ux.md](onboarding-and-ux.md) | Onboarding y experiencia objetivo (propuesta) |
| 10 | [roadmap.md](roadmap.md) | Plan por etapas con criterios de finalización |
| 11 | [decisions/](decisions/README.md) | Decisiones arquitectónicas **propuestas** (ADR) |
| — | [validation-log.md](validation-log.md) | Comandos ejecutados y resultados |
| — | [remediation-log.md](remediation-log.md) | Correcciones aplicadas y su prueba |

Leyenda de estados usada en todos los documentos:

| Etiqueta | Significado |
|---|---|
| **VERIFICADO** | Implementado y comprobado ejecutando pruebas o código en esta auditoría |
| **IMPLEMENTADO** | El flujo existe de la UI a la base de datos, pero no se ejecutó aquí |
| **PARCIAL** | Existe una parte; falta otra pieza para que el flujo sirva |
| **SOLO UI** | Pantalla o placeholder sin persistencia propia |
| **SOLO ESQUEMA** | Tabla en el contrato sin pantalla ni acción que la use |
| **PLANIFICADO** | Aparece en documentos de visión, no en código |
| **NO ENCONTRADO** | Se buscó y no existe |
| **INDETERMINADO** | La evidencia disponible no alcanza |

---

## Resumen ejecutivo

### 1. ¿Qué es NEXUS hoy?

Un **monolito Next.js 16 (App Router) + React 19 + TypeScript**, con **Prisma 8
(`@prisma/orm-postgres` 8.0.0-rc.14)** sobre **PostgreSQL alojado en Supabase**,
**Clerk** para identidad y **Vercel** para el despliegue. Supabase se usa solo como
Postgres: no hay cliente de Supabase ni Supabase Auth en el código.

Tiene dos aplicaciones dentro del mismo despliegue:

1. **NEXUS Business** (`/{slug}/…`): el espacio de un negocio. Funciona de verdad
   para clientes (CRM 360°), finanzas y caja menor, cobros con recibo, gastos,
   catálogo e inventario con venta directa, facturación interna (recibos y cuentas
   de cobro, no factura DIAN), agenda, membresías con control de acceso QR/NFC
   (gimnasio), taquilla (museo), equipo con invitaciones y roles, Presence Thrive y
   una vertical de **construcción muy completa** (catálogo APU, presupuesto,
   cotización, Lean, bitácora, avance, informes).
2. **Operations Center** (`/admin/…`): el panel interno del equipo NEXUS (negocios,
   equipo y roles, CRM de prospectos, soporte, facturación de suscripciones,
   bandeja WhatsApp/correo, satisfacción, salud, catálogo de planes y módulos,
   auditoría, códigos de acceso).

Está en **piloto interno V1**: sin cobro automático (`SHOW_PRICING = false`,
`lib/onboarding/flags.ts`), acceso por códigos (`BenefitCode`) o plan gratuito.

Tamaño: ~86.800 líneas TS/TSX, 52 páginas, 7 route handlers, 44 archivos de
Server Actions, 71 tablas.

### 2. Del registro al uso (resumen)

Clerk (`/sign-up`) → `/auth/callback` decide el destino (equipo NEXUS → `/admin`;
invitación → su negocio; con negocio → `/{slug}`; nuevo → `/onboarding`). El
onboarding adaptativo crea **en una transacción** `Tenant` + `User` (OWNER) +
`TenantModule`, aplica un código de acceso si lo hay y lleva al dashboard. No hay
webhook de Clerk: el usuario local se crea de forma perezosa. Detalle en
[user-journey.md](user-journey.md).

### 3. Qué funciona y qué solo parece existir

- **Funciona (implementado de punta a punta):** CRM, finanzas/caja, cobros y
  recibos públicos firmados, inventario y venta directa, facturación interna,
  agenda, membresías y check-in, taquilla de museo, equipo e invitaciones,
  construcción completa, Operations Center, códigos de acceso.
- **Solo UI / placeholder:** Pedidos (`/orders`, `ModulePlaceholder`).
- **Parcial:** WhatsApp del negocio (abre `wa.me` con plantillas; no hay API),
  bandeja del panel (depende de claves de Meta/Resend), Presence (depende del
  equipo NEXUS).
- **Solo esquema:** salidas y reservas de turismo (`Departure`, `TourBooking`);
  el menú enlaza `/departures`, **ruta que no existe** (404).
- **No encontrado:** POS con carrito multi-producto, compras y proveedores (solo
  un campo `supplier` en gastos), factura electrónica DIAN, automatizaciones
  configurables, pagos en línea (Wompi), webhook de Clerk, tareas programadas.

### 4. Usuarios, organizaciones y módulos

`Tenant` es la organización. `User` **no es una persona**: es la membresía
(`clerkUserId` + `tenantId` + `role`). La persona vive en Clerk. `Customer` es el
cliente comercial del negocio (separado correctamente de `User`). El equipo NEXUS
es otra entidad (`StaffMember` + `StaffRole`, permisos granulares). Los módulos son
filas `TenantModule` (habilitado), con `Tenant.contractedModules` (contratado) y
`ModuleSetting.status` (operativo): tres conceptos que el código distingue, pero
**solo la navegación los respeta**. Ver [domain-and-data-model.md](domain-and-data-model.md).

### 5. ¿Cómo se aíslan los datos?

Solo por **código de aplicación**: cada query de negocio filtra por `tenantId`
resuelto en el servidor (`requireTenantContext`, `createTenantDb`). La app se
conecta con un rol privilegiado; **no hay políticas RLS** (las migraciones de
Prisma no activan RLS; el SQL manual de producción activa RLS en 36 tablas sin
ninguna política, lo que solo bloquea la API pública de Supabase). Las server
actions revisadas revalidan sesión y pertenencia, pero **17 páginas del negocio
leen datos solo por `slug` y delegan el control al layout**. Ver
[security-audit.md](security-audit.md).

### 6. Riesgos principales (P0)

| ID | Hallazgo | Estado |
|---|---|---|
| SEC-01 | La búsqueda de integrantes NEXUS por correo usa `ILIKE` sin escapar `_` y `%`: un correo parecido (`ana_perez@…`) **toma la ficha de `ana.perez@…`**, y "Usar esta cuenta" la reasigna aunque ya esté vinculada → acceso al Operations Center, incluida la suplantación de dueños | **VERIFICADO** (prueba local contra la función real) |
| SEC-02 | Un negocio sin miembros se lo queda **el primer usuario autenticado que abra `/{slug}`** (bootstrap de OWNER). El panel crea negocios sin usuarios | IMPLEMENTADO (código leído) |
| SEC-03 | 17 páginas confían en el layout para autorizar; con navegación RSC el layout puede no re-ejecutarse → posible lectura cruzada entre negocios | **HIPÓTESIS FUERTE**, requiere prueba local |
| SEC-04 | `.env.produccion` está versionado a propósito; no pude ver si contiene valores reales | INDETERMINADO (verificar ya) |

### 7. Problemas de modularidad

- Un "módulo" es a la vez un ítem de menú, una fila de precio y un enum. El
  catálogo vive en **cinco lugares** (enum `ModuleName`, `lib/admin-catalogs.ts`,
  tablas `ModuleSetting`/`VerticalSetting`, `lib/onboarding/module-meta.ts`,
  `lib/pricing/catalog.ts`).
- El módulo `quotes` **es** la suite de construcción (Obras + Cotizaciones +
  Catálogo APU) y se activa en mecánicos, guías turísticos y eventos.
- Activar un módulo no protege nada en el servidor: las rutas y acciones no
  comprueban si el módulo está habilitado o contratado, y el dueño puede
  activarse módulos sin importar su plan.
- Dos sistemas de roles (`lib/authorization.ts` para construcción y
  `lib/business/roles.ts` para el resto) y tres definiciones del tipo de rol.

### 8. Mejoras prioritarias

1. **P0** Corregir SEC-01 (igualdad exacta de correo, sin reasignar fichas
   vinculadas) y SEC-02 (sin bootstrap automático; alta con invitación de dueño).
2. **P0** Validar SEC-03 con una prueba local y mover la autorización a cada
   página/loader (`requirePageContext`).
3. **P1** Transacciones en los flujos de dinero (pago + recibo + caja + stock) y
   cobro idempotente de facturas.
4. **P1** Permisos por acción y por módulo en el servidor (una sola matriz).
5. **P1** Una sola fuente de verdad del esquema de producción (hoy: migraciones
   Prisma **y** SQL manual en el editor de Supabase).

Plan completo en [roadmap.md](roadmap.md).

### 9. Pruebas ejecutadas

| Verificación | Resultado |
|---|---|
| `pnpm install --frozen-lockfile --ignore-scripts` | OK |
| `pnpm exec tsc --noEmit` | Falla por memoria con el heap por defecto; **OK** con `--max-old-space-size=8192` |
| `pnpm lint` | 0 errores, 29 avisos |
| `pnpm test` | 46 archivos, **413 pruebas OK**, 126 omitidas (integración sin base) |
| `prisma db migrate` sobre Postgres 16 local vacío | **33/33 migraciones OK**, 71 tablas = 71 modelos |
| `pnpm test:integration` (Postgres local) | **19 archivos, 123 pruebas OK** |
| PoC SEC-01 (prueba local fuera del repo) | Confirmado |
| `pnpm build`, Storybook | **No ejecutados** (requieren claves de Clerk) |

### 10. Preguntas sin resolver con la evidencia

1. ¿Clerk exige verificar el correo antes de crear la cuenta? (decide la
   gravedad de todo lo que se vincula por correo).
2. ¿Qué contiene `.env.produccion` en el repositorio?
3. ¿Qué SQL de `docs/prod-sql/` está aplicado en producción? `00-ORDEN.md` marca
   el n.º 5 como pendiente y no lista los tres archivos del 2026-10-21.
4. ¿Existen en producción negocios creados desde el panel que aún no tienen
   miembros (expuestos a SEC-02)?
5. ¿El esquema real de producción coincide con `prisma/contract.prisma`
   (FK, índices, RLS)?
6. ¿Una persona debe poder pertenecer a varios negocios? El onboarding dice "una
   cuenta = un negocio", pero las invitaciones permiten varios y no hay selector.

### 11. Próximo paso recomendado

Abrir una rama de **seguridad P0** con tres cambios pequeños y verificables
(SEC-01, SEC-02 y la prueba local de SEC-03) antes de cualquier funcionalidad
nueva. En paralelo, responder las preguntas 1–4 en Clerk, el repositorio y
Supabase. Ver [roadmap.md](roadmap.md#etapa-0--contención-de-seguridad).
