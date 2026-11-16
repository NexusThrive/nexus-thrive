# ADR-0011 · Aprovisionamiento privado de negocios administrados

- ID: arquitectura/0011
- Título: Separar preparación, activación, invitación e identidad en el alta administrada
- Estado: Propuesta
- Fecha: 2026-11-16
- Responsables: dueño del producto y revisión humana de arquitectura; aceptación pendiente
- Reemplaza a: no aplica; concreta el alta sin reescribir decisiones aceptadas

## Contexto

NexusThrive administrará el alta de negocios. El propietario recibirá acceso después de la preparación y activación. La [auditoría](../02-arquitectura/propuestas/aprovisionamiento-administrado.md) encontró alta pública autenticada, invitación OWNER emitida al crear, aceptación independiente de la actividad del tenant y redirecciones al wizard. Hay negocios con datos y membresías que deben conservarse.

Se mantiene el monolito y la separación entre identidad Clerk, personal `StaffMember`, invitación `TenantInvite` y membresía `User`. No se implementan tienda, ventas, inventario, CRM, finanzas ni cambios de navegación interna. Preparar Commerce significa fijar el perfil existente en servidor y conservar la inicialización ya implementada.

## Decisión

### Autorización y estados

El aprovisionamiento requiere personal activo y permiso administrativo en el servidor. Todas las entradas administrativas usarán el mismo servicio. La acción pública de alta/reanudación dejará de mutar tenants aunque se invoque directamente. El wizard, su alias por tenant, códigos y callback no ofrecerán ni conducirán al onboarding retirado. Clerk estará en Invite-only como operación verificada por el administrador del dashboard.

Se propone extender **modelos existentes**, sin crear modelos nuevos:

| Concepto | Representación propuesta | Justificación |
| --- | --- | --- |
| Existencia | `Tenant.id` | Puede existir sin miembros ni invitaciones. |
| Transición | `Tenant.managedProvisioning`, booleano inicial false | Distingue heredados de nuevos sin deducirlo del rubro, fecha o ausencia de OWNER. |
| Propietario previsto | `Tenant.ownerEmail`, nullable para heredados | Sobrevive a renovación/revocación; no concede acceso. |
| Preparación | `Tenant.onboardingCompleted` conservado | Reutilizar como preparación técnica administrada; no usar `accountStage` comercial como seguridad. La UI nueva lo llama «Preparación». |
| Primera activación | `Tenant.activatedAt`, nullable | Distingue nunca activado de suspendido; se escribe una sola vez, estando listo. |
| Habilitación actual | `Tenant.active` y suspensión existentes | Nuevo administrado nace false; activar pone true; reactivar conserva fecha inicial e historial. |
| Reintento de alta | `Tenant.provisioningKey` único nullable y `provisioningRequestHash` | Misma clave/carga devuelve el tenant original; carga distinta devuelve conflicto. Slug único sigue siendo barrera definitiva. |
| Invitación | `TenantInvite` existente | Derivar pendiente, aceptada, revocada o vencida; no sustituir por OWNER inactivo. |
| Entrega | Campos aditivos de `TenantInvite`: estado, referencia Clerk/proveedor, intentos, lease, próxima ejecución y último error sanitizado | Reintento durable sin segunda tabla de invitaciones. Contrato exacto a verificar en HU-02. No registrar tickets ni enlaces utilizables en logs. |
| Membresía efectiva | `User` activo y único por cuenta/tenant | Crear/reactivar solo mediante aceptación autorizada y atómica. |

Para administrados, acceso operativo exige tenant activo, preparación completa, primera activación y membresía activa. Antes de activación no existe invitación utilizable. Aplicar la misma política en páginas, acciones, archivos y API; el layout no basta.

Para heredados se conserva actividad y membresía existentes: no exigirles fecha nueva ni completar masivamente el onboarding. Revisar incompletos con miembros sin retirar acceso previamente autorizado; la captura inicial no encontró esa cohorte, pero se incluye en pruebas. Mantener respuestas indistinguibles para cuentas ajenas; solo mostrar preparación/suspensión después de comprobar una relación autorizada.

### Transacciones e idempotencia

Alta: permiso → normalización/validación → transacción con clave de reintento, tenant, Commerce interno (`retail`), preset de servidor, puerto de inicialización existente y auditoría. No crear `User`, invitación vigente ni llamar al proveedor remoto dentro de ella. Si falla auditoría, revertir el hecho administrativo.

Preparación: transición administrativa explícita a listo, con configuración inicial persistida y validada. No exige pedidos, productos, inventario ni otros datos comerciales. Una corrección posterior no rebaja silenciosamente un negocio operativo a preparación.

Activación: bloquear fila de tenant y comprobar preparación/correo; fijar primera fecha/actividad y garantizar una sola invitación local pendiente por destinatario. Repetir devuelve resultado existente. Si ya tiene OWNER efectivo, no invitar otra vez ni sustituir identidad. Renovar vencidas es acción explícita; reactivar no renueva invitaciones. Auditoría y solicitud durable de entrega se confirman juntas.

Serializar activación, aceptación, revocación y suspensión con transacciones y orden de bloqueos común. Para unicidad de pendientes usar `acceptedAt IS NULL AND revokedAt IS NULL`, sin predicados temporales inestables. Revocar una vencida y crear sucesora en la misma transacción. Inspeccionar duplicados heredados antes del índice parcial; no borrar filas ni escoger ganadores arbitrariamente.

Aceptación: obtener identidad de Clerk en servidor, exigir principal verificado idéntico al autorizado, releer invitación y tenant con bloqueo, comprobar vigencia/actividad/preparación y escribir `User` y aceptación juntos. Repetir con la misma cuenta devuelve el resultado; otra cuenta no reclama aceptación previa. No cambiar roles de miembros existentes por una carrera de invitaciones.

