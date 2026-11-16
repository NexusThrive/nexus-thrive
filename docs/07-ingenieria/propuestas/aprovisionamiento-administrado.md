# Plan de aprovisionamiento administrado

## Objetivo y estado

**M01 — MVP privado administrado**, con **S01 — Alta, activación y acceso seguro**, aceptados por el usuario el 2026-11-16 después de la auditoría inicial. Las historias se implementan en ramas y PR dependientes, sin fusión automática. No se desarrollan funciones comerciales ni navegación interna; se retira únicamente la opción pública de crear otro negocio.

Fuentes: [auditoría](../../02-arquitectura/propuestas/aprovisionamiento-administrado.md), [ADR arquitectura/0011 aceptado](../../05-decisiones/ADR-0011-arquitectura-aprovisionamiento-administrado.md), [plan de producto](../../01-producto/plan.md).

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

Un PR en inglés por historia. Se confirmó el objetivo S01, pero no una rama de integración: no crear ni pushear `sprint/S01`. Se pueden presentar dependencias como PR apilados apuntando a la historia anterior, con dependencia visible; HU-01 puede apuntar a `main` como documentación. Integración/promoción requieren revisión humana, sin aprobar el propio trabajo. Ningún despliegue parcial debe habilitar invitaciones prematuras. Máximo tres intentos por historia; registrar fallos y detener al tercero.

Antes de cada historia comprobar PAUSA y base. Antes de código Next.js leer guía instalada pertinente en `node_modules/next/dist/docs/`; para datos, referencias Prisma 8; para pruebas, `vitest.config.mts` y pruebas relevantes.

## Matriz de pruebas obligatorias

La evidencia nueva se detalla en el cierre de implementación; esta matriz conserva los criterios acordados. Las comprobaciones de proveedores y navegador reales se distinguen de la integración con proveedores simulados.

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

Reutilizar `tests/integration/core/tenancy/membership.integration.test.ts`, `tests/integration/platform/team/access.integration.test.ts`, `tests/integration/platform/admin/users.integration.test.ts`, unitarias de correo/roles/contexto y arquitectura de páginas/tenant-scope. La prueba de membresía anterior **espera una invitación al crear** mediante la fábrica heredada; conserva esa cobertura legacy. Las nuevas pruebas ejercitan el servicio administrado sin invitación al alta. Fixtures comerciales que llaman `createAdminDb().createTenant` necesitan estado explícito; no cambiar reglas comerciales para acomodar tests.

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

Este es el cierre histórico de la primera entrega documental. Después, el usuario aceptó el ADR y autorizó todas las historias; la implementación y su evidencia siguen a continuación.

## Implementación y revisión del conjunto

Todas las historias de código están implementadas en la pila de ramas, sin fusión ni despliegue. HU-08 conserva evidencia y correcciones de revisión; no declara configuración externa realizada.

PR publicados en borrador, un PR por historia y cada base igual a la rama de la historia anterior:

