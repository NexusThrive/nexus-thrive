# Plan de aprovisionamiento administrado

## Objetivo y estado

Propuesta de **M01 — MVP privado administrado**, con **S01 — Alta, activación y acceso seguro**. No declara un sprint confirmado ni cambia el estado del plan heredado. La solicitud del 2026-11-16 autoriza preparar auditoría, ADR e implementación por historias; esta primera entrega documental antecede los cambios funcionales. No se desarrollan funciones comerciales ni navegación interna.

Fuentes: [auditoría](../../02-arquitectura/propuestas/aprovisionamiento-administrado.md), [ADR arquitectura/0011 propuesto](../../05-decisiones/ADR-0011-arquitectura-aprovisionamiento-administrado.md), [plan de producto](../../01-producto/plan.md).

No existe `docs/07-ingenieria/PAUSA` en la revisión inicial. Base: `main`, commit `593623e4`, árbol limpio antes de empezar. Sin merge automático. Engram `mem_session_summary` no está disponible; estos documentos conservan estado y siguientes pasos.

## Historias y dependencias

El usuario aceptó el ADR, M01/S01 y todas las historias el 2026-11-16 («acepto todo dale con todas»). Se implementan en PR apilados sin fusión automática. Por su petición posterior, se limita la repetición de pruebas: comprobaciones enfocadas por cambio y verificación consolidada al final.

HU-02, intento 1: contrato emitido y migración generada con 15 operaciones exclusivamente aditivas. La referencia `db` estaba atrasada y produjo un paquete ajeno al alcance; ese paquete local se descartó sin aplicarlo. Se comparó el almacenamiento del contrato anterior con los snapshots: origen exacto `a9b88b713550292f7a53606a717fc3f12e1ba425706df226c51113aaf3443f67`, destino `aa3535fad47d3ed4395c026ce67d9fbaaecae4118e20153ab85d2fec3036fdb4`. Incluye SQL operativo equivalente; ninguna migración se aplica a la base inventariada.

| HU | Resultado verificable | Rama | Dependencia |
| --- | --- | --- | --- |
| HU-01 | Auditoría en español, inventario real de lectura, ADR propuesto, riesgos y plan. Sin mutar aplicación/dashboard. | `chore/HU-managed-provisioning-audit-01` | Ninguna. |
| HU-02 | Contrato/migración aditivos de estados, correo, reintento y entrega; SQL de producción; preservación de ids, datos y roles demostrada. | `feature/HU-managed-provisioning-state-02` | HU-01; revisión estructural antes de integración. |
| HU-03 | Política común managed/legacy en contexto, archivos y API; aceptación transaccional con principal verificado y carreras protegidas. | `fix/HU-managed-access-policy-03` | HU-02. |
| HU-04 | Cerrar acciones públicas de creación/reanudación; retirar wizard/CTA; callback con destinos autorizados, preparación, suspensión o sin acceso. Conservar invitaciones válidas; revisar fallbacks y códigos. | `fix/HU-private-access-entrypoints-04` | HU-03. |
| HU-05 | Servicio común Commerce de nombre/slug/correo, transacción y reintento; ambas altas administrativas lo usan, sin membresía/invitación utilizable. Modal reducido y accesible, slug sugerido editable y errores/carga/éxito claros. | `feature/HU-managed-business-creation-05` | HU-02 a HU-04. |
| HU-06 | Consultar preparación y marcar listo; activar una vez con una invitación local; renovar/revocar/suspender/reactivar como acciones independientes, autorizadas y auditadas. | `feature/HU-managed-business-activation-06` | HU-05. |
| HU-07 | Entrega con Clerk/cuentas existentes, estado durable, recuperación de timeout, reenvío y renovación sin duplicados. Sin identidades duplicadas ni invitación preactivación. | `feature/HU-owner-invitation-delivery-07` | HU-06. |
| HU-08 | Recorridos completos y compatibilidad, dashboard documentado por instancia, evidencia de entrega y pruebas desplegadas, QA/revisión independientes. | `chore/HU-managed-provisioning-verification-08` | HU-02 a HU-07. |