### Entrega e identidad

Clerk identifica; `TenantInvite` autoriza el negocio. Para destinatarios nuevos, integrar invitación de aplicación Clerk con registro restringido y retorno al callback. Para identidad existente, reutilizar login y proveedor de correo compatible existente; no crear otro usuario ni usar `ignoreExisting` como atajo de duplicación. La aceptación siempre exige principal verificado, incluso con enlace válido.

Procesar la entrega persistida después del commit, con lease y reintentos acotados. Un fallo deja negocio activado e invitación/entrega pendiente o fallida visibles al administrador. No informar enviada antes de respuesta del proveedor ni interpretar respuesta como llegada a bandeja. Sin credenciales se conserva diagnóstico y pendiente, sin éxito manual ficticio.

Un timeout exige reconciliar antes de reenviar: PostgreSQL y Clerk no garantizan exactly-once conjunto. Las invitaciones Clerk son globales por aplicación/correo; un propietario puede tener varios negocios. Reutilizar/reconciliar la invitación de aplicación vigente y mantener autorizaciones locales independientes. Revocar localmente siempre bloquea esa membresía; no revocar una invitación remota compartida por otra alta válida ni eliminar la identidad al suspender.

No usar `StaffInvite` para propietarios. Comprobar que personal nuevo puede registrarse por invitación al restringir Clerk. No reutilizar sin cambios el dispatcher `OutboxEvent`, destinado a webhooks de clientes: podría exponer enlaces privados; la entrega de aprovisionamiento permanece interna.

### Login y destinos

| Relación comprobada | Resultado |
| --- | --- |
| Personal Nexus activo | `/admin`, sujeto a permisos existentes. |
| Invitación local vigente y negocio habilitado | Aceptación autorizada y `/{slug}`. |
| Miembro activo y negocio habilitado | `/{slug}`; priorizar accesibles si tiene varios. |
| Relación autorizada con negocio en preparación | Aviso sin acceso operativo. |
| Miembro de suspendido sin otro accesible | Aviso de suspensión. |
| Sin invitación ni membresía | Acceso no autorizado. |

Ningún destino conduce a `/onboarding`. Construir URLs desde origen configurado y slug validado; no aceptar redirects arbitrarios del cliente.

### Migración y despliegue

1. Comparar esquema/marker real, referencia de migración e inventario; preparar backup y restauración comprobable en entorno de ensayo.
2. Añadir columnas compatibles: modo false para heredados y nuevas columnas nullable cuando corresponda. Preservar valores/defaults existentes. Emitir contrato, generar paquete desde origen verificado y añadir SQL de producción equivalente; no usar `@empty` ni eliminar el booleano.
3. Inspeccionar duplicados antes de constraints; presentar ambigüedades a una persona sin borrar datos.
4. Desplegar política y nuevas escrituras coordinadamente. Probar convivencia de versiones en staging y establecer ventana si hace falta para impedir altas con invitaciones prematuras.
5. Configurar/comprobar Invite-only y callbacks por instancia; contrastar ids, roles, datos y acceso heredados antes/después. La captura de una base no sustituye la de producción.
6. Rollback de aplicación solo hacia versión compatible con administrados; no volver al aceptador o alta pública anteriores. Mantener esquema aditivo, contener acceso administrado si hace falta y corregir hacia adelante, sin eliminación de datos.

## Alternativas consideradas

- Ocultar botones: no impide invocar acciones ni registrar identidad externa.
- Usar solo `active=false`: confunde preparación con suspensión; la reactivación actual saltaría preparación.
- Crear OWNER inactivo: confunde intención con membresía y exige identidad todavía inexistente.
- Invitar al crear y bloquear UI: deja invitación utilizable antes de activar.
- Nuevas tablas de aprovisionamiento/invitación: duplican entidades existentes sin necesidad en el MVP.
- Forzar onboarding o Commerce a todos: rompe datos y accesos heredados.

## Consecuencias

Se reutilizan autorización, invitaciones, membresías, transacciones, validaciones y diseño. Se añaden estado durable y verificación de concurrencia/recuperación. Se conserva el booleano heredado para estabilidad del contrato; un renombrado requerirá otra transición.

## Riesgos

Entrega remota sin transacción compartida, invitación Clerk compartida entre tenants, dashboard pendiente e historial mixto de migraciones. La [auditoría](../02-arquitectura/propuestas/aprovisionamiento-administrado.md#riesgos-y-mitigaciones) detalla mitigaciones. La propuesta no acredita correo entregado ni configuración externa realizada.

## Cumplimiento

Rama, PR y comprobaciones reales por historia; matriz en el [plan](../07-ingenieria/propuestas/aprovisionamiento-administrado.md). La aceptación/integración estructural requiere revisión humana conforme a la [plantilla](plantilla.md). El implementador no aprueba QA ni revisión senior. No fusionar automáticamente.

## Referencias

- [Identidad y membresías, propuesta arquitectura/0002](ADR-0002-arquitectura-identidad-y-membresias.md).
- [Soluciones, arquitectura/0007 aceptada](ADR-0007-arquitectura-soluciones-sobre-plataforma.md).
- [Autenticación y aislamiento](../06-reglas/autenticacion-permisos-y-aislamiento.md).
- [Clerk: restricción](https://clerk.com/docs/guides/secure/restricting-access), [invitaciones](https://clerk.com/docs/guides/users/inviting), [createInvitation](https://clerk.com/docs/reference/backend/invitations/create-invitation), consultados el 2026-11-16.
