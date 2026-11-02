# 03 · Fundamentos visuales: tokens, tipografía, color, densidad y movimiento

[← Índice](README.md) · Nivel 1 de la escala de patrones. Fuente única: `packages/brand/css/tokens.css` (DR-01). **Este documento no cambia ningún valor**: describe lo que hay, fija reglas de uso y lista los cambios propuestos.

## 1. Lo que existe (hechos)

| Familia | Tokens vigentes | Observación |
|---|---|---|
| Tipografía | `--font-display` (Montserrat), `--font-sans` (Inter), `--font-mono` (JetBrains Mono); las de marca (Public Stunt) viven en `packages/brand/fonts` | Tres familias de uso en la app |
| Escala de texto | `xs` 12 · `sm` 14 · `base` 16 · `lg` 18 · `xl` 20 · `2xl` 24 · `3xl` 30 · `4xl` 40 · `5xl` 52 (con interlineado) | No existen 11 ni 13 px |
| Radios | `none` 0 · `sm` 2 · `md` 4 · `lg` 6 · `xl` 8 | Casi nulos por identidad |
| Espaciado | 4·8·12·16·20·24·32·40·48·64·80 | Base de 4 px |
| Color base | Superficie, borde, tinta, acento dorado (`--accent`, `--accent-text`), éxito, peligro, aviso | Tema claro y oscuro |
| Elevación | Solo `--shadow-popover`; el resto se resuelve con bordes | Coherente con la marca |
| Capas | `--z-raised` 10 … `--z-takeover` 120 (12 niveles con nombre) | La regla prohíbe `z-index` numérico |
| Movimiento | `--d1` 120 ms · `--d2` 200 · `--d3` 320 · `--d4` 600; curvas `--ease`, `--nx-ease-out/in/in-out/spring/bounce` | Guía en `04-patrones/movimiento.md` |
| Densidad | `--control-h` 40 (compacta 34), `--row-h` 56 | Se activa con `data-density="compact"` |
| Layout | `--sidebar-width` 248, colapsada 76, `--topbar-height` 60 (72 desde 768), `--content-max` 1280, `--content-prose` 72ch | |
| Superficies flotantes | Diálogo 440/520/640/768; panel 440/560; popover 320 | |
| Breakpoints del shell | Cambios de modo en **768** y **1200 px** (CSS de `app-sidebar` y `app-topbar`) | No están tokenizados |

## 2. Reglas de uso

Cada regla lleva su porqué (`01` §1.1).

### 2.1 Tipografía

**Escala de seis pasos de interfaz** (DR-02, aprobada con condiciones):

| Paso | Tamaño | Uso | Porqué |
|---|---|---|---|
| `2xs` (nuevo) | 11 px | **Solo metadatos** (etiquetas de grupo, marcas de tiempo, contadores secundarios). Nunca texto que se debe leer para decidir | D1: el texto que decide no puede ser el más pequeño; el suelo de 11 px viene de la auditoría #140 |
| `xs` | 12 px | Texto de apoyo, ayudas de campo, pies de tabla | D1 |
| `ui` (nuevo) | 13 px | **Texto operativo por defecto de la interfaz densa**: celdas de tabla, listas, menús | D5: es el tamaño que ya domina (308 usos); darle nombre evita 12 variantes |
| `sm` | 14 px | Texto de cuerpo cómodo, descripciones | D1 |
| `base` | 16 px | Cuerpo en formularios móviles, importes de tarjeta, campos editables en móvil | DR-04, DR-06 |
| `lg` | 18 px | Subtítulos de sección | D1 |

**Escala display (títulos, cifras grandes)** se mantiene aparte: `xl` 20 → `5xl` 52. Reglas:
- Una sola página tiene **un** título de nivel 1 (`PageHeader`, ver `08`).
- Cifras financieras principales ≥ 16 px y **nunca recortadas** (DR-04); si no caben, la tarjeta cambia de estructura, no de tipografía.
- Sin tamaños con medios píxeles (12,5; 13,5; 10,5).

**Mapeo propuesto de los valores sueltos** (referencia para la migración asistida; **no automática**, DR-02):

| Valor suelto actual | Usos (toda la app) | Paso propuesto | Condición |
|---|---|---|---|
| `text-[13px]`, `[13.5px]` | 308 + 73 | `ui` | Revisar visualmente cada módulo |
| `text-[12px]`, `[12.5px]` | 34 + 64 | `xs` | idem |
| `text-[11px]` | 80 | `2xs` | Solo si es metadato |
| `text-[10px]`, `[10.5px]` | 19 + 16 | `2xs` (sube a 11) | **Revisar los 37 usos < 11 px uno a uno** (condición de la decisión 1) |
| `text-[14px]` | 24 | `sm` | Directo |
| `text-[15px]` | 70 | `base` (16) | **Validar con captura** los totales y el botón de pago (condición 1.8) |

### 2.2 Color y estados