| Historia | PR | Base |
| --- | --- | --- |
| HU-01 | [#160](https://github.com/NexusThrive/nexus-thrive/pull/160) | `main` |
| HU-02 | [#161](https://github.com/NexusThrive/nexus-thrive/pull/161) | HU-01 |
| HU-03 | [#162](https://github.com/NexusThrive/nexus-thrive/pull/162) | HU-02 |
| HU-04 | [#163](https://github.com/NexusThrive/nexus-thrive/pull/163) | HU-03 |
| HU-05 | [#164](https://github.com/NexusThrive/nexus-thrive/pull/164) | HU-04 |
| HU-06 | [#165](https://github.com/NexusThrive/nexus-thrive/pull/165) | HU-05 |
| HU-07 | [#166](https://github.com/NexusThrive/nexus-thrive/pull/166) | HU-06 |
| HU-08 | [#167](https://github.com/NexusThrive/nexus-thrive/pull/167) | HU-07 |

La pila local se ordenó antes de su primera publicación para colocar correcciones de tipos y retiro del gate en sus historias responsables; sin force ni cambios de ramas remotas existentes. El árbol final conserva el resultado revisado. Los resultados de CI de cada PR son independientes de la verificación local registrada abajo; no se presume CI aprobada por abrir los PR.

| Historia | Estado del código | Evidencia principal |
| --- | --- | --- |
| HU-01 | Auditoría entregada; ADR aceptado posteriormente por el usuario | PR #160 y aceptación registrada en arquitectura/0011. |
| HU-02 | Implementada; migración verificada en base aislada | 15 operaciones aditivas; cadena de 91 migraciones aplicada; SQL de actualización preserva datos y membresías anteriores. |
| HU-03 | Implementada y verificada en integración | Política común en contexto/archivos/API y aceptación serializada; principal verificado, aislamiento y suspensión. |
| HU-04 | Implementada y verificada de forma enfocada | Acciones públicas rechazadas; wizard retirado; callback y plantillas de producción sin retornos al onboarding. Registro con ticket y destinos forzados al callback. |
| HU-05 | Implementada y verificada en integración | Alta autorizada, correo normalizado, Commerce interno, auditoría atómica, reintento y colisión de slug; modal compartido con tres campos. |
| HU-06 | Implementada y verificada en integración | Preparación explícita, activación concurrente sin duplicados, renovación/revocación y reactivación sin nuevas invitaciones. |
| HU-07 | Implementada y verificada con proveedores simulados | Lease, entrega concurrente única, fallo/reintento y reutilización de identidad existente; cron autenticado y registro de personal invitado compatibles. |
| HU-08 | Verificación local y revisión estática completadas; validación externa pendiente | Resultados abajo; no sustituye QA de entorno desplegado. |

Las entradas administrativas usan `createManagedBusiness`. La fábrica anterior `createAdminDb().createTenant` permanece para compatibilidad y fixtures; ya no es invocada por las acciones de alta ni hay una acción pública que la exponga. No se han cambiado módulos comerciales ni se han activado o migrado negocios reales.

### Resultados reales

- PostgreSQL 17 temporal independiente en `127.0.0.1:15439/nexus_managed_test`, sin utilizar credenciales ni datos de la base inventariada. Se creó solo para esta verificación.
- `prisma contract emit`: código 0; hash de almacenamiento final `aa3535fad47d3ed4395c026ce67d9fbaaecae4118e20153ab85d2fec3036fdb4`.
- `prisma db migrate` contra esa base: código 0, **91 migraciones aplicadas**, marker final igual al contrato. Registro local `/tmp/nexus-managed-test-migration.log`.
- `vitest run --testTimeout=20000 --no-file-parallelism tests/integration/core/tenancy/managed-provisioning.integration.test.ts`: código 0, **13 pruebas aprobadas**, 2,71 s. Incluye acciones de servidor con personal real en la base de ensayo, concurrencia, correo no verificado/ajeno, OWNER sin personal Nexus, aislamiento, suspensión, fallo de correo, reintento, herencia y actualización SQL con datos previos. Clerk y correo están simulados; **no se enviaron mensajes reales**. Registro `/tmp/nexus-managed-focused-integration.log`.
- Selección de unitarias y arquitectura (`access-policy`, `private-entrypoints`, correo de sesión, autorización de páginas, tenant-scope y acceso a datos): código 0, **826 pruebas aprobadas en 6 archivos**, 2,41 s. La cifra incluye casos parametrizados de rutas existentes; no se repitió la suite completa. Registro `/tmp/nexus-managed-focused-unit.log`.
- Tras añadir `.env.produccion` a la regresión de destinos, se repitió únicamente `private-entrypoints.test.ts`: código 0, **4 pruebas aprobadas**, 1,93 s. No se repitieron integración ni suite completa por ese ajuste.
- `pnpm exec tsc --noEmit`: código 0 en el conjunto funcional. La primera pasada detectó dos usos de `Temporal.Now` incompatibles con las declaraciones locales; se corrigieron a `Temporal.Instant.fromEpochMilliseconds` antes de la pasada exitosa.
- ESLint limitado a los archivos de implementación afectados: código 0, sin diagnósticos. Registro `/tmp/nexus-managed-focused-lint.log`.
- El CI inicial de HU-08 detectó una ruta nueva fuera de esa selección de lint: `Date.now()` en el render de registro del personal invitado (`react-hooks/purity`). Se movió la validación temporal a `getValidStaffInvite` en la capa de servidor y se comprobó lint de ambos archivos. Fallo inicial: [run 43932770008](https://github.com/NexusThrive/nexus-thrive/actions/runs/43932770008). El resultado de la nueva ejecución de CI se consulta por separado; no se oculta el fallo anterior.
- `node scripts/check-layers.mjs`: código 0; 394 archivos, cero dependencias nuevas/ciclos de valores, tres ciclos de solo tipos dentro del tope existente.
- `pnpm build` con la base temporal: código 0; compilación, TypeScript y generación de rutas completadas. Registro `/tmp/nexus-managed-build.log`. No se desplegó el resultado.
- `pnpm docs:check`: código 0; cero errores nuevos y los diez enlaces preexistentes de skills de terceros. Un intento directo en sandbox falló al lanzar Git (`EPERM`); repetición autorizada exitosa.
- Comprobación documental final con los PR publicados: 520 archivos, 1.455 enlaces locales, código 0. `scripts/check-prod-sql.sh 42871b6d` confirmó SQL operativo para el cambio de modelo; diff sin errores de espacios. El contenedor temporal fue detenido y retirado después del build y de las pruebas; los logs permanecen en `/tmp`.
- No se ejecutaron de nuevo la suite completa, toda la integración ni `pnpm verify`, conforme a la petición de reducir repeticiones. Las comprobaciones enfocadas cubren las fronteras modificadas. No se ejecutó navegador contra Clerk real ni se acredita llegada a bandeja de correo.

### Revisión independiente

Corrección de CI solicitada por el usuario: los runs [HU-08](https://github.com/NexusThrive/nexus-thrive/actions/runs/43941955247), [HU-09](https://github.com/NexusThrive/nexus-thrive/actions/runs/43944103185) y [HU-10](https://github.com/NexusThrive/nexus-thrive/actions/runs/43946882805) fallaron en las mismas dos pruebas unitarias: cobertura de Storybook para `ManagedAccessNotice` y dependencia no permitida `admin → inbox`. Las comprobaciones locales previas eran enfocadas y no habían cubierto estos dos controles; el fallo es real y no corresponde a la base de datos local.

Se añadieron historias de preparación, suspensión y acceso no autorizado. El transporte de correo existente se pasa desde las acciones administrativas y el cron al servicio de invitaciones: desaparece la importación de Inbox desde Admin y se conserva el grafo permitido, sin modificar la prueba arquitectónica ni aumentar excepciones. La clave de idempotencia, los leases, reintentos y resultados del proveedor permanecen iguales. Se ajustaron las llamadas de integración a la dependencia explícita. Es una corrección para cumplir la arquitectura vigente, sin nueva decisión estructural ni cambios de contrato.

Verificación local del arreglo: **21/21 pruebas** en `v10-platform.test.ts` y `stories-coverage.test.ts`, código **0**; compilador TypeScript instalado `--noEmit`, código **0**; lint enfocado de los cinco archivos modificados, código **0**. Las **13/13 pruebas de integración de aprovisionamiento** pasaron en una base temporal independiente con las 91 migraciones aplicadas y proveedores simulados; la base fue retirada al terminar, sin modificar datos locales ni Supabase. `pnpm docs:check`, código **0**, 520 documentos y 1.456 enlaces, diez fallos preexistentes de terceros. El revisor independiente confirmó todos los puntos de composición y ausencia de cambios de comportamiento en la entrega. La nueva ejecución completa de CI y su propagación a los tres PR se registran por separado; no se presume resultado satisfactorio de etapas que aún no han corrido. Engram no disponible: esta evidencia y las limitaciones quedan en el informe.

El subagente `provisioning_review`, distinto del implementador y con trabajo de solo lectura, revisó autorización, aislamiento, concurrencia, entrega y compatibilidad. Detectó tres puntos que se corrigieron: selección de reintentos antes de filtrar backoff/lease; permiso extra en reactivaciones heredadas; y gate del layout retirado que podía generar un retorno al wizard. Tras reexaminar las correcciones emitió **veredicto estático independiente favorable, sin bloqueos adicionales en el alcance inspeccionado**.

Ese veredicto no es aprobación de QA desplegado ni certifica dashboard, ticket real, cron o entrega externa. La revisión no repitió las pruebas del implementador. Intentos: primera implementación de cada historia, con correcciones de revisión en HU-08; no se agotó el límite de tres intentos.

### Activación operativa pendiente

Antes de integrar/desplegar, seguir la [guía operativa](../../08-operaciones/devops.md#aprovisionamiento-privado-de-negocios): revisar y aplicar la migración en el entorno correspondiente; seleccionar Invite-only en Clerk; configurar remitente y origen; programar el cron; comprobar el recorrido real con un correo autorizado. Estos pasos requieren credenciales y estado externos y **no se ejecutaron automáticamente**. No se hace merge a `main` ni push a `sprint/*`.

Engram sigue sin estar disponible. Este reporte conserva objetivo, aceptación, decisiones, archivos responsables, comandos, resultados, revisión independiente y pendientes para continuar sin depender del historial de conversación.

## Aplicación local y configuración operativa — 2026-11-16

El usuario pidió aplicar la migración en ambas bases configuradas. La conexión Supabase de `DIRECT_URL` devolvió `28P01` (autenticación); posteriormente indicó expresamente **dejar Supabase pendiente**. No se modificó su esquema ni se copiaron credenciales al repositorio. El usuario confirmó Invite-only en Clerk; la configuración del proveedor de correo y del cron se trata por entorno, sin inferirla de esa confirmación.

En PostgreSQL local se aplicó exclusivamente el SQL aditivo de aprovisionamiento a las **2026-11-16T19:01:31Z**. Respaldo previo en formato custom, legible por `pg_restore --list`, de 867.253 bytes; ubicación privada `/tmp/nexus-provisioning-live-migration/local-backup-1794855690739.dump`. Las capturas y diagnósticos completos permanecen en el mismo directorio privado; no se publican datos de negocios ni membresías.

La transacción bloqueó las tablas implicadas durante el cambio y comparó los campos anteriores antes y después: **79 tenants, 17 membresías y una invitación histórica conservados**, sin diferencias en los datos comparados. Se añadieron las columnas de estado/entrega y la unicidad de invitaciones pendientes; los 79 tenants anteriores conservaron `managedProvisioning=false`. No se ejecutaron scripts de datos comerciales.

El marker local anterior (`a8971d5b…`) no pertenece al grafo versionado, por lo que no se ejecutó una cadena general de migraciones. Después del SQL, `db verify --schema-only` detectó **762 diferencias adicionales** entre esa base y el contrato completo, incluidas tablas de otros módulos ausentes. **No se firmó el nuevo contrato ni se alteró el marker** para ocultarlas. El SQL solicitado está aplicado; la base local completa todavía requiere una reconciliación de esquema separada antes de declararla alineada con todo el contrato.

La consulta del negocio reportado por el usuario confirmó estado de preparación, sin primera activación y sin invitación: no debe salir correo al completar ese modal. En el entorno local tampoco están configuradas las parejas `RESEND_API_KEY`/`INBOX_EMAIL_FROM` ni `CRON_SECRET`. La [guía operativa](../../08-operaciones/devops.md#activar-correo-y-cron) contiene los pasos de configuración; estos valores no se han inventado ni se han escrito secretos en Git. No se enviaron mensajes de prueba ni se activó el negocio por cuenta del propietario.

Siguientes pasos: configurar correo y origen en el entorno usado, marcar preparación lista y activar desde la ficha; publicar el workflow del cron; corregir la conexión Supabase cuando el usuario retome esa migración. Engram sigue sin estar disponible; este apartado conserva el cierre y sus limitaciones.

### Corrección de lectura de productos — 2026-11-16

El acceso al panel expuso una de las migraciones históricas pendientes: `Product.categoryId` no existía y la consulta de primeros pasos fallaba al cargar el shell. Se aplicó a la base **local**, a las **2026-11-16T19:34:51Z**, el SQL ya versionado `2026-11-08-catalogo-categorias-atributos-y-canales.sql`, correspondiente a `20261108T1713_catalogo_categorias_atributos_y_canales`. No se modificó lógica de catálogo, ventas o inventario ni se aplicaron cambios a Supabase.

Respaldo previo legible en `/tmp/nexus-provisioning-live-migration/local-before-catalog-1794857690599.dump`. Comparación dentro de la transacción: **6 productos, 82 tenants y 19 membresías conservados**. Las siete columnas de producto de esa migración quedaron consultables. Una comprobación de lectura con el runtime y contrato Prisma de la aplicación pasó en los tres tenants administrados (`Product.where({ tenantId }).limit(1).all()`); sin imprimir datos comerciales ni ejecutar baterías de pruebas. El marker antiguo permanece sin cambios y no se declara resuelta la divergencia global previamente documentada.

### Corrección de lectura de Notificaciones — 2026-11-16

El buzón falló porque la tabla histórica `Task` no existía en la base local. La revisión de las consultas del mismo recorrido también identificó la columna ausente `StoreOrder.fulfillment`. A las **2026-11-16T19:39:05Z** se aplicaron transaccionalmente los SQL versionados de tareas (`2026-11-07-tareas.sql`), tareas de proyecto (`2026-11-07-tareas-de-proyecto.sql`) y cumplimiento de pedidos (`2026-11-07-cumplimiento-de-pedidos.sql`). Del SQL de CRM (`2026-11-07-crm-pipeline.sql`) se extrajeron exclusivamente las dos instrucciones aditivas de `Task.dueAt` y `Task.kind`, requeridas por el contrato actual; no se aplicó el resto del cambio de CRM. No se modificó código funcional comercial ni Supabase.

Respaldo previo completo, legible por `pg_restore --list`, en `/tmp/nexus-provisioning-live-migration/local-before-notifications-1794857944255.dump`. Bajo bloqueo transaccional se compararon todos los campos anteriores de **82 tenants, 19 membresías, 6 productos y cero pedidos**, sin diferencias. Las proyecciones de tareas y pedidos quedaron consultables. Después pasaron las funciones reales `loadInbox` y `loadNotifications` con el runtime Prisma de la aplicación para los **dos tenants administrados con membresías activas**; comprobación de solo lectura, sin repetir suites. El primer intento del comprobador falló por utilizar un nombre de función inexistente; se corrigió únicamente la utilidad temporal y se repitió la lectura con éxito. El marker no se alteró; la divergencia global sigue pendiente. Engram no disponible: esta evidencia permanece en el informe.
