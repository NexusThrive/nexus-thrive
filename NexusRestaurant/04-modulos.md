# 04 · Cómo funciona cada módulo

Fuente principal: documentación pública de soporte (**Soporte**) contrastada con
las pantallas vistas (**Observado**). Lo no leído se marca «no revisado».
Las reglas de negocio están en **negrita**: son lo reutilizable.

## Vista general: un pedido, de punta a punta

```
Canales                 Núcleo                         Resultados
─────────               ──────────────────────         ────────────────
Mostrador / Teléfono ┐
WhatsApp             ├─►  PEDIDO ──► Comandera ──►     Ventas · Corte de caja
Tienda en línea      │   (estados)   (cocina)          Inventario (kárdex)
Mesa (QR / mesero)   │                                 Finanzas (costo al vender)
Plataformas (Rappi…) ┘        ▲                        Clientes · Cupones
                              └── Repartidor (domicilio)
```

Todos los canales **convergen en un solo objeto «pedido»** con un solo flujo de
estados. Esa es la idea más valiosa para Nexus (ver 07).

## 1. Menú

**Modelo:** Menú (con horario) → Categoría → Producto → opciones de precio y
modificadores. Un producto tiene nombre, descripción, precio (o varios),
fotos, etiquetas y modificadores.

- **Cada guardado se refleja al instante** en menú público, caja y tienda; no
  hay «publicar». El comensal con el menú abierto lo ve cambiar en segundos.
- **Menús con horario** (varios por sucursal, pueden cruzar medianoche).
  Estados: *En horario ahora · Fuera de horario · Oculto*.
- **Menú maestro:** si la marca lo usa, todas las sucursales comparten un menú y
  cada una guarda **solo sus diferencias** (precio, agotado).
- **Visibilidad por canal** del producto: «En el menú digital» y «En la Tienda
  en línea» son interruptores distintos (algo solo de caja no sale en la web).
- **Agotados:** acción rápida por sucursal; en la tienda se ve «Agotado por hoy».
- **Importar con IA:** plantilla Excel, archivo o foto → lectura por IA → el
  usuario **revisa antes de guardar**. Subida masiva de fotos que se relaciona
  con platillos por nombre.
- **Modificadores:** se agrupan en «grupos de modificadores» que cuelgan del
  producto (**Observado** en la cadena «insumos → recetas → modificadores →
  productos»). Sus reglas (obligatorio, mínimos, impacto en precio y receta)
  están en `/soporte/modificadores`: **no revisado**.
- **Etiquetas:** Picante, Recomendado, Vegetariano… con visibilidad y conteo.
- **Traducciones** del menú; **Personalización** (logo, colores, esquinas,
  tipografía, formato de carta) aplicada a menú, tienda y tarjetas.

## 2. Caja (POS) — `/pos`

- La caja es un **dispositivo vinculado a una sola sucursal**. Se vincula una
  vez **sin escribir contraseñas en la tablet**: el dispositivo muestra un
  **código de 6 caracteres con QR (vence en 10 min)** y alguien con sesión de
  panel lo **aprueba** desde su celular («Aprobar dispositivo»).
- Luego cada persona entra con **nombre + PIN**. **Quien cobra nunca entra al
  panel**: la tablet no tiene sesión de panel.
- Flujo: vincular → elegir quién usa la caja → PIN → **abrir caja con fondo** →
  tomar pedidos y cobrar → **cerrar caja (corte)**.
- **Turno por sucursal:** el efectivo se abre una vez por sucursal y lo
  comparten todas sus cajas hasta el corte.
- **Todo se recalcula en el servidor:** precios, modificadores, cupones y
  disponibilidad. **El pedido guarda una copia de lo vendido y no se edita**;
  cancelar o reembolsar deja rastro.
- **Cobro:** efectivo (con cambio), tarjeta, transferencia, otro y, si hay
  terminal Mercado Pago Point, «Terminal». **Dividir con otro método** reparte
  el monto y dice cuánto falta. Propina opcional.
