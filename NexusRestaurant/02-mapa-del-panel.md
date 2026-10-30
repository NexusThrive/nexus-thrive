# 02 · Mapa del panel (`/app`)

Todo **Observado** salvo que se indique. Capturas en `capturas/escritorio/`,
`capturas/movil/` y `capturas/menus/`. Datos crudos en `datos/`.

## Estructura general

```
┌───────────────────────────── TOPBAR ─────────────────────────────┐
│ logo │ selector restaurante·sucursal │ búsqueda Ctrl K │ 🔔 🎁 🚀 avatar │
├────────────┬─────────────────────────────────────────────────────┤
│  SIDEBAR   │  banner de datos de ejemplo (si aplica)             │
│  por grupo │  pestañas de la sección                             │
│  plegable  │  contenido                                          │
│            │                                                     │
│ [Plegar]   │                                                     │
└────────────┴─────────────────────────────────────────────────────┘
```

En móvil el sidebar pasa a un diálogo «Módulos» (botón hamburguesa) y el topbar
queda en: menú, búsqueda, notificaciones, regalo, cohete y avatar
(`capturas/menus/movil_menu_hamburguesa.png`).

## Topbar — todas las opciones

| Control | Qué abre | Opciones |
|---|---|---|
| **Logo** | Va al inicio del panel (`/app/menus`) | — |
| **Selector Restaurante · Sucursal** | Menú | Restaurantes de la cuenta; **Nuevo restaurante** (`/app/branches?abrir=restaurante`); sucursales; **Nueva sucursal** (`?abrir=sucursal`); **Ajustes de la marca** (`/app/brand`); **Ver el panel como…** (`/app/view-as`) |
| **Búsqueda global** (`Ctrl K`) | Paleta de comandos | Todas las pantallas agrupadas por sección **y acciones**: *Nuevo platillo*, *Descargar el QR de la sucursal*, *Agregar un nuevo módulo*. Filtra al escribir |
| **Pedidos en línea** | Menú | Pedidos sin aceptar («No hay pedidos esperando») |
| **🔔 Notificaciones** | — | No se pudo abrir (ver límites en 00) |
| **🎁 Prueba gratis** | Menú | «Te quedan N días de prueba gratis · Hasta el 8 de noviembre», qué incluye la prueba, **Agenda una videollamada gratis**, **Activar mi plan** (`/app/billing`) |
| **🚀 Primeros pasos: N de 7** | Diálogo | La lista guiada de 7 pasos (ver [03](03-onboarding.md)) |
| **Avatar «Tu cuenta»** | Menú | **Mi perfil** (`/app/perfil`), **Refiere y gana** (`/app/refiere`), **Cerrar sesión** |

## Sidebar — todos los grupos y opciones

Los grupos se pliegan; el botón inferior **Plegar menú** deja solo iconos.
Cada grupo termina con **«+ Agregar nueva herramienta»** y el sidebar con
**«+ Agregar un nuevo módulo»**: abren un menú que lista lo que se puede
activar (ver «Catálogo activable»).

| Grupo | Opción | Ruta |
|---|---|---|
| **Operación** | Pedidos (comandera) | `/app/orders` |
| | Tienda en línea | `/app/store` |
| | Mesas | `/app/tables` |
| | Repartidores | `/app/riders` |
| | Plataformas de delivery | `/app/platforms` |
| | Cajas e impresoras | `/app/devices` |
| **Menú** | Menús (pestañas: Productos · Modificadores · Recetas · Insumos) | `/app/menus` |
| | Modificadores | `/app/modifiers` |
| | Etiquetas | `/app/tags` |
| | Personalización | `/app/appearance` |
| | Banners | `/app/banners` |
| **Clientes** | Clientes *(en la búsqueda; no estaba activado en esta cuenta)* | — |
| **Finanzas** | Ventas | `/app/sales` |
| **Inventario** | Resumen · Existencias · Compras y proveedores · Conteos y mermas · Producción · Reportes | `/app/inventory`, `/stock`, `/purchases`, `/counts`, `/production`, `/reports` |
| **Negocio** | Ajustes de la marca | `/app/brand` |
| | Sucursales | `/app/branches` |
| | Suscripción y pagos | `/app/billing` |
| | Personal | `/app/team` |
| | Actividad | `/app/activity` |
| **Ayuda** | Soporte y documentación | `/soporte` (público) |
| | Academia | `/app/academy` |
| | Feedback y sugerencias | `/app/feedback` |
| | Refiere y gana | `/app/refiere` |
| | Más herramientas | `/app/tools` |

Debajo, un anuncio fijo «Configuramos tu restaurante gratis» enlazado a una
agenda de videollamada (captación de la propia plataforma).

### Catálogo activable («Agregar…»)

| Menú | Opciones listadas (todas «Activar») |
|---|---|
| Agregar a **Menú** | Reseñas de platos · Asistente |
| Agregar un **módulo** | Tienda de artículos · CEDIS |
| «Ver todas las herramientas» | `/app/tools` (catálogo completo por grupo) |

Regla (**Soporte**): activar o apagar un módulo lo decide el Admin/Co-admin
**para todo el restaurante**; «Ocultar de mi barra» lo decide cada persona
**solo para sí**; los permisos los dan los roles. Ocultar o apagar **nunca da ni
quita permisos**, solo cambia el menú, y no borra datos.

## Pestañas internas por pantalla

