# Borrado de un negocio

Política de datos del borrado de raíz. Resumen del comportamiento de `deleteTenantCompletely`; los comentarios originales
siguen en el código.

## Qué hace

Elimina el negocio y **todos** sus datos: clientes, membresías, dinero (caja, pagos, facturas, gastos), asistencia, agenda,
proyectos y catálogo APU, tickets, leads, CRM, presencia, invitaciones, módulos y las cuentas de su equipo.

- Todo ocurre en **una transacción**: o se borra todo o no se borra nada. Si falla, devuelve `{ ok: false, message }`.
- Orden: de hija a padre, para no chocar con las claves foráneas. Primero las tablas de nivel 2 (las que cuelgan de datos del
  negocio sin llevar `tenantId`), después las de nivel 1 y al final el negocio; las tablas con clave foránea a `Tenant` caen en
  cascada.
- Devuelve el recuento por tabla (`deleted`, `total`, `tables`) y los identificadores de Clerk (`clerkUsers`) de las cuentas que
  quedan libres.

## Qué NO se borra

Lo que es de la plataforma y no del negocio: los roles del panel, el equipo de NEXUS, los códigos de acceso (PROMO/PAID) y la
auditoría.

Las cuentas de Clerk del equipo **quedan libres**: se borra su ficha de negocio, así que pueden entrar y crear otro negocio o ser
invitadas a un equipo.

## Quién lo invoca

- Panel de administración: `app/admin/negocios/actions.ts`.
- Ajustes del propio negocio: `app/[tenant]/(app)/settings/actions.ts` (con `context.tenantId`).

La autorización y la confirmación se deciden en esas acciones, no dentro de la función.

## Cómo se mantiene al día la lista de tablas

`TENANT_DELETION_TABLES` (exportada) enumera las tablas que cubre el borrado. La prueba de integración
`lib/tenant/deletion.integration.test.ts` la compara con las tablas que tienen `tenantId` según el contrato generado (`prisma/contract.json`): **si se agrega
una tabla nueva con `tenantId`, la prueba falla hasta incluirla**. Quien agregue un modelo en `prisma/schema/` debe revisar esa
lista.

## Tener presente

- Es una operación destructiva. Este documento no verifica si hay respaldo previo ni papelera; no aparece en el código de la función.
- La prueba que protege la lista es de integración y necesita `TEST_DATABASE_URL`; sin ella se omite (ver
  `auditoria-pruebas-integracion.md`).

## Referencias

`lib/tenant/deletion.ts` · `lib/tenant/deletion.integration.test.ts` · `app/admin/negocios/actions.ts` · `app/[tenant]/(app)/settings/actions.ts`