- **El dinero no pasa por Colega Menus:** con Terminal el monto llega a la
  cuenta del restaurante y el cobro se registra al confirmarlo Mercado Pago.
- Impresoras: tickets y comandas; terminales Point; «Cajas e impresoras» en el
  panel (`/app/devices`).

### Caja sin internet (**Soporte**: `/soporte/sin-internet`)

| Aspecto | Regla |
|---|---|
| Instalación | **PWA** instalable (Chrome «Instalar app»; iPad «Agregar a inicio»). Si no está instalada y se recarga sin red, **no abre** |
| Copia local | Menú con precios y modificadores, personal (solo nombres, **sin PIN**), mesas y cuentas abiertas, turno, ajustes. **No** guarda costos, datos de pago ni clientes |
| Condición | La caja debe haberse abierto **con internet al menos una vez** |
| Ventas sin red | **Folio temporal** (S-014) y **llave de idempotencia** por venta: si el cobro sí había llegado, al subirla **no se repite** |
| Sincronización | Sube en orden, con su **hora real**, reintenta las fallidas; entran como *Entregado* y **no reimprimen comandas viejas** |
| Reconciliación | El servidor **recalcula**: si el precio cambió, se respeta lo cobrado y el pedido queda marcado *«Precio distinto al sincronizar»* con ambas cifras; si el producto se apagó o borró, **la venta se acepta y se marca** |
| Límite | **24 horas** sin hablar con el servidor; el Diagnóstico muestra las horas restantes |
| Sí sin red | Mostrador/llevar/aquí, efectivo/tarjeta(terminal aparte)/transferencia, propina, nombre del cliente, rondas y cobro de mesa |
| No sin red | Domicilio, Mercado Pago en línea, cupones y descuentos, clientes nuevos, juntar/pasar/dividir cuentas por producto, transferir a otra sucursal, abrir/cerrar caja |

## 3. Comandera y pedidos — `/app/orders`

Estados (**Soporte**): `Esperando pago → Programado → Nuevo → En preparación →
Listo → En ruta (solo domicilio) → Entregado`, más `Cancelado` (con motivo) y
`En espera` (guardado en caja sin enviar; no llega a cocina).

| Estado | Detalle |
|---|---|
| Esperando pago | Pedido en línea con Mercado Pago sin pagar. **No llega a cocina** hasta aprobarse; **se cancela solo tras 1 hora** |
| Programado | De la Tienda para más tarde; llega solo a la comandera antes de su hora |
| Nuevo | De Tienda o mesa; **suena cada pocos segundos hasta aceptarlo**; con ≥2 min sin aceptar se marca en rojo y suena la campana del panel |
| En preparación | Los pedidos de caja **entran directo aquí**. Cada tarjeta cuenta minutos: al **80 %** del tiempo esperado, amarillo; al pasarse, rojo «Tarde · N min» |
| Listo / En ruta / Entregado | Columnas Listos y Terminados hoy |

- **Ningún pedido se cancela solo**, salvo el de pago en línea nunca pagado.
- Al **aceptar** se elige el **tiempo estimado**, que el cliente ve en su página.
- Pantalla completa y sonido para cocina; en mesas, **Listo ya es Entregado** (el
  mesero no marca nada más).

## 4. Tienda en línea — `/app/store`

- El cliente ve **solo menús activos a esa hora** y productos con «En la
  Tienda» encendido; lo no vendible online aparece gris («No disponible en
  línea»); lo agotado, «Agotado por hoy».
- Carrito **guardado en el celular**; cupón, propina (opcional), nombre,
  teléfono, **Recoger o A domicilio**, cuándo, cómo pagar.
- **Al confirmar el servidor revalida todo:** precios, modificadores, horario
  del menú y de la sucursal, pausa, pedido mínimo, zona de entrega y cupón.
  **Confirmar dos veces no duplica el pedido** (idempotencia).
