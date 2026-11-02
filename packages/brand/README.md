# @nexus/brand — Sistema de diseño NEXUS THRIVE

Todo sale del logo: un bloque negro sólido, esquinas rectas y cortes diagonales blancos.
De ahí se derivan las reglas: negro dominante, oro como único acento, radios casi nulos,
bordes en lugar de sombras y un solo motivo gráfico (el corte diagonal).

## Todo el diseño operativo, en un solo lugar

Este paquete es la **única casa del diseño de Nexus**: el código de la marca (arriba) y toda su documentación (`docs/`).
Los **componentes** (código con 372 consumidores) siguen en `components/` y se indexan más abajo.

| Carpeta de `docs/` | Qué contiene |
|---|---|
| [`01-marca/`](docs/01-marca/brand-book.md) | Libro de marca, guía de tono, prompt de marca |
| [`02-producto/`](docs/02-producto/PRODUCT.md) | `PRODUCT.md`: qué es Nexus, para quién y principios de producto |
| [`03-sistema/`](docs/03-sistema/DESIGN.md) | `DESIGN.md` (tokens, componentes, movimiento, layout vigentes), el borrador del [System Design](docs/03-sistema/SYSTEM-DESIGN.md) el [inventario de patrones](docs/03-sistema/inventario-patrones.md) medido (`pnpm design:inventory`) y las [decisiones del Design System](docs/03-sistema/decisiones-nexus-design-system.md) (resoluciones registradas, la comparación visual del botón y el principio transversal *Mobile as a First-Class Experience*) |
| [`04-patrones/`](docs/04-patrones/interaction-patterns.md) | Patrones de interacción, [accesibilidad](docs/04-patrones/accessibility.md), [movimiento](docs/04-patrones/movimiento.md) y [PWA](docs/04-patrones/pwa.md) |
| [`05-calidad/`](docs/05-calidad/quality-checklist.md) | Lista de calidad de interfaz (se copia en cada PR) |
| [`06-auditorias/`](docs/06-auditorias/REDISENO-NEXUS.md) | Rediseño de NEXUS, auditorías de diseño y UX y sus capturas; [auditoría responsive del dashboard](docs/06-auditorias/responsive-dashboard-2026-11/informe.md) (piloto del principio 08) |
| [`07-marketing/`](docs/07-marketing/estrategia-contenidos.md) | Estrategia de contenidos, SEO técnico, ventas, medición y experimentos |
| [`storybook/`](docs/storybook/introduccion.mdx) | Las páginas de documentación que muestra Storybook (`.storybook/main.ts` apunta aquí) |

### Dónde está el código del sistema de diseño

| Qué | Dónde |
|---|---|
| Tokens, tema, base, fuentes, logo | este paquete (`css/`, `tokens/`, `tailwind/`, `fonts/`, `src/`) |
| Átomos, moléculas, organismos, plantillas | `components/{atoms,molecules,organisms,templates}` (tabla en [`DESIGN.md` §3](docs/03-sistema/DESIGN.md)) |
| Historias de Storybook | junto a cada componente y en `app/**` |
| Estilos globales de la app | `app/globals.css`, `app/styles/` |
| Movimiento y experiencia como lógica | `lib/experience/` |
| Iconos de la app (los leen Next y el service worker) | `app/icon.svg`, `public/icons/` |
| Reglas de diseño que se prueban | `tests/architecture/ui-rules.test.ts`, `tests/architecture/brand-docs.test.ts` |
| Accesibilidad automatizada | `e2e/a11y.spec.ts` (Playwright + axe) |

**Regla:** un documento de diseño nuevo va en una carpeta de `docs/`; no se crea fuera de este paquete. Si cambia el sistema, se
actualiza `DESIGN.md` en el mismo PR.

## Estructura

Este paquete es la **única fuente de la marca**. La app lo consume desde
`app/globals.css` (CSS) y con el alias `@nexus/brand/*` (logo, en `tsconfig.json`).

```
packages/brand/                       ← @nexus/brand
├── tokens/tokens.json                ← fuente única (Figma, Canva, otras apps)
├── css/tokens.css                    ← variables CSS, modo claro y oscuro
├── css/base.css                      ← tipografía, botones, tarjetas, tablas, foco
├── css/theme-v4.css                  ← tema de Tailwind v4 (el que usa la app)
├── tailwind/preset.ts                ← preset para Tailwind v3
├── fonts/fonts.ts                    ← Montserrat, Inter, JetBrains Mono (next/font)
├── fonts/public_stunt/               ← Public Stunt (leer su licencia antes de usarla)
├── src/BrandLogo.tsx                 ← logo oficial (N + THRIVE) y sus rutas
├── src/NEXUS_THRIVE.svg              ← logo en SVG
├── reference/                        ← referencias que la app implementa
│   ├── nexus-loaders.html            ←   cargas de interfaz (components/atoms/n-mark.tsx)
│   └── nexus-splash-intro.html       ←   intro de la app (components/organisms/splash-intro.tsx)
├── designs/                          ← diseños HTML de exploración
│   ├── design-system-bos.html        ←   Design System del BOS
│   ├── cargas-de-interfaz.html       ←   Cargas de interfaz
│   ├── intro-de-la-app.html          ←   Intro de la app
│   ├── receipt-printer.html          ←   Impresora de recibos
│   └── comparacion-boton-sm-default.html ← Maqueta de decisión: botón sm frente a default
├── docs/                             ← documentación de diseño (ver abajo)
└── (la guía de prompts está en docs/01-marca/PROMPT.md)
```

