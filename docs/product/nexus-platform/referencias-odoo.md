---
title: Referencias de Odoo — ideas funcionales para Nexus
estado: vigente (regla en CLAUDE.md)
fecha: 2026-11-06
fuente: github.com/odoo/odoo, rama 17.0 (solo lectura; datos no confiables)
---

# Referencias de Odoo

Odoo es un ERP genérico de código abierto. Nexus no lo copia ni lo usa de base: **toma ideas funcionales pequeñas** y las
adapta a su sistema de diseño, a su móvil primero y a un dueño de negocio que no es contador.

**Reglas** (también en `CLAUDE.md`):

- Se copia la **idea**, nunca el código, los textos, los iconos ni el aspecto. La edición Community es LGPL-3 y la
  Enterprise es propietaria.
- Cada patrón se adopta con los componentes y tokens de Nexus; si es nuevo, se documenta en `DESIGN.md` en el mismo PR.
- Se adopta cuando una historia real lo necesita (regla de los dos usos), no por completitud.
- Lo que no se pudo verificar en el repositorio queda marcado como **no verificado**.

## 1. Patrones de interfaz

| Patrón | Qué hace Odoo (verificado) | Qué adopta Nexus | Se deja fuera | Historia |
|---|---|---|---|---|
| **Barra de estado** | CRM usa `statusbar_duration` con etapas clicables y etapas plegables (`fold_field`) en `crm_lead_views.xml`. Ganar y Perder son botones del encabezado, no la barra. Ventas muestra `draft,sent,sale` y oculta `cancel` | Estado visible y avanzable arriba de la ficha de oportunidad, pedido y obligación. Ganar y perder como acciones aparte, con motivo | Tiempo en cada etapa | `HU-leads-01`, `HU-pedidos-01` |
| **Botones inteligentes** | `res_partner_views.xml` de `sale`: botón `oe_stat_button` con `sale_order_count` que abre los pedidos del cliente con `default_partner_id`. Solo lo ve el grupo de vendedores | Contadores en la cabecera de la ficha de cliente (pedidos, cobros pendientes, conversaciones), cada uno a su lista filtrada, respetando el permiso | Botones de módulos que el negocio no usa | `HU-customer360-01` |
| **Chatter** | Los campos con `tracking=True` dejan su cambio en el hilo (`mail_thread.py`); `message_post` publica mensajes; el creador queda como seguidor | Línea de tiempo por cliente, pedido y cobro que mezcla cambios de estado, notas y mensajes de WhatsApp | Seguidores y correo. Notas internas: no verificado en el código | `HU-actividades-01` |
| **Actividades** | `mail_activity.py`: `date_deadline` obligatorio (hoy por omisión); estado calculado `overdue`, `today`, `planned`, `done`; al completar se publica un mensaje; puede encadenar la siguiente | Seguimientos con fecha, coloreados por vencido, hoy y planeado; al cerrar dejan huella en la línea de tiempo | Tipos de actividad configurables | `HU-actividades-01` |
| **Líneas editables** | Cotización con `order_line` editable abajo, botones «Agregar producto», «Agregar sección», «Agregar nota» | Cotización y pedido con filas editables y total vivo; secciones y notas por línea | Catálogo en rejilla, configuradores | `HU-cotizacion-01` |
| **Crear desde el selector** | Campos `many2one` con `no_create`, `no_quick_create`, `create_name_field`; kanban con `quick_create` | Crear cliente, producto o proveedor sin salir del cobro, la cotización o la compra | Edición completa dentro del selector | Varias |
| **Campos que cambian por estado** | El formulario bloquea campos según el estado | Pedido pagado y periodo contable cerrado quedan de solo lectura, con el motivo a la vista | Reglas editables por el usuario | Ya existe en parte |

## 2. Patrones de dinero