| Pantalla | Pestañas |
|---|---|
| Menús | Productos · Modificadores · Recetas · Insumos |
| Pedidos | En preparación · Listos · Terminados hoy (+ botón *Programados*) |
| Mesas | Plano · Lista y QR · Ajustes · Salón |
| Ventas | Resumen · Pedidos · Productos · Cortes de caja · Mesas |
| Compras y proveedores | Compras · Proveedores · Órdenes |
| Personal | Personas (Activos · Por completar · Dados de baja) · Horarios · Vacaciones · Asistencia · Capacitación · Accesos y roles |

## Catálogo de pantallas

| Ruta | Título | Qué hay (resumen) |
|---|---|---|
| `/app/menus` | Menús | Lista de menús con horario, visible/oculto, reordenar por arrastre, *Agotados*, *Importar con IA*, *Subir fotos*, *Nuevo menú*; tarjeta «Cómo se arma tu menú» (insumos → recetas → modificadores → productos → menú) |
| `/app/menus/<id>` | Detalle de menú | Categorías y productos |
| `/app/products/<id>`, `/new` | Editar/Nuevo producto | Formulario de producto |
| `/app/menus/recipes` | Recetas | Recetas de platillos y Preparados; archivadas |
| `/app/menus/items` | Insumos | Lista, *Escanear*, filtros, *Nuevo insumo* |
| `/app/menus/import` | Importar con IA | Plantilla Excel, archivo o foto → lectura con IA |
| `/app/menus/photos` | Subir fotos | Carga masiva que se relaciona con platillos |
| `/app/menus/translations` | Traducciones | Idiomas del menú |
| `/app/modifiers` | Modificadores | Grupos de modificadores |
| `/app/tags` | Etiquetas | Tabla: Etiqueta · Productos · Visible · Acciones |
| `/app/appearance` | Personalización | Logo, colores, estilo, tipografía, formato de la carta, idiomas e IA, Colega Cards; con vista previa |
| `/app/banners` | Banners | Alta de banners |
| `/app/preview` | Vista previa | El menú como lo ve el comensal, con reseñas y asistente |
| `/app/orders` | Pedidos | Comandera en tiempo real; sonido; pantalla completa; *Punto de venta* |
| `/app/store` | Tienda en línea | Configuración, enlace, QR, historial, pedido de prueba, pausa de alertas |
| `/app/tables` | Mesas | Plano con formas (redonda, cuadrada, rectangular, booth, barra), áreas, deshacer/rehacer |
| `/app/riders` | Repartidores | Alta de repartidores |
| `/app/platforms` | Plataformas de delivery | Uber Eats, Rappi, DiDi Food: activar, comisión, tarifa, IVA, sobreprecio |
| `/app/devices`, `/new` | Cajas e impresoras | Dispositivos y vinculación (*Aprobar dispositivo*) |
| `/app/sales` | Ventas | Por día, canal, método de pago, horas pico, productos, cortes de caja |
| `/app/inventory/*` | Inventario | Resumen, existencias, compras, conteos y mermas, producción, reportes |
| `/app/brand` | Ajustes de la marca | Identidad, Menú, Caja, Clientes, Escala, Personal; *Eliminar restaurante* |
| `/app/branches` | Sucursales | Restaurantes y sucursales; editar, enlace, QR, reseña en Google Maps, pausar |
| `/app/billing` | Suscripción y pagos | Plan por sucursal, activar plan/tienda/agente, subir a Escala |
| `/app/team/*` | Personal | Personas, horarios, vacaciones, asistencia, capacitación, accesos |
| `/app/activity` | Actividad | Bitácora: Persona · Cambio · Sucursal · Fecha |
| `/app/view-as` | Ver como | Ver el panel con los permisos de otra persona |
| `/app/domains` | Dominios | Conectar dominio propio |
| `/app/coupons` | Cupones | Alta de cupones |
| `/app/whatsapp` | WhatsApp | Canal por sucursal, número, agente IA |
| `/app/colega-cards` | Colega Cards | Tarjetas NFC/QR, reseñas |
| `/app/academy` | Academia | Lecciones «Conoce …» con marcado «Visto» |
| `/app/feedback` | Feedback | Envío con captura; historial «Mis envíos» |
| `/app/refiere` | Refiere y gana | Enlace y código propios; recomendados |
| `/app/tools` | Herramientas | Catálogo de módulos: activar/apagar/ocultar |
| `/app/perfil` | Mi perfil | Foto, datos, contraseña *(sin captura: datos personales)* |
| `/app/setup` | ¿Qué tipo de negocio tienes? | Asistente de 4 pasos (ver [03](03-onboarding.md)) |

## Patrones de interfaz que se repiten

Útiles como criterio para Nexus (que ya tiene su sistema de diseño):

1. **Banner de datos de ejemplo** con dos salidas: *Importar con IA* o *Borrar
   datos de ejemplo*. Es onboarding por contenido, no por tour.
2. **Tarjeta «Conoce X»** al pie de cada módulo, enlazada a la Academia y al
   soporte; botón **¿Cómo funciona?** junto al título.
3. **Pantalla de venta del módulo** (p. ej. Repartidores, Personal, Cupones):
   si el módulo no tiene datos, muestra «Lo que puedes lograr» antes del alta.
4. **Cadena visible del dominio**: «0 insumos → 0 recetas → 0 grupos de
   modificadores → 10 productos → Tu menú». Enseña el modelo mientras se usa.
5. **Reordenar por arrastre con alternativa** (flechas subir/bajar y menú
   «Más acciones»).
6. **Módulo bajo plan** (Escala): etiqueta en la ayuda, no desaparece.
