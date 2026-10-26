# Brand Book — NEXUS Thrive

- **Estado:** canónico. Se actualiza junto con `DESIGN.md` y los tokens, no en paralelo.
- **Fuente de valores:** `packages/brand/tokens/tokens.json` y
  `packages/brand/css/tokens.css`.
- **Alcance:** sitio público, app del negocio, panel CEO, centro de ayuda,
  presentaciones, propuestas y piezas de marketing.

Si este documento y el código discrepan, **manda el código** y se corrige el
documento en el mismo cambio.

---

## 1. Qué es NEXUS

> **Simplifica tu vida financiera y empresarial en un solo sitio.**

NEXUS es el sistema operativo del negocio para pymes en Colombia: vende, cobra,
controla caja e inventario, atiende clientes y se hace visible, con la forma del
rubro (gimnasio, museo, constructora, comercio, servicios).

**Promesa:** una pyme deja de saltar entre cuaderno, WhatsApp, caja, software
contable y nada para Google; opera el día en un solo lugar.

**Lo que NO somos:** no somos un ERP contable, no reemplazamos al contador y no
prometemos facturación electrónica DIAN mientras no esté implementada
(ver `docs/nexus-architecture/product-vision.md`, mapa de capacidades).

## 2. Posicionamiento

| Elemento | Definición |
|---|---|
| Categoría | Sistema operativo del negocio para pymes colombianas |
| Diferenciador 1 | Se adapta al rubro: mismos motores, términos y pantallas propias |
| Diferenciador 2 | La operación diaria primero; la contabilidad sale de lo ya registrado |
| Diferenciador 3 | Colombia de fábrica: pesos, NIT, DIAN, WhatsApp, pagos locales |
| Público primario | Dueña o dueño de pyme que vive en el celular y no es contador |
| Público secundario | Cajero/staff, administrador y equipo NEXUS |
| Alternativa real | ERP grandes, software contable, cuaderno + WhatsApp + Excel |

**Mensaje de una línea:** *El sistema operativo de tu negocio, hecho para
Colombia.*

**Mensaje de apoyo:** *Vende, cobra, controla y atiende en un solo lugar; con la
forma de tu negocio.*

## 3. Atributos de marca

1. **Directa.** Dice qué hace y cuánto cuesta, sin adjetivos vacíos.
2. **Operativa.** Habla de la operación del día, no de promesas abstractas.
3. **Local.** Colombia real: pesos, NIT, WhatsApp, mostrador.
4. **Serena.** No grita, no usa urgencia falsa, no promete milagros.
5. **Honesta.** Lo que no está listo no aparece; lo que falta se dice.

## 4. Identidad visual

### 4.1 Logotipo

- **Completo:** `packages/brand/src/BrandLogo.tsx` — N + THRIVE.
- **Símbolo:** `components/atoms/n-mark.tsx` — la N sola; también indicador de
  carga.
- **Wordmark:** Montserrat 700, mayúsculas, tracking amplio (`.nx-wordmark`).
  Es el **único** lugar con mayúsculas sostenidas.
- **Área de resguardo:** mínimo el ancho de la N alrededor de la marca.
- **Tamaño mínimo:** el que mantenga legible «THRIVE»; en piezas impresas,
  comprobar a tamaño real antes de aprobar.
- **Fondos:** tinta sobre papel o blanco; blanco sobre tinta. No se inventan
  versiones en oro, degradados ni contornos.
- **Prohibido:** deformar, rotar, añadir sombra, cambiar el orden N/THRIVE,
  encerrar en formas, recolorear fuera de tinta/blanco.

### 4.2 Color

El color sale del logo: bloque negro, esquinas rectas, acento oro.

| Rol | Token | HEX | Uso |
|---|---|---|---|
| Tinta | `color.ink` | `#000000` | Marca, texto principal, botón primario en claro |
| Papel | `color.paper` | `#F7F6F3` | Fondo claro |
| Blanco | `color.white` | `#FFFFFF` | Superficies |
| Grafito 950 | `color.graphite.950` | `#0A0A0B` | Fondo oscuro |
| Grafito 900 | `color.graphite.900` | `#141416` | Superficie oscura |
| Grafito 700 | `color.graphite.700` | `#2A2A2E` | Bordes oscuros |
| Grafito 500 | `color.graphite.500` | `#6B6B73` | Texto secundario |
| Grafito 200 | `color.graphite.200` | `#E8E6E1` | Bordes claros |
| Oro 500 | `color.gold.500` | `#D4AF37` | Acento, foco, dato que importa |
| Oro 600 | `color.gold.600` | `#B8921F` | Acento sobre claro cuando hace falta contraste |
| Oro 700 | `color.gold.700` | `#7F6210` | Texto dorado legible sobre papel |
| Éxito | `color.status.success` | `#2E7D5B` | Solo estados |
| Peligro | `color.status.danger` | `#B3261E` | Solo estados |

