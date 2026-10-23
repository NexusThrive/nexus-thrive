## Qué cambia y por qué

<!-- Una o dos frases. Enlaza el pendiente o la capa (.docs/) si aplica. -->

## Qué se probó

<!-- Comandos y resultados reales. Lo que no se pudo probar, dilo. -->

- [ ] `pnpm exec tsc --noEmit`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm test:integration` (si toca datos)
- [ ] `pnpm test:e2e` (si toca un componente compartido)

## Revisión de datos (obligatoria si toca lib/ o acciones)

- [ ] **Sin acceso directo a la base desde `app/`**: todo pasa por un repositorio de `lib/` (ESLint y `lib/tenant/data-access.test.ts` lo vigilan).
- [ ] **`tenantId` en cada consulta** de una tabla de negocio (`lib/tenant/tenant-scope.test.ts`); una excepción nueva lleva su motivo en esa prueba.
- [ ] **Permiso** comprobado en el servidor: `requireTenantContext(slug, "/<ruta>")` + `can(ctx.role, "…")` (o `requireStaff("…")` en el panel).
- [ ] **Dinero solo por `money-service.ts`** (cobrar, pagar, anular, caja): en una transacción y sin cobros dobles.
- [ ] **Bitácora**: lo sensible o destructivo deja `logTenantAction` (o `logOps` en el panel).
- [ ] Si cambió el contrato: migración + SQL de producción en `docs/prod-sql/` + `00-ORDEN.md`.

## Revisión de interfaz (si cambia lo que se ve)

- [ ] [Lista de calidad](../docs/design/quality-checklist.md) revisada.
- [ ] Capturas antes/después (sin datos personales).
- [ ] Guía de ayuda actualizada si cambió un flujo.
