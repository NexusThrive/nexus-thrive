# PrettyModal en los modales de escritorio — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Sustituir el morfeo WAAPI de los modales centrados de escritorio por el viaje del ZIP (tamaño, posición, radio y color reales) a 0,40 s en ambos sentidos, sin tocar móvil, `drawer`, `alert` ni `full`.

**Architecture:** Un motor GSAP nuevo (`lib/motion/modal-morph.ts`) se arma en el `ref` del contenido antes del primer pintado, igual que el `connectToActivator` actual. La apertura la dirige el motor; el cierre se dispara observando `data-state="closed"` y el CSS (`modal-out-hold`, 400 ms) mantiene el nodo montado para que Radix espere. La copia de salida (`ghostOut`) reutiliza el mismo reproductor de reversa.

**Tech Stack:** React 19, Radix Dialog, GSAP 3, CSS Modules, Playwright (e2e), Storybook.

**Spec:** `docs/superpowers/specs/2026-10-29-prettymodal-desktop-design.md`

## Global Constraints

- Apertura y cierre: **0,40 s** exactos.
- Solo aplica a `ResponsiveSheet` con `data-variant="dialog"`, `min-width: 768px`, sin `alert`, sin `drawer`, sin `size="full"` y con movimiento activo (`!motionOff()`).
- El CSS no anima lo mismo que el motor: con `data-morph` puesto, la entrada/salida CSS del diálogo se apaga; `modal-out-hold` solo sostiene la salida 400 ms.
- Los clics y el foco no esperan la animación (el CSS ya pone `pointer-events: none` al cerrar).
- Movimiento reducido: sin viaje (CSS a 1 ms, el motor no se arma).
- No tocar móvil, `drawer`, `alert` ni `full`.
- No commitear cambios preexistentes de la rama (`CHANGELOG.md`, `components/organisms/app-topbar.tsx`, `scripts/ops/*`) ni `Pretty Modal Demo.zip`: en cada commit, `git add` solo con las rutas de la tarea.

## Review Focus

- **Cierre a mitad de apertura:** la reversa debe partir del estado actual (tamaño/posición/radio/color), sin saltar al centro.
- **Montaje condicional (`{abierto ? <Panel/> : null}`):** al desmontar el padre debe quedar la copia que viaja al botón y se borra sola.
- **Reabrir rápido:** estilos en línea, `data-morph` y la opacidad del botón de origen no deben quedar sucios.
- **Origen ausente, desconectado o fuera de pantalla** (menú que se cierra al elegir): entrada/salida por fundido desde el centro, sin viaje roto.
- **`busy` y guard de cambios:** no cerrar ni animar cuando la lógica dice que no.
- **Doble montaje de StrictMode:** no duplicar líneas de tiempo ni copias.
- **Hoja móvil y `drawer`:** siguen con su animación CSS, sin `data-morph`.

---

### Task 1: Dependencia GSAP y motor de apertura

**Files:**
- Modify: `package.json` (mover `gsap` de `devDependencies` a `dependencies`)
- Create: `lib/motion/modal-morph.ts`
- Modify: `components/organisms/responsive-sheet.tsx`
- Modify: `components/organisms/responsive-sheet.module.css`
- Test: `e2e/overlays.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  // lib/motion/modal-morph.ts
  export const MORPH_SECONDS = 0.4;
  export function trackActivators(): void; // idempotente; se llama al cargar el módulo
  export function armModalMorph(node: HTMLElement): () => void; // arranca la apertura si procede; devuelve limpieza
  export function exitPlayerFor(node: HTMLElement): ((el: HTMLElement) => void) | undefined; // Task 2
  export function releaseModalMorph(node: HTMLElement): void; // restaura el botón de origen y mata la línea de tiempo
  ```
- Consumes: `motionOff()` de `@/lib/motion`, `gsap`.

- [x] **Step 1: Mover `gsap` a `dependencies`**

En `package.json`, quitar `"gsap": "^3.15.0"` de `devDependencies` y añadirlo a `dependencies`. Ejecutar `pnpm install` para actualizar el lockfile.

- [x] **Step 2: Escribir la prueba de apertura que falla**

En `e2e/overlays.spec.ts`, sustituir el test `"el origen de la escala es el botón que lo abrió"` (dentro de `test.describe("Modal conectado al botón")`) por:

```ts
test("nace del botón y vuelve a él (viaje del ZIP a 0,4 s)", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 600 });
  await openStory(page, "organismos-formsheet--dialog");
  const boton = page.getByRole("button", { name: "Nuevo cliente" });
  const caja = await boton.boundingBox();
  await page.evaluate(() => {
    const m: { t: number; w: number; cx: number; cy: number }[] = ((window as unknown as { __m: unknown[] }).__m = []) as never;
    const t0 = performance.now();
    const tick = () => {
      const d = document.querySelector('[role="dialog"]');
      if (d) {
        const r = d.getBoundingClientRect();
        m.push({ t: Math.round(performance.now() - t0), w: Math.round(r.width), cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) });
      }
      if (performance.now() - t0 < 900) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await boton.click();
  const dialogo = page.getByRole("dialog");
  await dialogo.waitFor();
  expect(await dialogo.evaluate((el) => el.hasAttribute("data-morph"))).toBe(true);
  await page.waitForTimeout(900);
  const apertura = await page.evaluate(() => (window as unknown as { __m: { t: number; w: number; cx: number; cy: number }[] }).__m);
  expect(apertura[0].w, "arranca con el ancho del botón").toBeLessThan(260);
  expect(Math.abs(apertura[0].cy - (caja!.y + caja!.height / 2)), "arranca en el botón").toBeLessThan(24);
  expect(apertura.at(-1)!.w, "termina con el ancho del modal").toBeGreaterThan(400);
  // El cierre vuelve al botón.
  await page.evaluate(() => ((window as unknown as { __m: unknown[] }).__m = []));
  await page.keyboard.press("Escape");
  await expect(dialogo).toHaveCount(0);
  const cierre = await page.evaluate(() => (window as unknown as { __m: { t: number; w: number; cx: number; cy: number }[] }).__m);
  expect(cierre.at(-1)!.w, "termina con el ancho del botón").toBeLessThan(260);
  expect(Math.abs(cierre.at(-1)!.cx - (caja!.x + caja!.width / 2)), "termina en el botón").toBeLessThan(24);
  await expect(boton).toBeFocused();
});
```

- [x] **Step 3: Correr la prueba y ver que falla**

Run: `pnpm test:e2e --project=escritorio -g "nace del botón"`
Expected: FAIL en `data-morph` o en `apertura[0].w` (la animación actual solo escala y no cambia el ancho).

- [x] **Step 4: Crear `lib/motion/modal-morph.ts` con la apertura**

Portar del laboratorio (`components/labs/pretty-modal/pretty-modal.tsx`) estas piezas, adaptadas:

```ts
import { gsap } from "gsap";
import { motionOff } from "@/lib/motion";

export const MORPH_SECONDS = 0.4; // apertura y cierre
const ZIP_OPEN = 0.75;            // base del ZIP para escalar el contenido
const CLEAR = "x,y,xPercent,yPercent,width,height,borderRadius,backgroundColor,overflow,opacity";

let lastActivator: WeakRef<HTMLElement> | null = null;
let tracking = false;
export function trackActivators(): void { /* igual que el actual de responsive-sheet.tsx */ }

type Box = { w: number; h: number; cx: number; cy: number; radius: string; bg: string; fade: boolean };

function describeOrigin(el: HTMLElement | null, target: Omit<Box, "fade">): Box { /* igual que el laboratorio, sin el caso punto */ }

export function armModalMorph(node: HTMLElement): () => void {
  // Solo escritorio, variante dialog y movimiento activo.
  if (motionOff() || !window.matchMedia("(min-width: 768px)").matches) return () => {};
  if (node.dataset.variant !== "dialog" || node.dataset.state !== "open") return () => {};

  const origin = lastActivator?.deref() ?? null;
  const originEl = origin?.isConnected ? origin : null;
  // to = rect natural; from = describeOrigin(originEl, to)
  // estado inicial con width/height/x/y/xPercent/yPercent/borderRadius/backgroundColor/overflow
  // items = hijos directos; opacidad 0, y 14 · botón origen opacity 0
  // línea de tiempo pausada: card a destino (expo.out), y con power4.out, items escalonados
  // requestAnimationFrame → gsap.ticker.tick() → play(0)
  // onComplete: clearProps y restaurar items
  // devolver () => { timeline.kill(); if (originEl) gsap.set(originEl, { clearProps: "opacity" }); }
}

export function releaseModalMorph(node: HTMLElement): void { /* mata la línea de tiempo y restaura el botón */ }
trackActivators();
```