- Pago en línea con **Mercado Pago**: el dinero va **directo al restaurante, sin
  comisión de Colega**.
- Herramientas del panel: enlace y QR, **pedido de prueba**, pausa de alertas,
  historial.

## 5. Mesas — `/app/tables`

- **Plano del salón** con formas (redonda, cuadrada, rectangular, booth, barra),
  áreas (Salón, Terraza, Barra, Planta alta, Jardín…), deshacer/rehacer.
  Asistente inicial: áreas → cuántas mesas por forma → quedan numeradas en filas.
- **Cada mesa tiene un QR con código propio que nunca cambia**, aunque se
  renombre: `menudigital…/<sucursal>/mesa/<código>`.
- **Una sola cuenta abierta por mesa**; todas las rondas se suman y se cobran
  juntas. Cada ronda llega a la comandera como «Mesa 4».
- Flujo: abrir mesa (comensales) → rondas desde QR o caja → comandera →
  entregado → cobrar cuenta → **la mesa queda libre y su QR deja de aceptar
  pedidos** hasta reabrirla.
- Juntar mesas, pasar y dividir cuentas por producto (con internet).

## 6. Reservaciones y lista de espera (Escala)

Estados: `Por confirmar → Confirmada → (Retrasada a los 15 min) → Sentada →
Terminada`; finales `Cancelada` y `No llegó`.

- **Reparto del lugar:** cada reserva aparta **la mesa más chica donde quepa**
  por el tiempo típico de su grupo, sin chocar con otras ni con mesas ocupadas.
- Si no cabe y está encendido «Juntar mesas»: aparta 2–3 mesas **contiguas en el
  plano** (misma área, sin barras) que dejen menos lugares vacíos.
- **Sentada** abre la cuenta de mesa; **Terminada** al cerrar la cuenta.
- Solo un porcentaje de las mesas es reservable (el resto queda para quien
  llega).

## 7. Repartidores

- **El repartidor no es usuario del panel**: sin correo; solo ve **sus**
  entregas. Un mismo repartidor se comparte entre sucursales.
- Flujo: alta → se le manda un **enlace** → crea su **PIN** → la cocina o la
  caja **asigna** (Asignar/Cambiar/Quitar) → sale → entrega y cobra.
- Estados visibles: *Lo están preparando → Listo para salir → En camino →
  Entregado / No entregado*. Al salir, **el cliente recibe «va en camino»**.
- El **efectivo cobrado por el repartidor** se cuenta aparte («El efectivo, bien
  contado»).

## 8. Plataformas de delivery (Uber Eats, Rappi, DiDi Food)

- Cada plataforma **encendida** aparece como **canal en la caja**, junto a
  Mostrador, Teléfono y WhatsApp.
- Se captura el **código del pedido** de la plataforma; **no se puede repetir el
  mismo código en la sucursal**.
- Queda **pagado con «Plataforma»**: se ve en el corte pero **no entra al
  efectivo esperado**.
- Configuración por plataforma: comisión %, cargo fijo, si cobra IVA sobre la
  comisión, sobreprecio. **Se guarda la comisión estimada de cada pedido**; las
  ventas y finanzas la usan.
- **No hay integración por API** con las plataformas: es captura manual con
  código. El dinero lo cobra la plataforma; Colega no lo toca.

## 9. Inventario (Escala)

| Concepto | Qué es | Ejemplo |
|---|---|---|
| **Insumo** | Lo que se compra y guarda; no es lo que se vende | Carne, tortilla, servilletas |
| **Receta** | De qué está hecha una porción y cuánto lleva | Taco = 90 g carne + 2 tortillas + 10 g piña |
| **Preparado** | Algo hecho con insumos, guardado, producido por lotes | Salsa verde, masa |

- **Almacén por sucursal Escala**, creado solo la primera vez.
- **Kárdex:** cada entrada/salida es un renglón con quién, cuándo y por qué; **la
  existencia es la suma de movimientos; nada se cambia a mano sin rastro.**
