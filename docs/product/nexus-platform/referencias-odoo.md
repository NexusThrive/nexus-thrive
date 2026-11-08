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
| **Búsqueda con filtros, agrupar y favoritos** | El buscador de la lista de Contactos reúne tres bloques: filtros que se combinan (los de un grupo con «o», los de grupos distintos con «y»), «agrupar por» con grupos personalizados y favoritos (búsquedas guardadas, con una por defecto). *(Visto en la interfaz de Odoo por la persona del equipo; no se leyó el código.)* | Panel bajo el buscador con «Buscar en», Filtros con conteo, Agrupar por anidado (chip «Ciudad > Origen» con icono), filtro personalizado por reglas, grupos propios que se asignan a los clientes y favoritos por usuario y sección; todo en la URL | Compartir favoritos con el equipo, ordenar los grupos a mano, filtros por dominios avanzados (código) | Clientes (`/contactos`); mismo componente para el resto de listas |
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

## 3b. CRM (pipeline de oportunidades)

Leído en `addons/crm` y `addons/sale_crm` (rama `master`, noviembre de 2026). `crm_lead.py` y `crm_lead_views.xml` se leyeron
truncados: lo marcado con *(resumen)* no se vio literal.

| Patrón | Qué hace Odoo (verificado) | Qué adopta Nexus | Qué se deja fuera |
|---|---|---|---|
| **Contacto ligado, sin duplicar datos** | `crm.lead.partner_id`; `email_from` y `phone` son `compute` desde el partner con `inverse` (`_inverse_email_from`, `_inverse_phone`) que escribe de vuelta en el partner | La oportunidad apunta al cliente y lee su correo y teléfono; editarlos en el CRM (creación rápida o detalle) actualiza el cliente | Dirección, cargo, idioma y sitio web en la oportunidad |
| **Crear el cliente sin duplicarlo** | *(resumen)* `_find_matching_partner` busca por correo antes de `_create_customer` | «Crear … como cliente nuevo» pasa por `findOrCreateContact` (teléfono canónico y correo) | El botón «Leads similares» |
| **Creación rápida en el tablero** | `quick_create_opportunity_form`: contacto, nombre, correo, teléfono, ingreso esperado, prioridad | Los mismos campos más la próxima actividad; solo el nombre es obligatorio | Ingresos recurrentes |
| **Barra de la columna** | `<progressbar field="activity_state" colors='{"planned": "success", "today": "warning", "overdue": "danger"}' sum_field="expected_revenue">` | Barra de 3 px planeada, para hoy, vencida y sin actividad, con el total en dinero | Filtrar al tocar un segmento |
| **Etapa ganada y plegadas** | `crm.stage.is_won`, `fold`; ganar fija probabilidad 100 | Etapa con `isWon` (Ganado, al final) y Perdidos plegada | Requisitos por etapa, equipos por etapa |
| **Ganar, perder y reabrir** | `action_set_won` (etapa ganada, 100 %); `action_set_lost` archiva con `lost_reason_id` y 0 %; `action_restore` | Ganar crea el pedido; perder pide un motivo configurable (y texto libre) y deja 0 %; reabrir vuelve a la etapa con su probabilidad | El arcoíris de celebración |
| **Probabilidad por etapa** | Probabilidad automática (PLS) que solo cambia si no se editó a mano | Al cambiar de etapa toma la probabilidad por defecto de la etapa; se edita después | El modelo predictivo (PLS) |
| **Pedido desde la oportunidad** | `sale_crm`: `sale.order.opportunity_id`, `action_new_quotation` con el partner por defecto | Ganar crea el pedido con el cliente y el valor (`StoreOrder.origin` enlaza la oportunidad) y abre el cobro; «Nueva cotización» con el cliente elegido | Subir el valor esperado desde el pedido |
| **Oportunidades del contacto** | `res.partner.opportunity_count` y `action_view_opportunity` | Botón «Oportunidades» en la Ficha del cliente que abre el pipeline filtrado | Contar los contactos hijos |

Historia: app CRM (pantallas 8 y 9 del canvas). Nada de código, textos, iconos ni estilos de Odoo.

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
