# 05 · Roles, permisos y planes

Fuente: `/soporte/equipo-y-roles`, `/soporte/plan-y-pagos`,
`/soporte/herramientas` (**Soporte**), contrastado con lo visto en
`/app/team`, `/app/billing` y `/app/tools` (**Observado**).

## Jerarquía de datos

```
Cuenta (suscripción única, Stripe)
 └── Restaurante (marca: menú maestro, apariencia, etiquetas)
      └── Sucursal (menú propio o diferencias, caja, mesas, inventario, plan)
```

- Una suscripción por **Cuenta** cubre **todas** las sucursales activas.
- **Cada sucursal elige su plan** (Complete o Escala).
- Persona ↔ rol ↔ ámbito (cuenta, restaurante o sucursales concretas).

## Dos tipos de acceso

| Acceso | Para quién | Cómo entra | Qué ve |
|---|---|---|---|
| **Panel** | Dueño, socios, franquiciatarios, gerentes, roles personalizados | Correo + contraseña (2FA no ofrecido aún a restaurantes) | Según rol |
| **Caja** | Cajeros, meseros, cocina | **Nombre + PIN** en un dispositivo aprobado | Solo la caja; **nunca** el panel |
| **Repartidor** | Repartidores | Enlace + PIN propio | Solo sus entregas |

## Roles del panel

| Rol | Alcance | Notas |
|---|---|---|
| **Admin** | Toda la Cuenta: restaurantes, cobro, equipo, marca | Quien creó la Cuenta |
| **Co-admin** | Igual que Admin | **No** puede quitar a otros Co-admin ni pasar el rol de Admin |
| **Franquiciatario** | Todo de **sus** sucursales, incl. Finanzas y su Mercado Pago y sus Gerentes | No ve otras sucursales ni cambia lo común a todo el restaurante, el cobro ni WhatsApp |
| **Gerente** | La operación de sus sucursales: pedidos, caja, mesas, menú, tarjetas, Colaboradores y Personal **sin sueldos** | No ve costos, estado de resultados, historial, Asesor ni ajustes |
| **Rol personalizado** | Solo las secciones elegidas, en **Ver** o **Ver y editar** | Ej.: contador, marketing, compras |
| **Responsable de CEDIS** | Todo su CEDIS | Ve insumos y recetas |
| **Cobranza del CEDIS** | Estado de cuenta, pagos y facturas del CEDIS | Operación solo la ve |

## Matriz (Admin/Co-admin · Franquiciatario · Gerente)

| Sección | Admin y Co-admin | Franquiciatario | Gerente |
|---|---|---|---|
| Menús, modificadores, agotados | Editar | Editar | Editar |
| Apariencia, etiquetas, banners, idiomas | Editar | Ver | Ver |
| Datos de la sucursal | Editar | Editar | Ver |
| Pedidos, mesas, repartidores, tarjetas | Editar | Editar | Editar |
| Tienda en línea | Editar | Editar | Ver |
| Ventas | Editar | Editar | Ver |
| Gastos | Editar | Editar | Editar |
| Costos, estado de resultados, historial | Editar | Editar | **No** |
| Asesor de negocios | Editar | Editar | **No** |
| Clientes y cupones | Editar | Editar | Ver |
| Cajas y Colaboradores | Editar | Editar | Editar |
| Accesos y roles del panel | Editar | Editar (solo Gerentes de sus sucursales) | **No** |
| Personal | Editar | Editar | Editar (**sin sueldos**) |
| Mercado Pago | Editar | Editar | **No** |
| Actividad | Ver | Ver (sus sucursales) | **No** |
| WhatsApp | Editar | **No** | **No** |

Detalle clave: **permiso por sección con dos niveles (Ver / Editar) y ámbito por
sucursal**, más campos sensibles ocultos aun dentro de una sección editable
(«Personal **sin sueldos**»).

## Módulos activables vs permisos

| Concepto | Decide | Efecto |
|---|---|---|
| Activar/apagar módulo | Admin o Co-admin, para todo el restaurante | Aparece/sale del menú de todos |
| Ocultar de mi barra | Cada persona | Solo su menú |
| Permisos | Los roles | Qué se ve y se cambia |

**Ocultar o apagar nunca da ni quita permisos.** Y no borra datos.

## Invitaciones y equipo

- «Agregar persona» → elegir accesos (caja, panel, repartidor) → la persona
  recibe PIN o invitación → entra.
- Invitación por correo: **7 días**; reenviable. **Sin límite de personas ni
  costo extra por sucursal.**
- **Ver como** y **Actividad** (bitácora) cierran el ciclo de gobierno.

## Planes y precios (México, IVA incluido, 2026-10-30)

| Concepto | Precio |
|---|---|
| **Complete** | $499 / mes por sucursal activa |
| **Escala** | $799 / mes por sucursal ($499 + $300) |
| Tienda de artículos (complemento) | $299 / mes por sucursal |
| Agente IA de WhatsApp (complemento) | $899 / mes por sucursal (IA con uso justo; $100 de cortesía en prueba) |
| Prueba gratis | 14 días con **todo** (también Escala), sin tarjeta; **30 días** si hay código de recomendación |
| No se cobra | Sucursales pausadas o archivadas; los pedidos de los clientes (**sin comisión**) |

| Incluye | Complete | Escala |
|---|:-:|:-:|
| Menú digital, reseñas, Colega Cards | ✔ | ✔ |
| Tienda en línea, pagos Mercado Pago | ✔ | ✔ |
| POS, comandera, mesas, repartidores | ✔ | ✔ |
| Clientes, cupones, fidelidad, opiniones | ✔ | ✔ |
| Informe de ventas, finanzas, personal, facturación, IA | ✔ | ✔ |
| Reservaciones y lista de espera | | ✔ |
| Inventarios y recetas | | ✔ |
| CEDIS, tienda de la franquicia, pedidos entre sucursales | | ✔ |
| Dominio propio | | ✔ |

Solo las sucursales **Escala** participan en lo que **conecta sucursales**
(tienda de la franquicia, CEDIS, pedidos entre sucursales).

### Estados de la suscripción

| Estado | Menú público |
|---|---|
| Cortesía (prueba) | Visible |
| Pendiente de pago | No público aún |
| Activa | Visible |
| Pago atrasado | Visible **7 días** para actualizar la tarjeta |
| Pausada (falta de pago o decisión del proveedor) | Desactivado |
| Cancelada (terminó el periodo pagado) | Desactivado |

**Pausada o cancelada, la información sigue guardada** y se puede seguir
editando el menú; al reactivar, todo vuelve.

## Qué se lleva Nexus de aquí

1. Permiso por **sección × nivel (Ver/Editar) × sucursal**, con campos sensibles
   aparte (sueldos, costos). Nexus ya tiene `can()`: aquí está la matriz de
   referencia para el rubro.
2. **Separar identidades** por superficie (panel, caja, repartidor) en vez de
   dar a todos un usuario de panel.
3. **Módulos activables por persona y por restaurante** sin tocar permisos.
4. **Precio por sucursal** y estados de cobro con **degradación suave** (7 días
   de gracia, datos intactos). Nexus declara «nada se vende por separado»
   (`.docs/distribucion-por-rubro.md`): esto es **contraste**, no modelo a
   copiar.