- Tipos de movimiento: inventario inicial · compra · compra anulada · venta ·
  venta cancelada (regresa) · merma (con motivo) · ajuste por conteo · entrada
  del CEDIS (acuse) · producción (se usó / entró).
- **Venta baja insumos** cuando el pedido **entra a cocina**; cancelar antes de
  estar listo los devuelve.
- Ciclo: compra → sube → venta (baja sola) → merma/producción → **conteo
  (ajusta a lo real)** → reporte **teórico contra real** («Donde más se pierde»).
- Compras con **proveedores y órdenes de compra**; escaneo de insumos.

### CEDIS (centro de distribución, Escala)

Remisiones a sucursales con acuse, pedidos entre sucursales, cobranza propia.
Solo sucursales Escala participan. *Detalle no revisado.*

## 10. Finanzas y ventas

- **Ventas:** resumen por día, canal, método de pago, horas pico, productos más
  vendidos, clientes nuevos vs recurrentes; pestañas Pedidos, Productos, Cortes
  de caja, Mesas. **Cuentan** pedidos cobrados sin propinas y menos reembolsos;
  **no cuentan** cancelados ni pedidos de prueba.
- **Estado de resultados:** Ventas − **costo de lo vendido** = utilidad bruta;
  − gastos = utilidad neta. **El costo es el de ese momento**: cambiarlo después
  no altera lo ya vendido.
- **Todos los montos van con IVA**, como se cobraron y como se pagaron; para
  contabilidad formal, CSV para el contador.
- Periodos: este mes, mes pasado, 30 días, este año, personalizado; por
  sucursal o **consolidado**.
- **Asesor de negocios e IA** y **Facturación CFDI 4.0** (México): no revisados.

## 11. Personal

Personas (alta única; desde su expediente se le da **PIN de caja**, **acceso al
panel** o se le hace **repartidor**), Horarios (semanas, turnos, copiar
semana, **Publicar**), Vacaciones, Asistencia (**checador en la caja**),
Capacitación, Accesos y roles. **Sin límite de personas ni costo extra.**

## 12. Clientes, cupones, fidelidad, reseñas

- **Cupones:** alta y control antiabuso («Sin abusos»), compartibles.
- **Colega Cards:** tarjetas **NFC/QR en las mesas**; el cliente califica en
  segundos, cada opinión se enruta, alertas por WhatsApp; empuja reseñas de 5
  estrellas a Google. «Solicitar reseña en Google Maps» desde Sucursales.
- **WhatsApp Business:** canal por sucursal, avisos del pedido, plantillas,
  **Agente IA** (complemento de pago) y conversaciones.
- **Tienda de artículos**, **dominio propio**, **banners**.

## 13. Administración de la cuenta

- **Cuenta → Restaurantes (marcas) → Sucursales.** Una suscripción por Cuenta
  cubre todas las sucursales activas (detalle en 05).
- **Ver como** (`/app/view-as`, «Ver el panel así»): revisar lo que ve otra
  persona según su rol (**Soporte**). No se probó, así que no se sabe si es
  solo lectura.
- **Actividad:** bitácora «Persona · Cambio · Sucursal · Fecha».
- Restaurante eliminado: **recuperable 30 días**.

## Reglas transversales que se repiten

1. **Idempotencia** en confirmación de pedido y en ventas sin conexión.
2. **El servidor recalcula**: nunca se confía en el precio del cliente.
3. **Registro inmutable** del pedido; cambios por anulación/reembolso con rastro.
4. **Existencia = suma de movimientos**; nada «a mano» sin rastro.
5. **Costo congelado** al vender.
6. **Identidades separadas** por superficie: panel (correo), caja (PIN en
   dispositivo aprobado), repartidor (enlace + PIN).
7. **El dinero del restaurante no pasa por el proveedor.**
8. **Enlaces públicos estables** (slug del menú, código de mesa).
9. **Recuperación a 30 días** al borrar restaurante o datos de ejemplo.