Reglas exactas del port:
- `xPercent: -50, yPercent: -50` en el estado inicial y en el destino (el CSS centra con `translate(-50%, -50%)`; GSAP conserva el porcentaje al animar el ancho).
- `x` objetivo `0`, `y` objetivo `0`; estado inicial `x = from.cx - to.cx`, `y = from.cy - to.cy`.
- Duraciones: `MORPH_SECONDS`; el eje Y `MORPH_SECONDS * 1.1` con `power4.out`; contenido `0.5 * (MORPH_SECONDS / ZIP_OPEN)` con `stagger 0.06 * (MORPH_SECONDS / ZIP_OPEN)` y retardo `0.22 * (MORPH_SECONDS / ZIP_OPEN)`.
- Si no hay botón de origen: `from = { ...to, w: to.w * 0.92, h: to.h * 0.92, fade: true }` y `opacity: 0`.

- [x] **Step 5: Enganchar el motor en `ResponsiveSheet`**

En `components/organisms/responsive-sheet.tsx`:
- Borrar `lastActivator`, `trackActivators`, `MORPH_EASE`, `MORPH_MS` y `connectToActivator`.
- Importar `armModalMorph`, `exitPlayerFor`, `releaseModalMorph`, `MORPH_SECONDS` desde `@/lib/motion/modal-morph`.
- En `setContent`, sustituir `if (!alert) connectToActivator(node)` por:
  ```ts
  if (!alert && !drawer && resolvedSize !== "full") {
    morphCleanup.current = armModalMorph(node);
    lastScrim.current?.setAttribute("data-morph", "");
  }
  ```
  (con `const morphCleanup = useRef<() => void>(() => {})`).
- En el `useLayoutEffect` de desmontaje, antes de `ghostOut`, llamar `morphCleanup.current()`.
- `ghostOut`: usar `exitPlayerFor(content)` y `MORPH_SECONDS * 1000 + 120` para el `setTimeout`.

- [x] **Step 6: Ajustar el CSS**

En `components/organisms/responsive-sheet.module.css`:
- `modal-out-hold` pasa de `380ms` a `400ms` (comentario incluido).
- Añadir `.scrim[data-state="closed"][data-morph] { animation-duration: 400ms; }`.

- [x] **Step 7: Correr typecheck, lint y la prueba**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint components/organisms/responsive-sheet.tsx lib/motion/modal-morph.ts e2e/overlays.spec.ts`
Expected: sin salida.

Run: `pnpm test:e2e --project=escritorio -g "nace del botón"`
Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml lib/motion/modal-morph.ts components/organisms/responsive-sheet.tsx components/organisms/responsive-sheet.module.css e2e/overlays.spec.ts
git commit -m "feat(modal): viaje desde el botón con GSAP a 0,40 s (escritorio)"
```

---

### Task 2: Cierre, cierre a mitad y salida fantasma

**Files:**
- Modify: `lib/motion/modal-morph.ts`
- Test: `e2e/overlays.spec.ts`

**Interfaces:**
- Consumes: `armModalMorph`, `describeOrigin`, `MORPH_SECONDS` (Task 1).
- Produces: `exitPlayerFor(node)` devuelve el reproductor de reversa; `armModalMorph` registra el nodo en el `WeakMap` y observa `data-state`.

- [x] **Step 1: Escribir las pruebas de cierre que fallan**

Añadir al mismo `test.describe("Modal conectado al botón")`:

```ts
test("cerrar a mitad de apertura no salta: continúa desde donde va", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 600 });
  await openStory(page, "organismos-formsheet--dialog");
  const boton = page.getByRole("button", { name: "Nuevo cliente" });
  const caja = await boton.boundingBox();
  await page.evaluate(() => {
    const m: { t: number; w: number; cx: number }[] = ((window as unknown as { __m: unknown[] }).__m = []) as never;
    const t0 = performance.now();
    const tick = () => {
      const d = document.querySelector('[role="dialog"]');
      if (d) { const r = d.getBoundingClientRect(); m.push({ t: Math.round(performance.now() - t0), w: Math.round(r.width), cx: Math.round(r.left + r.width / 2) }); }
      if (performance.now() - t0 < 1200) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await boton.click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(80); // a mitad del viaje de 400 ms
  const antes = await page.getByRole("dialog").evaluate((el) => Math.round(el.getBoundingClientRect().width));
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const m = await page.evaluate(() => (window as unknown as { __m: { t: number; w: number; cx: number }[] }).__m);
  const corte = m.findIndex((f, i) => i > 0 && f.w < m[i - 1].w - 60);
  expect(Math.abs(m[corte].w - antes), "la reversa empieza donde iba").toBeLessThan(60);
  expect(m.at(-1)!.w, "termina en el botón").toBeLessThan(260);
  expect(Math.abs(m.at(-1)!.cx - (caja!.x + caja!.width / 2))).toBeLessThan(24);
});

test("la X y el fondo también devuelven al botón", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 600 });
  await openStory(page, "organismos-formsheet--dialog");
  const boton = page.getByRole("button", { name: "Nuevo cliente" });
  const caja = await boton.boundingBox();
  for (const cerrar of ["x", "fondo"] as const) {
    await boton.click();
    const dialogo = page.getByRole("dialog");
    await dialogo.waitFor();
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const m: number[] = ((window as unknown as { __m: number[] }).__m = []) as never;
      const t0 = performance.now();
      const tick = () => {
        const d = document.querySelector('[role="dialog"]');
        if (d) m.push(Math.round(d.getBoundingClientRect().left + d.getBoundingClientRect().width / 2));
        if (performance.now() - t0 < 900) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    if (cerrar === "x") await page.getByRole("button", { name: "Cerrar" }).click();
    else await page.mouse.click(60, 300);
    await expect(dialogo).toHaveCount(0);
    const xs = await page.evaluate(() => (window as unknown as { __m: number[] }).__m);
    expect(Math.abs(xs.at(-1)! - (caja!.x + caja!.width / 2)), `${cerrar} vuelve al botón`).toBeLessThan(24);
  }
});
```

- [x] **Step 2: Correr y ver que fallan**

Run: `pnpm test:e2e --project=escritorio -g "mitad de apertura|también devuelven"`
Expected: FAIL (hoy no hay viaje de tamaño, o el cierre no existe).

- [x] **Step 3: Implementar el cierre en el motor**

En `lib/motion/modal-morph.ts`:
- `const players = new WeakMap<HTMLElement, (el: HTMLElement) => void>();`
- En `armModalMorph`, registrar `players.set(node, playExit)` y observar:
  ```ts
  const watcher = new MutationObserver(() => {
    if (node.getAttribute("data-state") !== "closed") return;
    watcher.disconnect();
    playExit(node);
  });
  watcher.observe(node, { attributes: true, attributeFilter: ["data-state"] });
  ```
- `playExit(el)`: misma reversa del laboratorio.
  - Medir el estado actual con `gsap.getProperty(el, "x" | "y")` y `getBoundingClientRect()`.
  - `from = describeOrigin(originEl, current)`; re-medir el botón en ese momento (puede haberse movido).
  - `gsap.set(el, { width, height, overflow: "hidden", borderRadius, backgroundColor })`.
  - Línea de tiempo: hijos a `opacity 0` e `y 8` en `0.16 * (MORPH_SECONDS / 0.55)` con `stagger 0.02 * (MORPH_SECONDS / 0.55)`; tarjeta a origen con `expo.inOut` en `MORPH_SECONDS` desde `0.12 * (MORPH_SECONDS / 0.55)`; eje Y con `power3.inOut` en `MORPH_SECONDS * 0.95`.
  - Al terminar: `gsap.set(el, { opacity: 0 })` y restaurar el botón (`clearProps: "opacity"`).
- `exitPlayerFor = (node) => players.get(node)`.
- `releaseModalMorph(node)`: `players.delete(node)`? No: matar la línea de tiempo activa y restaurar el botón; mantener el player por si `ghostOut` corre justo después.

- [x] **Step 4: Correr las pruebas de cierre**

Run: `pnpm test:e2e --project=escritorio -g "mitad de apertura|también devuelven|Salida animada"`
Expected: PASS, incluida la copia fantasma existente.

- [x] **Step 5: Commit**

```bash
git add lib/motion/modal-morph.ts components/organisms/responsive-sheet.tsx e2e/overlays.spec.ts
git commit -m "feat(modal): cierre y salida fantasma con el viaje de vuelta a 0,40 s"
```

---

### Task 3: Variantes excluidas y movimiento reducido

**Files:**
- Modify: `components/organisms/responsive-sheet.tsx`
- Test: `e2e/overlays.spec.ts`

