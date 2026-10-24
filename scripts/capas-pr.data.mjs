// Plan de PR sobre las capas. Cada PR cierra casillas de .docs/capas marcadas
// en su README con `_(PR-NN)_`; de ahí salen sus capas, niveles y etiquetas.
// `node scripts/capas-pr.mjs --write` regenera la sección 3 de
// .docs/hoja-de-ruta-implementacion.md.
//
//   hito   etiqueta `hito-…` del PR
//   tipo   etiquetas `tipo:…`
//   sql    borrador de esquema en .docs/sql (null = sin tablas nuevas)
//   deps   PR de los que depende
//   hecho  criterio de «hecho» (qué se prueba)
//   pr     URL del PR en GitHub cuando existe
export const HITOS = {
  1: { label: "hito-1-integrable", nombre: "Integrable" },
  2: { label: "hito-2-vende-y-controla", nombre: "Vende y controla" },
  3: { label: "hito-3-cobra-y-factura", nombre: "Cobra y factura" },
  4: { label: "hito-4-contabilidad", nombre: "Contabilidad" },
  5: { label: "hito-5-visible-y-vende", nombre: "Visible y vende en línea" },
  6: { label: "hito-6-pulso", nombre: "Pulso del negocio" },
};

export const PRS = [
  { n: 1, hito: 1, rama: "integracion/registro-de-operaciones", titulo: "Registro de operaciones", tipo: ["tipo:integracion"], sql: null, deps: [], base: "Declarar una operación una vez (módulo, permiso, esquema, riesgo, eventos) y registrar las lecturas que ya existen. No cierra casillas por sí solo: es la base técnica de X.02 (PR-02).", hecho: "Toda operación tiene permiso, módulo, esquema y riesgo (prueba); las lecturas registradas son las mismas que usan las pantallas." },
  { n: 2, hito: 1, rama: "integracion/api-v1-y-llaves", titulo: "API /api/v1 de lectura y llaves por negocio", tipo: ["tipo:integracion", "tipo:migracion"], sql: "PR-02-api-llaves.sql", deps: [1], hecho: "Una llave de prueba lee clientes y ventas de su negocio y de ningún otro (prueba con dos negocios); OpenAPI publicado; límites y errores RFC 9457." },
  { n: 3, hito: 1, rama: "integracion/outbox-y-webhooks", titulo: "Outbox y webhooks firmados", tipo: ["tipo:integracion", "tipo:migracion"], sql: "PR-03-outbox-webhooks.sql", deps: [1], hecho: "Un receptor de prueba recibe `sale.completed` firmado; si cae, reintenta y al volver recibe todo; reenvío manual." },
  { n: 4, hito: 1, rama: "integracion/mcp-de-solo-lectura", titulo: "Servidor MCP de solo lectura", tipo: ["tipo:integracion"], sql: null, deps: [2], hecho: "Un cliente MCP lista solo las herramientas que permite su llave y responde «¿cómo nos fue hoy?» con datos reales." },
  { n: 5, hito: 1, rama: "integracion/origen-y-cupos", titulo: "Origen en la bitácora y cupos de uso", tipo: ["tipo:integracion", "tipo:migracion"], sql: "PR-05-uso-y-origen.sql", deps: [2], hecho: "Cada acción por API/MCP deja quién fue; superar el cupo devuelve 429." },
  { n: 6, hito: 1, rama: "integracion/conexiones-y-puertos", titulo: "Conexiones externas y puertos", tipo: ["tipo:integracion", "tipo:migracion"], sql: "PR-06-conexiones-externas.sql", deps: [3], hecho: "Un webhook de prueba entra con firma válida, se guarda una sola vez y se procesa; con firma inválida se rechaza." },
  { n: 7, hito: 1, rama: "integracion/n8n-en-casa", titulo: "n8n en casa: túnel, nodo y plantillas", tipo: ["tipo:integracion", "tipo:docs"], sql: null, deps: [2, 3], hecho: "Un flujo real en casa reacciona a un evento y, tras apagar n8n un rato, se pone al día al volver." },
  { n: 8, hito: 2, rama: "datos/tercero-unico", titulo: "Tercero único mínimo", tipo: ["tipo:migracion"], sql: "PR-08-terceros.sql", deps: [], hecho: "Cada cliente tiene su tercero; un NIT repetido en el mismo negocio es imposible; un proveedor se crea sin ser cliente." },
  { n: 9, hito: 2, rama: "datos/catalogo-maestro", titulo: "Catálogo maestro: variantes, códigos de barras y precios", tipo: ["tipo:migracion"], sql: "PR-09-catalogo-maestro.sql", deps: [8], hecho: "Un producto con tallas y dos listas de precios se busca por código de barras." },
  { n: 10, hito: 2, rama: "datos/inventario-bodegas-y-kardex", titulo: "Inventario I: bodegas y kardex con costo", tipo: ["tipo:migracion"], sql: "PR-10-inventario-bodegas-kardex.sql", deps: [9], hecho: "Una venta descuenta con costo; el kardex cuadra con el stock; dos ventas simultáneas no dejan stock negativo." },
  { n: 11, hito: 2, rama: "datos/traslados-conteos-y-compras", titulo: "Inventario II: traslados, conteos y compras", tipo: ["tipo:migracion"], sql: "PR-11-traslados-conteos-compras.sql", deps: [8, 10], hecho: "Recibir una compra sube stock y costo; un conteo con diferencia genera su ajuste con motivo." },
  { n: 12, hito: 2, rama: "datos/importar-y-exportar", titulo: "Importar y exportar clientes y catálogo", tipo: [], sql: null, deps: [8, 9], hecho: "Un archivo de 2 000 filas se importa con reporte de errores por fila; reimportar es idempotente." },
  { n: 13, hito: 2, rama: "cobro/impuestos-y-numeracion", titulo: "Impuestos y numeración por resolución", tipo: ["tipo:migracion"], sql: "PR-13-impuestos-y-numeracion.sql", deps: [8, 9], hecho: "Una venta con IVA 19 % y 5 % y retefuente calcula bien (casos de un contador); la numeración respeta el rango y avisa." },
  { n: 14, hito: 2, rama: "cobro/cartera", titulo: "Cartera: cuentas por cobrar y por pagar", tipo: ["tipo:migracion"], sql: "PR-14-cartera.sql", deps: [13], hecho: "Un abono baja el saldo en la misma transacción; el reporte por antigüedad suma la cartera." },
  { n: 15, hito: 2, rama: "cobro/pos-terminales-y-turnos", titulo: "POS I: terminales, turnos y venta multilínea", tipo: ["tipo:migracion"], sql: "PR-15-pos-terminales-turnos.sql", deps: [10, 13], hecho: "Un cajero abre turno, vende 5 líneas con efectivo + Nequi y cierra con arqueo; todo descuenta inventario." },
  { n: 16, hito: 2, rama: "cobro/pos-impresion-y-devoluciones", titulo: "POS II: impresión, código de barras y devoluciones", tipo: [], sql: null, deps: [15], hecho: "Escanear agrega la línea; una devolución genera su nota crédito y reingresa el stock." },
  { n: 17, hito: 3, rama: "cobro/pagos-intencion-y-conciliacion", titulo: "Pagos: intención de cobro, Nequi y conciliación", tipo: ["tipo:integracion", "tipo:migracion"], sql: "PR-17-pagos-intenciones-conciliacion.sql", deps: [6, 14], hecho: "Cobrar por enlace sandbox → webhook → pago confirmado una sola vez aunque el webhook llegue repetido; la conciliación marca una diferencia sembrada." },
  { n: 18, hito: 3, rama: "cobro/facturacion-electronica-puerto", titulo: "Facturación electrónica: puerto sin proveedor", tipo: ["tipo:integracion", "tipo:migracion"], sql: "PR-18-facturacion-electronica.sql", deps: [6, 13, 17], hecho: "Toda venta genera su documento fiscal y queda PENDING_PROVIDER; el sandbox lo acepta o rechaza con causa legible; vender nunca se bloquea." },
  { n: 19, hito: 3, rama: "cobro/wompi", titulo: "Adaptador de pagos Wompi", tipo: ["tipo:integracion"], sql: null, deps: [17], hecho: "Pago de prueba de punta a punta; la conciliación contra el reporte del proveedor cuadra. (Cuando se decida.)" },
  { n: 20, hito: 3, rama: "cobro/proveedor-dian", titulo: "Proveedor tecnológico DIAN", tipo: ["tipo:integracion"], sql: null, deps: [18], hecho: "Un documento del set de pruebas queda aceptado y los pendientes históricos se envían en orden sin duplicar. (Cuando se elija.)" },
  { n: 21, hito: 4, rama: "contabilidad/plan-y-periodos", titulo: "Contabilidad I: plan de cuentas, períodos y reglas", tipo: ["tipo:migracion"], sql: "PR-21-contabilidad-plan-y-periodos.sql", deps: [8], hecho: "Un negocio nuevo trae su PUC; las reglas iniciales se pueden ver y desactivar." },
  { n: 22, hito: 4, rama: "contabilidad/asientos-y-partida-doble", titulo: "Contabilidad II: asientos automáticos y partida doble", tipo: ["tipo:migracion"], sql: "PR-22-contabilidad-asientos.sql", deps: [14, 21], hecho: "Una venta con IVA, costo y cobro genera un asiento cuadrado y trazable; anular lo reversa; cerrar el mes bloquea cambios." },
  { n: 23, hito: 4, rama: "contabilidad/estados-y-exportacion", titulo: "Estados financieros y exportación al contador", tipo: [], sql: null, deps: [22], hecho: "El balance de prueba cuadra con una muestra revisada por un contador; el archivo se importa en su software." },
  { n: 24, hito: 5, rama: "visibilidad/presencia-v2", titulo: "Presencia v2: pilares, fases y tendencia", tipo: ["tipo:integracion", "tipo:migracion"], sql: "PR-24-presencia-v2.sql", deps: [2, 3], hecho: "La barra muestra la fase A con pilares nuevos y su tendencia; `get_presence` responde por MCP; se recalcula por eventos." },
  { n: 25, hito: 5, rama: "visibilidad/mini-sitio-con-catalogo", titulo: "Mini-sitio con catálogo y SEO técnico", tipo: ["tipo:migracion"], sql: "PR-25-sitio-y-catalogo-publico.sql", deps: [9, 24], hecho: "El sitio sale en un negocio real, rápido en móvil, con datos estructurados válidos; el pilar «Sitio» pasa a verificado." },
  { n: 26, hito: 5, rama: "visibilidad/tienda-en-linea", titulo: "Tienda en línea: carrito, pedido y pago", tipo: ["tipo:migracion"], sql: "PR-26-tienda-carrito-y-envios.sql", deps: [10, 17, 25], hecho: "Un cliente compra de punta a punta (sandbox): pedido → pago → stock → documento fiscal en cola → aviso; el abandono dispara un evento." },
  { n: 27, hito: 5, rama: "visibilidad/google-business", titulo: "SEO local y Google Business", tipo: ["tipo:integracion"], sql: null, deps: [25], hecho: "La ficha se sincroniza en un negocio piloto; el pilar «Google» pasa a verificado." },
  { n: 28, hito: 5, rama: "visibilidad/reputacion-y-atribucion", titulo: "Reputación y atribución de ventas", tipo: ["tipo:migracion"], sql: "PR-28-reputacion-y-atribucion.sql", deps: [26], hecho: "El tablero dice de dónde vino cada venta; una reseña de 1–2 estrellas dispara una alerta." },
  { n: 29, hito: 6, rama: "pulso/calculadores-de-madurez", titulo: "Calculadores de madurez (fase B)", tipo: [], sql: null, deps: [14, 18, 22, 24], hecho: "Cada señal sale de datos reales y tiene prueba con casos límite; un dato malo baja su señal y dice cómo arreglarlo." },
  { n: 30, hito: 6, rama: "pulso/transicion-y-avisos", titulo: "Transición de fase y avisos", tipo: ["tipo:integracion"], sql: null, deps: [29, 7], hecho: "Un negocio que sostiene la fase A entra a la fase B; si una señal empeora llega el aviso; el reporte semanal sale solo." },
];
