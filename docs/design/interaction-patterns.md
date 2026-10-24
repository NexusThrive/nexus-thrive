# Patrones de interacción

[← DESIGN.md](../../DESIGN.md)

El mismo tipo de operación se comporta igual en toda la app. Antes de crear
una pantalla, un formulario o una acción, se elige el patrón con esta guía.

## Decisión rápida

```
¿Es una confirmación (anular, eliminar, desactivar)?      → ConfirmDialog
¿Es 1–2 campos junto al control que lo abre?              → Popover (ventana flotante)
¿Es un cambio mínimo y reversible en su sitio?            → En línea
¿Hay que ver la página de atrás mientras se trabaja,
 o es la ficha/detalle de un registro, o tiene secciones?  → FormDrawer / ResponsiveSheet drawer
¿Es crear o editar hasta ~6 campos sin contexto extra?    → FormDialog
¿Tiene pasos, es largo, necesita enlace propio o es un
 editor a pantalla completa?                              → Página
```

## Matriz

| | Diálogo (`FormDialog`, `ResponsiveSheet`) | Panel lateral (`FormDrawer`, `drawer`) | Ventana flotante (`Popover`) | Página | En línea |
|---|---|---|---|---|---|
| **Usar para** | Crear rápido, editar pocos campos, confirmar, detalle breve | Registro con varios campos o secciones, ficha de cliente/producto, configurar un módulo, ver actividad sin perder la lista | Acciones rápidas, 1–2 campos, elegir pocas opciones, ayuda "?" | Onboarding, flujos de varios pasos, editores (presupuesto APU), configuración amplia, lo que necesita URL | Renombrar, marcar, expandir una sección |
| **No usar para** | Formularios largos, navegación, diálogos dentro de diálogos | Confirmaciones, un solo campo | Formularios largos, contenido esencial en móvil, navegación | Crear algo de 3 campos | Formularios con validación de servidor o varias decisiones |
| **PC (≥ 768 px)** | Modal centrado: `sm` 440 (confirmar) · `md` 520 · `lg` 640 · `xl` 768 (tablas) | Derecha, alto completo: 440 · `lg` 560 | Junto al control, cambia de lado si no cabe | Ruta propia con `PageHeader` | En su lugar |
| **Móvil** | Hoja inferior (hasta 88 % del alto), se cierra arrastrando | Hoja casi a pantalla completa | Igual, dentro de la ventana; si no cabe, usar diálogo | Igual, una columna | Igual |
| **Teclado** | Tab/Shift+Tab atrapados; Escape cierra si no está guardando; Enter envía | Igual que diálogo (es modal) | Escape cierra; Tab sale | Normal | Enter guarda, Escape cancela |
| **Foco** | Al abrir: primer campo (o `data-autofocus`); en móvil, el panel. Al cerrar: vuelve al botón que lo abrió | Igual | Ayuda sin enlaces: se queda en el botón. Con controles: entra al contenido. Al cerrar: al disparador | Al título o primer campo según el caso | Se queda en el control |
| **Scroll** | Cuerpo con scroll propio; título y pie fijos; el fondo no se mueve | Igual | Sin scroll (si lo necesita, no es popover) | De la página | — |
| **Movimiento** | Entra 360 ms, sale 200 ms; hoja móvil con rebote corto | Desliza desde la derecha 360/200 ms | 160 ms, aparece con escala 95 % | Entrada de vista 360 ms | Color/altura 200 ms |
| **Carga** | Botón con "Guardando…" (N en bucle); `busy` impide cerrar | Igual | Botón con estado de carga | `loading.tsx` con `PageSkeleton` | Indicador en el control |
| **Error** | `Alert` arriba + error en el campo + foco al primer inválido; no borra lo escrito | Igual | Error bajo el campo | `Alert` en la sección | Toast de error y valor anterior |
| **Éxito** | Cierra + toast | Cierra + toast (o queda abierto si es una ficha que se sigue usando) | Cierra + toast | Toast y redirección si corresponde | Toast breve o confirmación visual |

