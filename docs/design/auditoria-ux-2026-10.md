# Auditoría de experiencia de usuario (24–25 de octubre de 2026)

Hallazgos reales de la revisión de navegación, Funciones y Configuración, y qué PR los resuelve. Lo no resuelto queda marcado.

## Navegación (barra lateral y encabezados)
| Hallazgo | Evidencia | Estado |
|---|---|---|
| «Clientes y operación» era un cajón de sastre de 11 pantallas (clientes, agenda, inventario, membresías, obras, cotizaciones…) | volcado de `buildTenantNav` con todos los módulos | Resuelto: 4 categorías (Clientes y agenda · Productos y pedidos · Obras y proyectos · …) |
| Ingresos / Gastos / Dinero / Finanzas se solapaban: «Gastos» y «Finanzas» eran la misma pantalla (`/finance`) en grupos distintos y «Compras» vivía en «Clientes y operación» | `MODULE_GROUP` y rutas | Resuelto: **Ventas y cobros · Compras y gastos · Finanzas y contabilidad** |
| Cada página escribía a mano su «eyebrow» («Dinero», «Visibilidad», «Clientes y operación»): POS y Facturación decían «Dinero» aunque el menú las ponía en «Ingresos» | 18 páginas | Resuelto: `routeCategory(ruta)` deriva el eyebrow de la misma categoría del menú |
| Nombres repetidos: «Catálogo» (productos) vs «Catálogo APU»; «Pedidos» vs «Pedidos de la tienda» | menú | Pendiente (se distinguen por su grupo; renombrar exige decisión de producto) |
| Visibilidad en el menú no es autorización | `modulesForRoute` + guardas por ruta | Verificado: el servidor sigue negando rutas de funciones apagadas |
| Rutas: no se eliminó ni renombró ninguna | — | Verificado |

## Funciones
| Hallazgo | Estado |
|---|---|
| Sin búsqueda ni filtros; tarjetas en cuadrícula, saturadas | Resuelto: lista compacta por categoría, búsqueda sin tildes, filtros de categoría y estado |
| Una función encendida a medias (sin proveedor, ficha o publicación) parecía operativa | Resuelto: «Falta configurar» + enlace, leído de datos reales (`setupStates`) |
| Dependencias solo informativas: se podía dejar el sistema inconsistente | Resuelto: el servidor rechaza encender sin lo que necesita y apagar lo que otra usa (`toggleProblem`) |
| Lo planeado no aparecía o aparecía como opción | Resuelto: «Próximamente», sin interruptor |
| Sugerencias en sección aparte que duplicaba funciones | Resuelto: marca «Sugerida» en su propia categoría; nada se restringe por rubro |

## Configuración
Ver el PR de Configuración (pestañas por propósito; datos personales en «Mi cuenta» con lectura y edición explícita).

## Límites de esta auditoría
Probado con Storybook (acciones simuladas), Postgres local y pruebas unitarias; no con Clerk real ni en dispositivos físicos.