Un PR en inglés por historia. No hay sprint/rama de integración confirmados: no crear ni pushear `sprint/S01`. Se pueden presentar dependencias como PR apilados apuntando a la historia anterior, con dependencia visible; HU-01 puede apuntar a `main` como documentación. Integración/promoción requieren revisión humana, sin aprobar el propio trabajo. Ningún despliegue parcial debe habilitar invitaciones prematuras. Máximo tres intentos por historia; registrar fallos y detener al tercero.

Antes de cada historia comprobar PAUSA y base. Antes de código Next.js leer guía instalada pertinente en `node_modules/next/dist/docs/`; para datos, referencias Prisma 8; para pruebas, `vitest.config.mts` y pruebas relevantes.

## Matriz de pruebas obligatorias

Todas las pruebas nuevas siguientes están **pendientes**. Las existentes son reutilizables, no acreditan el flujo nuevo.

| Caso | Evidencia requerida | HU |
| --- | --- | --- |
| Público no crea | Acción directa sin sesión y con cuenta ajena: cero tenant/User/invite, aunque conozca el payload anterior. | 04 |
| Administrador crea | `accounts.create`, datos válidos, Commerce interno, correo normalizado, sin User/invitación vigente; personal sin permiso rechazado. | 05 |
| Slugs duplicados | Dos transacciones concurrentes, una fila; constraint final y mensaje claro. | 05 |
| Alta reintentada | Misma clave/carga devuelve mismo id; carga distinta da conflicto; fallo de inicialización/auditoría revierte todo. | 05 |
| Preparación sin acceso | Cuenta del propietario ya existente no accede por página, acción, API ni archivo; invitación prematura sembrada para prueba no se acepta. | 03, 05 |
| Activación idempotente | Repetida y concurrente: una fecha inicial, un tenant y una invitación local pendiente. | 06 |
| Solo correo verificado autorizado | Principal exacto acepta; parecido, ajeno, secundario no principal o no verificado no acepta; ignorar correo/rol del cliente. | 03 |
| Vencida/revocada | No crear/reactivar User; doble aceptación y carrera revocación/aceptación; probar límite exacto de expiración. | 03, 06 |
| OWNER sin `/admin` | Login y acción directa, OWNER de negocio sin `StaffMember`, acceso denegado. | 04 |
| Otro tenant | Dos tenants/identidades: lecturas, escrituras, archivos e invitaciones ajenas denegados. | 03 |
| Suspensión | Sesión existente no opera por acción, archivo o API; aviso solo al relacionado; reactivar no renueva invitación. | 03, 06 |
| Cero redirects a wizard | Todas las ramas de callback, raíz, alias por tenant, beneficios, selector, registro invitado y variables desplegadas; URL final en navegador. | 04, 08 |
| Compatibilidad | Migración sobre copia aislada con completos/incompletos, activos/inactivos, varias membresías e historial de invitación; comparar ids/datos/roles/accesos antes/después. | 02, 08 |
| Entrega e identidad | Usuario nuevo/existente, mismo correo en dos tenants, timeout entre envío/persistencia y reintentos; revocar local no afecta otro negocio. | 07 |
| Accesibilidad | Foco, teclado, labels/errores asociados, anuncios de carga/disponibilidad/éxito, cancelación segura y doble submit; patrones existentes. | 05, 08 |

Reutilizar `tests/integration/core/tenancy/membership.integration.test.ts`, `tests/integration/platform/team/access.integration.test.ts`, `tests/integration/platform/admin/users.integration.test.ts`, unitarias de correo/roles/contexto y arquitectura de páginas/tenant-scope. La prueba de membresía actual **espera una invitación al crear** y cambiará expresamente. Fixtures comerciales que llaman `createAdminDb().createTenant` necesitan estado explícito; no cambiar reglas comerciales para acomodar tests.

## Verificación por historia y despliegue

