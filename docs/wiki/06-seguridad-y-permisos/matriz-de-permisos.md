# Matriz de permisos

Tabla de quién puede qué dentro de un negocio. **Se generó a partir de `BUSINESS_PERMISSIONS`** en `lib/core/auth/permissions.ts`, que es la fuente única; si la matriz cambia, esta página debe regenerarse (`tests/architecture/wiki.test.ts` falla si algún permiso falta aquí o si cambia algún rol).

Cómo se usa en código: [autenticación, permisos y aislamiento](autenticacion-permisos-y-aislamiento.md).

| Permiso | Para qué | SUPERADMIN | OWNER | ADMIN | STAFF | RECEPTION | ADVISOR |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `business.manage` | Anular, editar montos, inventario, catálogo y reportes. | ✓ | ✓ | ✓ |  |  |  |
| `team.manage` | Invitar y retirar personas, plan y facturación de NEXUS. | ✓ | ✓ | ✓ |  |  |  |
| `business.setup` | Configurar el negocio en el onboarding: plan, módulos y enlace. | ✓ | ✓ |  |  |  |  |
| `money.handle` | Cobrar (incluye vender y renovar membresías), gastos y turnos de caja. | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| `orders.work` | Mover pedidos y producción (confirmar, fabricar, enviar, entregar). No incluye dinero: quien produce no ve cobros ni finanzas. | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `data.exchange` | Importar y exportar clientes y catálogo (los datos del negocio entran y salen en masa). | ✓ | ✓ | ✓ |  |  |  |
| `customers.delete` | Borrar o archivar clientes. | ✓ | ✓ | ✓ |  |  |  |
| `budget.govern` | Bloquear/desbloquear, AIU y aprobar la línea base. | ✓ | ✓ | ✓ |  |  |  |
| `budget.edit` | Capítulos, partidas y verificación de totales. | ✓ | ✓ | ✓ | ✓ |  |  |
| `apu.edit` |  | ✓ | ✓ | ✓ | ✓ |  |  |
| `apu.destroy` | Archivar y borrar del catálogo (destructivo). | ✓ | ✓ | ✓ |  |  |  |
| `projects.create` |  | ✓ | ✓ |  |  |  |  |
| `projects.changeStatus` |  | ✓ | ✓ | ✓ |  |  |  |
| `projects.editContent` | Nombre y descripción. Recepción no edita obras. | ✓ | ✓ | ✓ | ✓ |  | ✓ |
| `projects.editHeader` |  | ✓ | ✓ | ✓ | ✓ |  |  |
| `fieldLog.create` |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `fieldLog.delete` |  | ✓ | ✓ |  |  |  |  |
| `lean.plan` |  | ✓ | ✓ | ✓ | ✓ |  |  |

Notas:

- `SUPERADMIN` es el equipo de Nexus; `STAFF` es personal del negocio con acceso operativo a construcción.
- Un rol desconocido no tiene ningún permiso (`can()` devuelve `false`).
- La tabla histórica [tabla-permisos-catalogo](../../construction/tabla-permisos-catalogo.md) **no es válida**: no incluye a `ADMIN` en `apu.edit` ni en `apu.destroy`.