| Patrón | Qué hace Odoo (verificado) | Qué adopta Nexus | Historia |
|---|---|---|---|
| **Estados de una transacción** | `payment.transaction`: `draft`, `pending`, `authorized`, `done`, `cancel`, `error`. Transiciones explícitas: `_set_done` solo desde draft, pending, authorized o error; `_set_canceled` desde draft, pending o authorized | Matriz de transiciones del cobro igual de explícita (ya existe para pedidos en `integrity.ts`) y un estado «en verificación» antes de confirmar una transferencia | `HU-verificacion-01` |
| **Proveedor con estado** | `payment.provider`: `disabled`, `enabled`, `test`; `_get_compatible_providers` filtra por país, moneda y monto máximo | Pasarela conectada por negocio, en pruebas o producción (ya existe), y elegir entre varias por moneda y tope | `HU-wompi-negocio-01` (hecha) |
| **Webhook que actualiza la transacción** | `_handle_notification_data` busca la transacción, la procesa por proveedor y ejecuta un callback. El endpoint HTTP: no verificado | Ya equivalente: `ProviderEvent` deduplicado y adaptador por proveedor | — |
| **Pago aplicado a facturas** | `reconciled_invoice_ids` sale de `account_partial_reconcile` entre la línea del pago y las de la factura: un pago puede cubrir varias facturas y al revés | `PaymentAllocation` N:M (decisión D-8) | `HU-aplicacion-01` |
| **Extracto con cuenta puente** | Cada línea del extracto crea un asiento contra el banco y una cuenta de suspenso; al conciliar se reemplaza. `action_undo_reconciliation` deshace | Importar el extracto, dejar cada línea «por identificar» y proponer el cruce; poder deshacer una conciliación | `HU-conciliacion-01` |
| **Reglas de conciliación** | `account.reconcile.model`: tipos `writeoff_button`, `writeoff_suggestion`, `invoice_matching`; condiciones por diario, monto, texto y cliente; `auto_reconcile`; tolerancia de monto; ventana de 18 meses | Reglas simples (monto exacto, referencia, cliente) que proponen y una persona aprueba; la aprobación automática, después y con tolerancia | `HU-conciliacion-01` |

## 3. Patrones de operación

| Patrón | Qué hace Odoo (verificado) | Qué adopta Nexus | Historia |
|---|---|---|---|
| **Mesas y pisos** | `restaurant.floor` (nombre, color, orden; no se borra con pedidos en borrador) y `restaurant.table` (forma, posición, ancho, alto, puestos) | Plano de mesas con puestos y ocupación, pensado para tableta | `HU-mesas-01` |
| **Nota de cocina por línea** | `pos.order.line.note`: nota interna del mesero; `pos.order` guarda mesa y número de comensales | Nota por plato en la comanda | `HU-comandas-01` |
| **Dividir cuenta** | **No verificado:** no está en los modelos Python leídos; probablemente es de la interfaz en JS | Diseñarlo propio (`HU-cuentas-01`) | `HU-cuentas-01` |

## 4. Localización de Colombia

`addons/l10n_co` (versión 0.9) depende de `account`, `account_debit_note` y `l10n_latam_base`; aporta el plan de cuentas con
impuestos y los tipos de documento de identidad. **No se vio facturación electrónica de la DIAN en ese módulo**; no se revisó
si existe en otro lugar de `addons/`. Nexus ya cubre la DIAN con un puerto y un proveedor tecnológico externo, así que de
aquí solo sirve contrastar el plan de cuentas y los tipos de documento.

## 5. Lo que no se pudo verificar

- Botones inteligentes del partner en `base` y en `account`: `base/views/res_partner_views.xml` dio 404.
- Estados del modelo `account.payment` (la lectura quedó cortada).
- Cómo se elige la regla ganadora al conciliar y cómo se buscan los candidatos.
- Notas internas del chatter y la división de cuenta del punto de venta.

Antes de apoyarse en cualquiera de estos puntos, hay que leerlo en el repositorio.