Regla de proporción: **60 % tinta/neutros oscuros, 30 % papel, 10 % oro**. El
oro marca **una** cosa por pantalla.

Prohibido: paletas nuevas, degradados de marca, oro como fondo de bloques
grandes, colores de estado usados como decoración.

### 4.3 Tipografía

| Familia | Uso | Pesos | Token |
|---|---|---|---|
| Montserrat | Títulos, cifras grandes, marca | 500 · 600 · 700 | `--font-display` |
| Inter | Interfaz, formularios, tablas | variable | `--font-sans` |
| JetBrains Mono | Códigos, referencias, IDs | 400 · 500 | `--font-mono` |
| Public Stunt | Portadas y piezas de marca, **no UI** | 400 · itálica | `--font-stunt` |

⚠️ **Licencia:** Public Stunt es de **uso personal**
(`packages/brand/fonts/public_stunt/READ_BEFORE_ANY_USE.txt`). No se usa en
piezas públicas, anuncios ni producto hasta resolver su licencia. Mientras
tanto, la marca se compone con Montserrat.

### 4.4 Forma, espacio y elevación

- **Radios casi nulos:** 2 / 4 / 6 / 8 px. Nada de píldoras salvo avatares e
  indicadores circulares.
- **Bordes en lugar de sombras.** Solo flotan diálogos, paneles, menús y
  notificaciones.
- **Un solo motivo gráfico:** corte diagonal a −24° de la N (`--nx-angle`) en
  cargas, progreso y destellos. Nunca como decoración repetida.
- **Espacio:** base 4 px (`--space-1`…`--space-20`).
- **Iconografía:** lineal, trazo consistente, sin relleno decorativo; el icono
  acompaña al texto, no lo sustituye en acciones destructivas.

### 4.5 Movimiento

- Duraciones de token: 120 / 200 / 320 / 600 ms; entradas 360 ms, salidas 200 ms.
- El movimiento explica un cambio de estado, no entretiene.
- Respetar `prefers-reduced-motion`: sin desplazamientos largos ni bucles.

## 5. Voz y tono

Resumen operativo; el detalle está en
[`guia-de-tono.md`](guia-de-tono.md).

- **Tú, no usted.** Español de Colombia, claro y corto.
- Verbos concretos: «Cobrar», «Anular venta», «Registrar entrada». No
  «Enviar»/«Aceptar» cuando se puede decir qué pasa.
- Frases de una idea. Sin jerga técnica en producto.
- Una sola llamada a la acción por pantalla.
- Nunca: urgencia falsa, «revolucionario», «líder del mercado», «la mejor
  plataforma», testimonios o cifras sin fuente.

## 6. Aplicaciones

| Superficie | Reglas |
|---|---|
| Sitio público | Mensaje y prueba con capturas reales del producto; sin mockups que simulan funciones inexistentes |
| App del negocio | Densidad operativa, tokens, estados completos; el oro solo en la acción principal |
| Panel CEO | Prioridades y datos reales; nada de gráficos decorativos |
| Centro de ayuda | Pasos numerados con el nombre exacto de la interfaz |
| Propuestas y ventas | Capacidad disponible vs. prototipo vs. futuro, siempre separado |
| Redes sociales | Plantillas con logo, tipografía Montserrat y paleta; sin Public Stunt |
| Presentaciones | Una idea por diapositiva; cifras con fuente y fecha |

## 7. Qué no se afirma

- Que una función existe si no está en `app/` y probada.
- Que hay clientes, ingresos o resultados sin fuente autorizada.
- Que se cumple una norma (DIAN, WCAG) sin verificación registrada.
- Que una integración está activa si no hay credenciales y prueba real
  (n8n, NotebookLM, pagos en línea).

## 8. Gobierno de marca

1. Un cambio de logotipo, paleta o tipografía exige decisión documentada y
   revisión de `brand-consistency-reviewer`.
2. Los tokens se cambian en `packages/brand/` con su espejo JSON y CSS en el
   mismo cambio; marketing no edita tokens.
3. Toda pieza nueva se compara con este Brand Book antes de publicarse.
4. Una excepción necesita motivo y aprobación; no se convierte en regla por
   repetición.
5. La publicación externa requiere autorización humana explícita.

## 9. Archivos canónicos

| Tema | Archivo |
|---|---|
| Tokens | `packages/brand/tokens/tokens.json`, `packages/brand/css/tokens.css` |
| Logo | `packages/brand/src/BrandLogo.tsx`, `components/atoms/n-mark.tsx` |
| Sistema de diseño | `DESIGN.md` |
| Producto | `PRODUCT.md` |
| Tono | `docs/brand/guia-de-tono.md` |
| Componentes vivos | Storybook (`pnpm storybook`) |