- **Acento dorado = única voz de énfasis.** Negro/paper para estructura; dorado para lo principal y lo activo. Porqué: B4 serena, D1 claridad.
- **Rojo = peligro o error; verde = éxito/positivo; dorado atenuado = aviso.** Funcionales, no decorativos.
- **El color nunca es el único medio** (DR-27, D7): todo estado lleva **texto + icono + color**.
- **Texto dorado sobre fondo claro** usa `--accent-text` (contraste suficiente), no `--accent`.
- **Texto con opacidad:** medido que 7 de 12 usos incumplen o rozan AA (H-07, `decisiones…` §1.7); se corrigen con revisión visual antes de generalizar.
- **Documentos imprimibles** (recibos, facturas) con familia propia `--doc-*` (DR-05): el documento se ve igual en cualquier tema.

### 2.3 Forma, borde y elevación

- **Bordes en lugar de sombras.** Una sola sombra existe (`--shadow-popover`) y es funcional (separa una capa flotante).
- **Sin bordes dentro de bordes:** un contenedor y su contenido no repiten borde; se separa con espacio o con fondo `--surface-muted`.
- **Radios pequeños** (2–8 px); un componente no mezcla radios.
- Porqué: B4 serena y la regla de densidad del brief («evitar sombras decorativas y bordes dentro de bordes»).

### 2.4 Espaciado y densidad (DR-03)

- Todo espaciado sale de la escala de 4 px; ningún valor suelto.
- **Dos densidades**: estándar (control 40 px, fila 56) y compacta (control 34 px). La elección es del usuario, no del módulo.
- **Densidad por tipo de contenido (regla de diseño):**

| Tipo | Regla | Porqué |
|---|---|---|
| Cifra financiera | Legibilidad primero (≥ 16 px, sin recorte) | P5 |
| Tabla operativa | Texto `ui`, filas densas, más registros por pantalla | D5 |
| Formulario | Una columna en móvil, etiquetas visibles, espacio cómodo | D7, P7 |
| Pantalla de bienvenida o primeros pasos | Más aire, una sola acción principal | D6 |
| Táctil (`pointer: coarse`) | Controles interactivos ≥ 44 px, aunque la densidad sea compacta | DR-15 |

- **Contenedores:** una tarjeta por unidad de información; sin tarjeta dentro de tarjeta.

### 2.5 Movimiento

- Solo con los tokens `--d1`–`--d4` y las curvas nombradas.
- **Un dueño por transición** (tabla en `DESIGN.md` §4): no combinar CSS, Web Animations y librería sobre el mismo elemento.
- **Movimiento reducido respetado** (38 referencias hoy).
- **Sin movimiento decorativo continuo.** Porqué: B4 serena y D5.

### 2.6 Capas (z-index)

Se usan únicamente los 12 tokens con nombre. Los 25 usos numéricos (4 en el negocio) se reemplazan al migrar cada módulo (DR-45). Porqué: P4/D2.

## 3. Breakpoints y tamaño (en relación con DR-13, DR-14, DR-20)

| Rango | Modo del shell | Estado hoy | Estado objetivo |
|---|---|---|---|
| < 768 | Barra inferior + hoja «Más» | Existe | Se mantiene |
| 768–1023 | Riel compacto | Riel de iconos sin etiquetas | **Etiquetas abreviadas visibles** (DR-14) |
| ≥ 1024 | Lateral expandido | Desde 1200 | **Desde 1024** (DR-13) |

Los puntos 744 (iPad mini) y 820 son **viewports de prueba**, no breakpoints de código (DR-20). El valor exacto del umbral que cubre 744 queda como hipótesis (H-08) hasta probarlo.

## 4. Cambios propuestos a los tokens (lista cerrada)

| # | Cambio | Estado | Impacto |
|---|---|---|---|
| T1 | Añadir `text-2xs` (11 px) y `text-ui` (13 px) con interlineado | **A** (DR-02) | Ninguno sobre lo existente; migración gradual |
| T2 | Añadir familia `--doc-*` para documentos imprimibles | D (DR-05) | Reemplaza hex locales en `billing`, `finance`, recibos |
| T3 | Documentar (y, si hace falta, tokenizar) los breakpoints 768 / 1024 | D (DR-13) | Evita números sueltos en CSS |
| T4 | Regla automática que **congele** el conteo de tamaños fuera de token | N (parte de DR-02) | La deuda no crece; baja por módulo |
| T5 | Eliminar `z-index` numéricos | D (DR-45) | Mantenimiento |
| T6 | Sin nuevos colores, radios ni sombras | A (DR-01) | — |

## 5. Criterios de calidad y cómo medir

| Criterio | Medida | Línea base |
|---|---|---|
| Usos de tamaño fuera de token | `pnpm design:inventory` | 736 en 199 archivos |
| Colores arbitrarios | idem | 114 usos; 55 hex |
| `z-index` numérico | idem | 25 en 14 archivos |
| Importes sin recorte | `pnpm test:responsive` | 224 pruebas en #143 (reporte) |
| Contraste de texto con opacidad | Medición con capturas | 7 de 12 usos con problema (cálculo, no captura) |
| Targets táctiles | Prueba de objetivos | 8 controles en 40–42 px (#140) |

## 6. Límites

- Los valores de contraste vienen de cálculos con la fórmula WCAG sobre tokens, no de capturas renderizadas.
- Las fuentes de marca no se re-auditaron aquí; se citan de `packages/brand`.
- No se ejecutó la aplicación para comprobar cómo se ve cada token en pantalla.
