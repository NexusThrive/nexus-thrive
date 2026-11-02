# Correcciones P1 del dashboard · paso 3

Fecha: 2026-11-02 · Resuelve **P1-2** (barra superior superpuesta) y **P1-3** (importes recortados), con las pruebas de [`pruebas-responsive.md`](../../05-calidad/pruebas-responsive.md).

## Cambios en producción (4 archivos)

| Archivo | Cambio | Por qué |
|---|---|---|
| `components/organisms/app-topbar.module.css` | La celda de marca pasa de `flex: none` a `flex: 0 1 auto` bajo 768 px (en PC conserva su ancho fijo `--sw`) y su texto tiene `min-width: 0; overflow: hidden` | La marca ocupaba todo su contenido y empujaba a las acciones fuera de su sitio |
| `components/organisms/app-topbar.tsx` | El contenedor derecho usa `min-w-fit` bajo `md` (en PC sigue `min-w-0`) | Las acciones (búsqueda, notificaciones, tema, cuenta) ya no pueden quedar más angostas que sus botones: la marca cede el ancho |
| `components/molecules/kpi-trend-body.tsx` | La cifra se ajusta al **ancho de su tarjeta** con una consulta de contenedor (`@container`, `cqw`): `min(tamaño habitual, max(16 px, ancho / (caracteres × 0,6)))` | Antes dependía del ancho de la **pantalla** (`3,6vw`) y con dos columnas se cortaba |
| `components/molecules/stat-tile.tsx` | Mismo ajuste (máximo 24 px, suelo 16 px) | «Renovaciones» (`$ 2.340.000`) se cortaba a 360 y 375 px |

No hay excepciones por viewport: ambas correcciones se adaptan al espacio que tienen. No se tocan datos, formatos ni lógica financiera.

## Resultado medido

**Barra superior** (historia fiel con la campana de producción): sin superposición ni controles fuera de pantalla a 320, 360, 375, 412 y 768 px, con negocio corto («Simplapp Gym») y largo («Constructora y Servicios Integrales del Norte de Colombia S.A.S.»). Búsqueda, notificaciones y tema siguen visibles y accesibles; la marca se acorta con puntos suspensivos (a 320 px mide 118 px frente a 175).

**Importes** (factor calibrado midiendo los glifos: 0,55–0,59 em por carácter):

| Viewport | Antes (`$ 4.810.000`) | Ahora (medido) | Cifra grande `$ 129.870.000` (medido) |
|---|---|---|---|
| 320 | 20 px, **recortada** | 16 px (suelo) | 16 px, entra en la tarjeta |
| 360 | 20 px, **recortada** (Renovaciones) | 18,6 px | 16 px |
| 375 | 20 px, **recortada** (Renovaciones) | 19,8 px | 16,7 px |
| 412 | 20 px | 20 px (sin cambio) | 19,1 px |
| 768 | 27,6 px | 27,6 px (sin cambio) | 27,6 px |
| 1280 | 28 px | 28 px (sin cambio) | 25,3 px |

Las cifras cortas (`128`) no cambian. La jerarquía se mantiene: la cifra nunca baja de 16 px frente a 12,5 px de la etiqueta.

## Lo que queda abierto (no es un parche pendiente de P1)

- **A 320 px las tarjetas de dos columnas miden solo 103 px útiles**: la cifra queda en el suelo de 16 px. Mantener 20 px ahí exige una sola columna; es una decisión de maquetación del bloque de densidad del dashboard.
- Con cifras de más de 12 caracteres a 320 px el texto ocupa casi todo el ancho de la tarjeta (entra, sin cortarse).
- P2-3, P2-4, P2-5 y P2-6 siguen con sus marcas `test.fail` y sus pasos.
