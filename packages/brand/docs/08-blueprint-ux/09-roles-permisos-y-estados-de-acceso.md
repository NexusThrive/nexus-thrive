# 09 · Roles, permisos y estados de acceso

[← Índice](README.md) · Decisiones citadas: DR-10, DR-34, DR-46 (nueva), PD-05, PD-11. Principios: **D3** (el contexto, incluido el rol, determina la experiencia), **P5** (el dinero no se equivoca), **S3** (confianza). Regla de seguridad vigente: **el servidor decide; la pantalla solo oculta o explica** (SEC-05).

## 1. Qué existe (hechos)

### 1.1 Dos modelos que no deben confundirse

| Modelo | Quiénes | Dónde vive | Para qué |
|---|---|---|---|
| **Roles del negocio** | `OWNER`, `ADMIN`, `RECEPTION`, `ADVISOR`, `STAFF`, `SUPERADMIN` | `lib/core/auth/roles.ts`, `permissions.ts` | Qué puede hacer cada integrante **dentro de un negocio** |
| **Roles del equipo Nexus** | Propietario, Finanzas, Comercial, Soporte, Técnico | `lib/platform/team/permissions.ts` | Operar la plataforma (Operations Center `/admin`) |

El Operations Center es una superficie distinta (`app/admin`); su experiencia se rige por el mismo sistema de diseño, pero no es el espacio del negocio.

### 1.2 Roles que ve el usuario al invitar (UI)

| Etiqueta | Descripción visible (`roles.ts`) |
|---|---|
| **Dueño** | Todo, incluido el plan y el equipo |
| **Administración** | Dinero, inventario, equipo y reportes |
| **Recepción** | Cobros, caja, agenda, clientes y membresías |
| **Asesor** | Clientes, agenda y WhatsApp. **Sin dinero** |

`STAFF` y `SUPERADMIN` existen en el modelo y no se ofrecen al invitar.

### 1.3 Matriz de permisos generales (de `BUSINESS_PERMISSIONS`)

Se muestran los permisos transversales; los de Construcción (presupuesto, APU, proyectos, bitácora, Lean) existen y siguen la misma tabla.

| Permiso | Qué cubre | SUPERADMIN | OWNER | ADMIN | RECEPTION | ADVISOR | STAFF |
|---|---|---|---|---|---|---|---|
| `business.manage` | Anular, editar montos, inventario, catálogo, reportes | ✔ | ✔ | ✔ | – | – | – |
| `team.manage` | Invitar/retirar personas, plan y facturación de Nexus | ✔ | ✔ | ✔ | – | – | – |
| `business.setup` | Configurar el negocio (plan, módulos, enlace) | ✔ | ✔ | – | – | – | – |
| `money.handle` | Cobrar, gastos, turnos de caja | ✔ | ✔ | ✔ | ✔ | – | ✔ |
| `data.exchange` | Importar y exportar | ✔ | ✔ | ✔ | – | – | – |
| `customers.delete` | Borrar o archivar clientes | ✔ | ✔ | ✔ | – | – | – |

### 1.4 Cómo se aplica hoy

| Aspecto | Hecho observado |
|---|---|
| Menú | **No se filtra por rol.** `buildTenantNav(vertical, activeModules)` recibe rubro y módulos activos, no rol |
| Acciones rápidas («Crear») | **Sí se filtran por rol** (`quick-create.ts`) |
| Páginas | 38 páginas del negocio: 25 comprueban permiso con `can()` (o equivalentes) en la propia página; las demás dependen del contexto de página o de las acciones del servidor |
| Cuando falta permiso | Dos tratamientos: **`notFound()`** (p. ej. `finance`, `inventory`, `settings`) y **aviso en página** con `Alert tone="info"` o `StaffAccessNotice` en **13 páginas**: `cartera`, `cobros`, `contabilidad`, `crecimiento`, `data`, `factura-electronica`, `google`, `pedidos-tienda`, `pos`, `purchases`, `sitio`, `stock`, `taxes` |
| Textos de aviso | Escritos a mano en cada página (leídos en `google`, `cobros`, `factura-electronica`, `data`: «Solo el dueño o administración…», «Tu rol no maneja…») |
| Inicio | `page.tsx` **no llama a `can()`** para decidir qué indicadores mostrar (sí filtra las acciones rápidas) |

## 2. Problemas de experiencia (con su principio)

| # | Problema | Evidencia | Principio |
|---|---|---|---|
| R-1 | Dos criterios para «sin permiso» | `notFound()` frente a aviso en 13 páginas | D2, P4 |
| R-2 | Textos de rol escritos a mano | 4 leídos; riesgo de quedar desactualizados si cambia la matriz | P3, P5 |
| R-3 | El menú muestra ítems que el rol no puede abrir | `buildTenantNav` sin rol | D3 («sin menús que no usa») |
| R-4 | **H-15:** el Inicio podría mostrar indicadores de dinero a un rol «sin dinero» | `page.tsx` sin `can()`; descripción de Asesor: «Sin dinero» | P5, D3 |
| R-5 | El mismo permiso se explica distinto según la pantalla | Textos a mano | P6 |

*R-4 es una hipótesis: puede haber un filtro en una capa inferior. Debe comprobarse en pantalla con un rol Asesor antes de tratarlo como defecto.*

## 3. Estados de acceso (el vocabulario de la experiencia)