Ejecutar `pnpm docs:check`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm check:layers`, `env TEST_DATABASE_URL= pnpm test` y pruebas enfocadas. Para contrato/autorización, integración PostgreSQL aislada es obligatoria. `pnpm test:integration` exige `TEST_DATABASE_URL` explícita y `DATABASE_URL` coincidente; nunca ejecutar pruebas destructivas sobre la base inventariada. `pnpm verify` añade integración y build y se detiene ante el primer fallo. La ausencia de base de prueba se registra como pendiente, nunca aprobada. UI requiere pruebas de navegador pertinentes.

No sustituir pruebas nuevas por lectura de código, ni respuesta de proveedor por prueba de llegada a bandeja. Intervención Clerk en la [auditoría](../../02-arquitectura/propuestas/aprovisionamiento-administrado.md#clerk-intervención-pendiente), todavía no realizada.

## Evidencia de la primera entrega

- Fecha: 2026-11-16. HU-01, intento 1; auditoría y propuesta documental para revisión.
- Inventario autorizado: PostgreSQL `BEGIN READ ONLY`, timeout y `ROLLBACK`; 79 tenants, 16 completos/con miembros, 63 incompletos/sin miembros, 0 inactivos y 0 invitaciones pendientes vigentes. Sandbox falló `EPERM`; repetición autorizada exitosa. Captura y límites en auditoría.
- Rama: `chore/HU-managed-provisioning-audit-01`; creación inicialmente bloqueada por sandbox y repetida con autorización. No se modificaron datos ni credenciales.
- `pnpm docs:check`: código 0, 520 documentos, 1.446 enlaces locales, cero errores nuevos; diez fallos preexistentes en enlaces de skills Prisma de terceros. Repetido tras las correcciones documentales con el mismo resultado.
- Pruebas enfocadas: `env TEST_DATABASE_URL= pnpm exec vitest run tests/architecture/documentation.test.ts tests/architecture/documentation-tools.test.ts tests/unit/core/auth/session-email.test.ts tests/unit/core/auth/permissions.test.ts tests/unit/core/tenancy/context.test.ts tests/unit/platform/team/permissions.test.ts`: código 0, 6 archivos y 49 pruebas aprobadas.
- `env TEST_DATABASE_URL= pnpm test`: código 0, 171 archivos aprobados/88 omitidos, 2.477 pruebas aprobadas/521 omitidas; duración 138,32 s. Las omitidas no acreditan integración.
- `pnpm check:layers`: código 0, 388 archivos, cero dependencias nuevas y cero ciclos de valores; tres ciclos de solo tipos dentro del tope existente.
- `pnpm test:integration`: código 1 por `TEST_DATABASE_URL` no definida; no ejecutó pruebas ni se usó la base inventariada. La integración del objetivo sigue pendiente.
- `pnpm lint`: código 0, cero errores y 37 advertencias en código existente; sin aplicar fixes ajenos al alcance. `pnpm exec tsc --noEmit`: código 0, sin diagnósticos.
- `git diff --check` y `git diff --cached --check`: sin errores. `pnpm verify`, build y navegador no ejecutados en este cambio exclusivamente documental; no se afirma validación del nuevo flujo.
- Los primeros intentos de comandos pnpm en sandbox fallaron antes de ejecutar por descarga/verificación de pnpm 12.3.4 (`fetch failed`); se repitieron con red autorizada sin desactivar firmas. Fallos de entorno separados de los resultados anteriores.
- PR documental: [#160](https://github.com/NexusThrive/nexus-thrive/pull/160), en borrador hacia `main`, sin fusión. Commit inicial `6abfdc00`. El conector GitHub devolvió 403 al crear el PR; se publicó con la CLI autenticada. QA/revisión arquitectónica: pendientes de revisor independiente.
- Engram no disponible; objetivo, instrucciones, hallazgos, resultados, pendientes y archivos relevantes conservados en auditoría, ADR y este informe.

Siguiente: revisar HU-01/ADR y ejecutar HU-02 en su rama/PR, seguido por política común y cierre de entradas. El ADR requiere revisión humana antes de integrar decisiones estructurales; escribirlo no lo acepta. Historias funcionales todavía no implementadas.