## Instalación en apps/nexus-core/portal

1. Copiar la carpeta a `packages/brand` y añadir `"@nexus/brand": "workspace:*"` a las dependencias del portal.
2. `app/layout.tsx`:
```tsx
import { fontVariables } from "@nexus/brand/fonts";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={fontVariables} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```
3. `globals.css`:
```css
@import "@nexus/brand/tokens.css";
@import "@nexus/brand/base.css";
```
4. Tailwind v3, en `tailwind.config.ts`:
```ts
import preset from "@nexus/brand/tailwind-preset";
export default { presets: [preset], content: ["./app/**/*.{ts,tsx}", "../../packages/**/*.{ts,tsx}"] };
```
   Tailwind v4: ver el encabezado de `css/theme-v4.css`.
5. Modo oscuro: añadir la clase `dark` al `<html>` (por ejemplo con `next-themes`, `attribute="class"`).

## Paleta

| Rol | Token | Hex |
|---|---|---|
| Logo y superficies de marca | `ink` | `#000000` |
| Fondo claro | `paper` | `#F7F6F3` |
| Tarjetas | `white` | `#FFFFFF` |
| Fondo oscuro | `graphite-950` | `#0A0A0B` |
| Tarjeta oscura | `graphite-900` | `#141416` |
| Acento / CTA | `gold-500` | `#D4AF37` |
| Hover del acento | `gold-600` | `#B8921F` |
| Texto dorado sobre claro | `gold-700` | `#7F6210` |
| Texto secundario | `graphite-500` / `400` (oscuro) | `#6B6B73` / `#A1A1A8` |

Proporción de uso: 60 % negro y grafito, 30 % blanco y paper, 10 % oro.

## Tipografía

| Uso | Fuente | Peso |
|---|---|---|
| Títulos y marca | Montserrat (misma familia geométrica del logo) | 600–700 |
| Interfaz, formularios, tablas | Inter | 400 / 500 / 600 |
| Código, IDs, referencias | JetBrains Mono | 400 |

- Los títulos van en minúsculas normales (sentence case). Las mayúsculas con tracking amplio (`.nx-wordmark`) son solo para el nombre de la marca, igual que THRIVE en el logo.
- Las cifras usan `tabular-nums` (ya aplicado en tablas), clave para caja menor y presupuestos.
- Escala: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 40 / 52 px.

## Reglas de uso

1. El oro es acento, no relleno: botón destacado, indicador de navegación activa, la métrica clave. Si aparece en todo, pierde valor.
2. El oro nunca es texto sobre blanco (contraste ~2:1). Usar `gold-700` (`text-accent-text`). Sobre negro, `gold-500` funciona (≈10:1).
3. Los botones dorados llevan texto negro.
4. Sin degradados, brillos ni glow. Elevación con borde (`.nx-card`), no con sombra. Solo los popovers llevan sombra.
5. Radios: 2 px en badges, 4 px en botones e inputs, 6 px en tarjetas. Nada de píldoras.
6. Motivo de marca: el corte diagonal (`.nx-slash`, `.nx-cut-corner`). Uno por pantalla como máximo.
7. Sidebar sobre la superficie `--sidebar-bg`: blanca en claro, Ink en oscuro; el ítem activo lleva barra dorada (`--sidebar-accent`).
8. Colores de estado (`success`, `danger`) solo funcionales. Nunca deben ser el único indicador: llevan texto o icono.
9. Foco visible en todo elemento interactivo (ya definido en `base.css`).

## Layout de la app

- Sidebar 248 px (64 px colapsado), topbar 56 px, contenido máx. 1280 px.
- Espaciado en múltiplos de 4 px.
- Movimiento: 120 ms (hover) y 200 ms (paneles), respetando `prefers-reduced-motion`.

## Clases utilitarias disponibles (base.css)

`.nx-wordmark` · `.nx-slash` · `.nx-cut-corner` · `.nx-nav-item` · `.nx-btn` (`--primary`, `--accent`, `--outline`, `--danger`) · `.nx-card` · `.nx-input` · `.nx-badge` (`--gold`) · `.nx-table`