## Reglas que no cambian

1. **Un patrón por tipo de operación.** "Nuevo cliente", "Nuevo producto",
   "Nueva cita" abren todos un diálogo o todos un panel según su tamaño, no
   según quién los programó.
2. **Sin diálogos dentro de diálogos**, con una sola excepción: confirmar
   una acción destructiva desde un panel abierto (anular una venta desde su
   ficha) abre un `ConfirmDialog` encima. Escape cierra solo la confirmación
   y el foco vuelve al botón del panel (probado en `e2e/overlays.spec.ts`).
3. **Sin `window.confirm` ni `alert`.** Usar `ConfirmDialog` / `useConfirm()`.
4. **Un modal bloquea el fondo.** Todos los diálogos y paneles de NEXUS son
   modales (Radix Dialog). Un panel no modal tendría otro contrato
   (`role="complementary"`, sin foco atrapado) y hoy no existe.
5. **Cerrar nunca pierde un guardado a medias**: mientras guarda, `busy`.
6. **Lo que abre un formulario dice qué hace**: "Nuevo cliente", "Editar",
   "Anular venta". El título del panel repite esa intención.
7. **El pie es siempre "Cancelar" a la izquierda y la acción a la derecha**
   (en móvil ocupan el ancho). La acción destructiva va en rojo y nunca es la
   que recibe el foco.
8. **Abrir desde la URL** (`?nuevo=1`) se permite para los atajos de "Crear"
   del celular; al cerrar se limpia el parámetro.

## Ejemplos en NEXUS

| Operación | Patrón | Dónde |
|---|---|---|
| Nuevo cliente / editar cliente (varias secciones) | Panel lateral | `crm/_components/customer-sheet.tsx` |
| Ficha de producto | Panel lateral | `inventory/_components/product-detail.tsx` |
| Detalle de una cita | Panel lateral | `bookings/_agenda/booking-detail.tsx` |
| Renovar membresía | Diálogo | `memberships/_components/membership-modal.tsx` |
| Cobrar / registrar gasto | Diálogo | `components/organisms/payment-sheet.tsx`, `expense-sheet.tsx` |
| Eliminar clientes archivados | Confirmación | `crm/_components/customer-table.tsx` |
| Eliminar el negocio | Confirmación escribiendo "eliminar" | `components/organisms/delete-business-dialog.tsx` |
| Anular una venta desde su ficha | Panel + confirmación encima | `tickets/_components/ticket-desk.tsx` |
| Ficha de un negocio (panel CEO) | Panel lateral `lg` | `app/admin/_components/tenant-drawer.tsx` |
| Suspender un negocio | `FormDialog` destructivo | `app/admin/_components/suspend-dialog.tsx` |
| Ayuda de un campo | Ayuda "?" | `components/molecules/context-help.tsx` |
| Presupuesto APU | Página | `projects/[projectId]` |
| Onboarding | Página | `app/[tenant]/onboarding` |
| Activar un módulo | En línea (interruptor) | `settings/_components/modules-tab.tsx` |

La lista de cada formulario existente y su patrón está en
[auditoria-2026-10.md §4](auditoria-2026-10.md#4-formularios).

## Modales: pequeño y avanzado

Hay dos tipos y no se mezclan:

- **Pequeño** (`ResponsiveSheet` / `FormDialog`, `size` sm–lg): una acción puntual con uno o dos campos (cobrar, anular, emitir una nota, nueva terminal). Se abre **encima** de lo que se está viendo y no lo reemplaza.
- **Avanzado** (`ResponsiveSheet size="full"`, p. ej. `DocumentViewer`): pantalla completa para ver o trabajar un documento entero. **Facturas, cuentas de cobro, recibos y notas crédito y débito se ven así**, con su estilo de factura (emisor, adquirente, líneas, impuestos, retenciones, saldo, documentos relacionados) e impresión limpia. Las acciones rápidas del documento (modales pequeños) se abren sobre él.