**Interfaces:**
- Consumes: `armModalMorph`, `releaseModalMorph` (Tasks 1-2).

- [x] **Step 1: Añadir las pruebas de no-regresión**

```ts
test.describe("Variantes sin viaje", () => {
  test.skip(({ isMobile }) => isMobile, "El panel lateral y el modal solo se comparan en escritorio");

  test("el panel lateral no se arma", async ({ page }) => {
    await openStory(page, "organismos-formsheet--drawer");
    await page.getByRole("button", { name: "Editar cliente" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.waitFor();
    expect(await dialogo.evaluate((el) => el.hasAttribute("data-morph"))).toBe(false);
  });

  test("movimiento reducido: sin data-morph y sin viaje", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.waitFor();
    expect(await dialogo.evaluate((el) => el.hasAttribute("data-morph"))).toBe(false);
    const ancho = await dialogo.evaluate((el) => Math.round(el.getBoundingClientRect().width));
    expect(ancho).toBeGreaterThan(400);
  });
});
```

- [x] **Step 2: Correr y ver que pasan o fallan por la razón correcta**

Run: `pnpm test:e2e --project=escritorio -g "Variantes sin viaje"`
Expected: PASS en `drawer`; el de reducido pasa solo si el motor consulta `motionOff()`.

- [x] **Step 3: Completar el gating en `ResponsiveSheet`**

Confirmar que solo se arma con `!alert && !drawer && resolvedSize !== "full"` (Task 1) y que `armModalMorph` corta con `motionOff()` y `min-width: 768px`. Añadir un comentario de una línea en el componente explicando las exclusiones y enlazando el spec.

- [x] **Step 4: Correr la suite de overlays completa**

Run: `pnpm test:e2e --project=escritorio e2e/overlays.spec.ts`
Expected: PASS.

Run: `pnpm test:e2e --project=movil e2e/overlays.spec.ts`
Expected: PASS (la hoja móvil no cambia).

- [x] **Step 5: Commit**

```bash
git add components/organisms/responsive-sheet.tsx e2e/overlays.spec.ts
git commit -m "test(modal): cubre drawer, full y movimiento reducido sin viaje"
```

---

### Task 4: Documentación y cierre

**Files:**
- Modify: `docs/design/movimiento.md`
- Modify: `components/organisms/responsive-sheet.tsx` (comentario de cabecera del componente)
- Modify: `docs/superpowers/specs/2026-10-29-prettymodal-desktop-design.md` (estado: implementado)

- [x] **Step 1: Actualizar la guía de movimiento**

En `docs/design/movimiento.md`:
- §1.3: añadir la excepción del modal de escritorio (`width`, `height`, `border-radius`, `background-color`, una sola vez por transición, con `data-morph` como único dueño).
- §2: cambiar la fila del modal a «GSAP (viaje desde el botón y su reversa)».
- §3: el modal de escritorio usa **400 ms** en entrada y salida; el resto de tokens no cambia.
- §4: reescribir «Cómo funciona» con el motor GSAP, `data-morph`, `modal-out-hold` 400 ms y la copia de salida; mantener «Cuándo NO hay morfeo» y añadir `full` a la lista.

- [x] **Step 2: Actualizar el comentario del componente**

En `components/organisms/responsive-sheet.tsx`, la cabecera de `ResponsiveSheet` y el docblock de `armModalMorph` deben decir 400 ms, GSAP y las exclusiones (móvil, drawer, alert, full).

- [x] **Step 3: Marcar el spec como implementado**

Cabecera del spec: `Estado: implementado (2026-10-29)`.

- [x] **Step 4: Verificación final**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint components/organisms lib/motion e2e/overlays.spec.ts`
Expected: sin salida.

Run: `pnpm test`
Expected: PASS.

Run: `pnpm test:e2e`
Expected: PASS en `escritorio` y `movil`.

- [x] **Step 5: Revisión visual del usuario**

Servir Storybook (`pnpm storybook` o el build estático) y pedir al usuario que confirme apertura, cierre, X, fondo, mitad de apertura y que móvil/drawer siguen igual.

- [x] **Step 6: Commit**

```bash
git add docs/design/movimiento.md docs/superpowers/specs/2026-10-29-prettymodal-desktop-design.md components/organisms/responsive-sheet.tsx
git commit -m "docs(modal): documenta el viaje GSAP de escritorio y su excepción de movimiento"
```