| Estado | Cuándo ocurre | Qué ve la persona | Fuente |
|---|---|---|---|
| **Sin sesión** | No ha iniciado sesión | Pantalla de acceso | Clerk |
| **Sin negocio** | Sesión sin negocio o negocio incompleto | Onboarding o reanudación | `/onboarding` |
| **No es integrante** | Sesión válida, pero sin membresía activa en este negocio | Pantalla de acceso denegado del negocio (`notFound()`) | `requirePageContext` |
| **Función apagada** | El módulo no está activo | No aparece en menú ni acciones; aparece en «Funciones apagadas» de la paleta | `modulesForRoute` |
| **Rol sin permiso de página** | La función existe y está activa, pero el rol no la usa | **Criterio único (DR-10)**, ver §4 | — |
| **Acción sin permiso** | La página es visible, pero esta acción no | Control deshabilitado con motivo, o ausente si es una acción de gestión (ver §4) | `can()` |
| **Pendiente de plan** | El plan no incluye la función | Aviso con la opción de ver planes | Entitlements |

## 4. Tratamiento unificado de «sin permiso» (DR-10, DR-34)

### 4.1 Árbol de decisión (propuesta de criterio único)

1. ¿La función **no existe** para este negocio (apagada o fuera del plan)? → **No aparece**; se explica en «Funciones».
2. ¿La función existe y el rol **no la usa en absoluto** (p. ej. un Asesor y «Importar y exportar»)? → **404** (`notFound()`): para ese rol la ruta no existe. *Porqué:* no filtra información sobre qué hay en el negocio (seguridad) y evita pantallas vacías.
3. ¿El rol **puede ver, pero no actuar**? → **Página visible + acción deshabilitada con motivo** («Anular ventas solo puede hacerlo {rol}»).
4. ¿El rol llegó por un enlace a algo que sí existe pero no debe ver y hay un siguiente paso útil? → **Aviso en página** (`Alert`) con quién puede concederlo y cómo pedirlo.

*Esta es una propuesta de criterio (DR-10); su aplicación página por página exige revisión y es parte de la oleada de migración.*

### 4.2 Plantilla de texto (DR-34, PD-05)

> **No puedes {acción}.** {Rol(es) que sí pueden, derivados de la matriz} puede(n) hacerlo. {Cómo pedirlo: «Pídeselo a {rol}» o «Pide acceso en Equipo»}.

- Los roles se **derivan de la matriz de permisos** (`BUSINESS_PERMISSIONS`), no se escriben a mano.
- Ejemplo: «No puedes anular ventas. Dueño o administración puede hacerlo. Pídeselo a quien administre tu negocio.»
- Incluye icono y texto; `role="status"` (informativo) o `role="alert"` si bloquea una acción en curso.

## 5. Experiencia por rol (solo interfaz)

**Regla (DR-46, N):** misma plantilla, contenido y acciones determinados por permiso; **no hay pantallas distintas por rol**. Porqué: D2/P4 (un gesto, un patrón) y D3.

| Rol | Inicio | Menú (propuesta) | Crear | Notificaciones |
|---|---|---|---|---|
| Dueño | Resumen completo; atención y dinero | Todo | Todas | Todas |
| Administración | Operación y dinero | Todo salvo configurar plan y funciones | Todas | Todas |
| Recepción | Cobros del día y agenda | Cobros, caja, clientes, agenda, membresías | Las de su permiso | Dinero propio de caja y citas |
| Asesor | Clientes y mensajes; **sin indicadores de dinero** | Clientes, agenda, WhatsApp | Las de su permiso | Sin dinero |

*La columna «Menú» es propuesta (PD-11): hoy el menú no se filtra por rol. Requiere asociar cada ítem a un permiso en el registro (cambio de código que no se hace sin autorización).*

### 5.1 Reglas de composición
1. El Inicio **se compone por permiso**: un bloque de dinero no aparece para un rol sin `money.handle`/`business.manage` (condicionado a confirmar H-15).
2. Un bloque ausente **no deja huecos**: la rejilla se reacomoda.
3. Lo avanzado (Funciones, plan, equipo) vive en «Sistema» y se ve solo con `business.setup`/`team.manage`.
4. Las notificaciones respetan permisos (DR-40).

## 6. Transparencia y confianza (S3)

- **Quién hizo qué:** `logTenantAction` existe y hay panel de auditoría en admin. **H-05:** no se verificó que el dueño pueda ver el historial de su negocio; si no existe, queda como brecha de producto (no se diseña ahora).
- **Cambio de rol:** una acción irreversible con confirmación que nombra el efecto («Marta dejará de poder cobrar»).
- **Permisos por sección y por sede:** capacidad futura **[F]**; hoy el modelo es por rol.

## 7. Decisiones

| ID | Estado | Resumen |
|---|---|---|
| DR-10 | D | Un solo tratamiento de «sin permiso» |
| DR-34 | N | Texto derivado de la matriz |
| DR-46 | N | Misma plantilla; contenido por permiso; sin pantallas por rol |
| PD-05 | Pendiente | Redacción oficial del aviso |
| PD-11 | Pendiente | ¿El menú se filtra por rol? Requiere un permiso por ítem en el registro |

## 8. Criterios de aceptación

| Criterio | Medida |
|---|---|
| Un solo criterio de «sin permiso» | Revisión rol × pantalla de las 38 páginas |
| Texto de rol derivado de la matriz | 0 textos de rol escritos a mano |
| Inicio por permiso | Con rol Asesor: 0 indicadores de dinero (si H-15 se confirma) |
| Estados de acceso con historia de Storybook | 1 historia por estado |
| Contraste y foco en avisos | axe |

## 9. Límites
- No se ejecutó la aplicación con distintos roles: H-15 sigue sin verificar.
- Los 25 de 38 con `can()` es un conteo textual por archivo de página; el permiso puede comprobarse también en componentes o acciones.
- No se revisó la matriz del Operations Center más allá de su existencia.
