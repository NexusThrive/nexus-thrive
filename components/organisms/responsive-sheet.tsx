"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { cn } from "@/lib/utils";
import styles from "./responsive-sheet.module.css";

/* Último control pulsado (clic, toque o Enter/Espacio): de ahí «nace» el modal.
   Un solo oyente para toda la app; se guarda una referencia débil. */
let lastActivator: WeakRef<HTMLElement> | null = null;
let tracking = false;
function trackActivators() {
  if (tracking || typeof document === "undefined") return;
  tracking = true;
  const remember = (event: Event) => {
    const el = (event.target as Element | null)?.closest?.<HTMLElement>('button, a, [role="button"]');
    if (el) lastActivator = new WeakRef(el);
  };
  document.addEventListener("pointerdown", remember, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") remember(event);
  }, true);
}

const MORPH_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Duración del morfeo (entrada y salida: la misma, en espejo). Debe coincidir con `modal-out-hold` en el CSS. */
const MORPH_MS = 380;

/**
 * Huella de lo escrito en un panel: valores de campos, casillas y archivos
 * elegidos (en creación y en edición, con o sin `<form>`). Se ignoran los
 * campos de búsqueda o filtro (`type=search`, `role=searchbox`, texto «buscar»
 * / «filtrar») y todo lo que esté dentro de `[data-no-guard]`.
 */
function formSnapshot(root: HTMLElement): string {
  const parts: string[] = [];
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea").forEach((el, i) => {
    if (el.closest("[data-no-guard]")) return;
    if (el instanceof HTMLInputElement && (el.type === "search" || el.type === "button" || el.type === "submit")) return;
    if (el.getAttribute("role") === "searchbox") return;
    const hint = `${el.getAttribute("aria-label") ?? ""} ${el.getAttribute("placeholder") ?? ""}`;
    if (/\b(buscar|filtrar|search)/i.test(hint)) return;
    const key = el.name || el.id || String(i);
    if (el instanceof HTMLInputElement) {
      if (el.type === "file") parts.push(`${key}=${[...(el.files ?? [])].map((f) => f.name).join("|")}`);
      else if (el.type === "checkbox" || el.type === "radio") parts.push(`${key}:${el.value}=${el.checked}`);
      else parts.push(`${key}=${el.value}`);
    } else parts.push(`${key}=${el.value}`);
  });
  return parts.join("\n");
}

/**
 * «Guardar» desde la pregunta de cambios sin guardar: marca explícita
 * (`[data-save]`), si no el formulario del panel (con su validación) y, si no
 * hay formulario, el último botón del pie (la acción principal).
 */
function saveFromPrompt(content: HTMLElement | null) {
  if (!content) return;
  const marked = content.querySelector<HTMLElement>("[data-save]:not([disabled])");
  if (marked) return marked.click();
  const form = content.querySelector("form");
  if (form) return form.requestSubmit();
  const buttons = content.querySelectorAll<HTMLButtonElement>("footer button:not([disabled])");
  buttons[buttons.length - 1]?.click();
}

/** Reversa de cada modal con morfeo (la registra `connectToActivator`). */
const exitPlayers = new WeakMap<HTMLElement, (el: HTMLElement) => void>();

/**
 * Salida «a la fuerza». Muchas pantallas montan el panel solo mientras está
 * abierto (`{abierto ? <Panel open … /> : null}`): al cerrar, React lo quita en
 * el acto y Radix no llega a animar la salida. Al desmontarse estando abierto,
 * se deja una copia del panel y del fondo con `data-state="closed"` (los estilos
 * de salida cuelgan de ese atributo) y se anima la salida sobre la copia: la
 * reversa al botón en el modal flotante, el deslizamiento en el panel lateral,
 * la bajada en la hoja móvil. La copia no recibe clics, no repite ids y se
 * borra sola.
 */
function ghostOut(content: HTMLElement, scrim: HTMLElement | null) {
  const root = document.documentElement;
  if (root.dataset.motion === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const copies: HTMLElement[] = [];
  const copy = (node: HTMLElement) => {
    const clone = node.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("inert", "");
    clone.style.pointerEvents = "none";
    clone.setAttribute("data-state", "closed");
    clone.setAttribute("data-ghost", "");
    copies.push(clone);
    return clone;
  };
  const player = exitPlayers.get(content);
  if (scrim) document.body.appendChild(copy(scrim));
  const panel = copy(content);
  // Sin reversa (panel lateral, hoja móvil o modal sin botón de origen): salida CSS.
  if (!player) panel.removeAttribute("data-morph");
  document.body.appendChild(panel);
  player?.(panel);
  window.setTimeout(() => copies.forEach((el) => el.remove()), MORPH_MS + 120);
}

// Desde que se carga el módulo: muchas pantallas montan el panel solo al abrirlo,
// y el clic que lo abre ocurre antes de que exista.
trackActivators();

/**
 * Modal flotante centrado (PC): «nace» del control que lo abrió.
 *
 * - **Entrada (morfeo):** animación de Web Animations que lleva el modal desde
 *   el rectángulo del control (posición y proporciones) hasta su sitio, con
 *   un breve enfoque (de 4 px de desenfoque a nítido) y opacidad que sube
 *   rápido para que la deformación del contenido casi no se vea. Es el mismo
 *   efecto que un elemento compartido de View Transitions, hecho con FLIP
 *   porque así el foco, Radix y el flujo de React no cambian.
 * - **Salida:** el mismo morfeo en reversa (de vuelta al control, curva espejo,
 *   misma duración). El CSS solo sostiene la animación para que Radix espere.
 *   La superficie deja de capturar el puntero al instante: no bloquea el clic.
 *
 * Si el control ya no existe, está fuera de pantalla, el movimiento está
 * reducido, o la forma es panel lateral u hoja móvil, no hay morfeo: entra la
 * animación CSS centrada de siempre. Un solo dueño por fase: con morfeo la
 * entrada CSS se apaga (`data-morph`).
 */
function connectToActivator(node: HTMLElement) {
  node.style.transformOrigin = "";
  node.removeAttribute("data-morph");
  // Panel lateral y hoja móvil NO hacen morfeo: el panel siempre entra y sale
  // deslizándose por su borde (CSS `drawer-in`/`drawer-out`), la hoja sube y baja.
  if (node.dataset.variant === "drawer" || !window.matchMedia("(min-width: 768px)").matches) return;
  const activator = lastActivator?.deref();
  if (!activator?.isConnected) return;
  const a = activator.getBoundingClientRect();
  if (a.width === 0 || a.bottom < 0 || a.top > window.innerHeight || a.right < 0 || a.left > window.innerWidth) return;

  // offsetWidth/Height ignoran la escala de la animación. El modal va centrado.
  const w = node.offsetWidth;
  const h = node.offsetHeight;
  const homeX = window.innerWidth / 2;
  const homeY = window.innerHeight / 2;
  const base = "translate(-50%, -50%) ";
  node.style.transformOrigin = `${a.left + a.width / 2 - (homeX - w / 2)}px ${a.top + a.height / 2 - (homeY - h / 2)}px`;

  const root = document.documentElement;
  const motionOff = root.dataset.motion === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (motionOff || typeof node.animate !== "function") return;

  const rest = `${base}translate(0px, 0px) scale(1, 1)`;
  // Misma lista de funciones y origen centrado en las dos direcciones: el
  // camino es recto hasta el botón (con otra estructura, o con el origen en el
  // botón, el navegador interpola por matrices y se pasa de largo).
  const toButton = (target: DOMRect | null) => {
    const dx = target ? target.left + target.width / 2 - homeX : 0;
    const dy = target ? target.top + target.height / 2 - homeY : 0;
    const sx = target ? Math.min(1, Math.max(0.08, target.width / w)) : 0.94;
    const sy = target ? Math.min(1, Math.max(0.08, target.height / h)) : 0.94;
    return `${base}translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  };

  node.setAttribute("data-morph", "");
  node.animate(
    [
      { transform: toButton(a), transformOrigin: "50% 50%", opacity: 0, filter: "blur(4px)", offset: 0 },
      { opacity: 1, filter: "blur(0px)", offset: 0.45 },
      { transform: rest, transformOrigin: "50% 50%", opacity: 1, filter: "blur(0px)", offset: 1 },
    ],
    { duration: MORPH_MS, easing: MORPH_EASE },
  );

  // `data-morph` se mantiene mientras esté abierto: quitarlo antes haría que la
  // entrada CSS arrancara de nuevo. Al cerrar se juega el mismo morfeo EN
  // REVERSA hacia el botón; mientras, el CSS (`modal-out-hold`) solo mantiene
  // viva la animación para que Radix no desmonte antes de tiempo.
  // Reversa hacia el botón (donde esté ahora). Sirve a `node` y al fantasma de
  // `ghostOut` (copia que se anima cuando el padre desmonta el panel de golpe).
  const playExit = (el: HTMLElement) => {
    const now = activator.isConnected ? activator.getBoundingClientRect() : null;
    const visible = now && now.width > 0 && now.bottom >= 0 && now.top <= window.innerHeight;
    el.animate(
      [
        { transform: rest, transformOrigin: "50% 50%", opacity: 1, filter: "blur(0px)", offset: 0 },
        { opacity: 1, filter: "blur(0px)", offset: 0.55 },
        { transform: toButton(visible ? now : null), transformOrigin: "50% 50%", opacity: 0, filter: "blur(4px)", offset: 1 },
      ],
      // Curva espejo de la entrada: (0.22, 1, 0.36, 1) → (0.64, 0, 0.78, 0).
      { duration: MORPH_MS, easing: "cubic-bezier(0.64, 0, 0.78, 0)", fill: "forwards" },
    );
  };
  exitPlayers.set(node, playExit);

  const watcher = new MutationObserver(() => {
    if (node.getAttribute("data-state") !== "closed") return;
    watcher.disconnect();
    // Solo la de entrada (script): cancelar la CSS de sostén haría desmontar de golpe.
    node.getAnimations().forEach((animation) => !(animation instanceof CSSAnimation) && animation.cancel());
    playExit(node);
  });
  watcher.observe(node, { attributes: true, attributeFilter: ["data-state"] });
}

/**
 * Panel adaptable NEXUS THRIVE (formularios, confirmaciones, detalle):
 *
 * - Móvil: hoja inferior que sube con un rebote y se cierra arrastrándola
 *   hacia abajo desde la barra o el encabezado (umbral 110 px o un gesto
 *   rápido); hacia arriba ofrece resistencia.
 * - PC: modal centrado (`size`: sm 440 · md 520 · lg 640 · xl 768 px) o
 *   panel lateral derecho (`drawer`, 440 px; `size="lg"` 560 px) para fichas,
 *   registros con varias secciones y detalle que conserva el contexto.
 *
 * En PC el modal se abre como un morfeo desde el control que lo abrió y se
 * cierra hacia él (ver `connectToActivator` y docs/design/movimiento.md).
 *
 * Radix Dialog aporta el foco atrapado, Escape, el fondo que cierra, la
 * devolución del foco al control que lo abrió y los roles ARIA; las
 * animaciones viven en el CSS Module (sin JS por cuadro).
 *
 * Cuándo usar cada forma: docs/design/interaction-patterns.md. Para
 * formularios, preferir `FormDialog` / `FormDrawer` (form-sheet.tsx), que ya
 * traen pie, errores y bloqueo mientras se guarda.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  trigger,
  drawer = false,
  size,
  wide = false,
  extraWide = false,
  busy = false,
  unsavedGuard = true,
  alert = false,
  className,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Botones de la parte inferior (en móvil ocupan todo el ancho). */
  footer?: ReactNode;
  /** Elemento que abre el panel (modo no controlado). */
  trigger?: ReactNode;
  /** Panel lateral derecho en PC (en móvil, hoja inferior casi a pantalla completa). */
  drawer?: boolean;
  /** Ancho en PC. `full` = modal AVANZADO a pantalla completa (documentos). Modal: sm 440 · md 520 (por defecto) · lg 640 · xl 768. Panel: md 440 · lg 560. */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** @deprecated usar `size="lg"`. */
  wide?: boolean;
  /** @deprecated usar `size="xl"` (tablas y editores: APU, presupuesto). */
  extraWide?: boolean;
  /**
   * Hay una operación en curso: no se cierra con Escape, el fondo, la X ni
   * arrastrando, y el contenido queda `aria-busy`. Evita perder un guardado a
   * medias.
   */
  busy?: boolean;
  /**
   * Si el panel tiene un `<form>` con datos escritos y se intenta cerrar (Escape,
   * fondo, X, «Cancelar», arrastrar), antes pregunta: guardar, descartar o seguir
   * editando. Un panel sin formulario o sin cambios se cierra sin preguntar.
   * `false` para confirmaciones y paneles donde no aplica.
   */
  unsavedGuard?: boolean;
  /**
   * Aviso que va **encima de otro panel** (p. ej. «¿Guardar los cambios?»):
   * fondo más oscuro y difuminado que deja el panel de abajo en segundo plano,
   * y entrada/salida rápidas (160/120 ms) sin morfeo desde un botón.
   */
  alert?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  // Ref de callback: el origen se fija al montar, antes del primer pintado.
  const lastContent = useRef<HTMLElement | null>(null);
  const lastScrim = useRef<HTMLElement | null>(null);
  const mountedAt = useRef(0);
  const setContent = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    if (node) {
      lastContent.current = node;
      if (!alert) connectToActivator(node);
      // Huella de «cómo abrió». Se mantiene al día (también si los campos
      // llegan después de montar, p. ej. al cargar una ficha) hasta justo antes
      // del primer cambio de la persona: ahí queda fija.
      frozen.current = false;
      latest.current = null;
      baseline.current = null;
      const refresh = () => {
        if (!frozen.current) latest.current = formSnapshot(node);
      };
      const freeze = () => {
        if (frozen.current) return;
        baseline.current = latest.current ?? formSnapshot(node);
        frozen.current = true;
      };
      refresh();
      window.setTimeout(refresh, 0);
      window.setTimeout(refresh, 250);
      new MutationObserver(refresh).observe(node, { childList: true, subtree: true });
      // Lo que precede a un cambio (foco, clic, tecla) actualiza la huella; el cambio mismo la congela.
      ["focusin", "pointerdown", "keydown", "beforeinput"].forEach((type) => node.addEventListener(type, refresh, { capture: true }));
      ["input", "change"].forEach((type) => node.addEventListener(type, freeze, { capture: true }));
    }
  }, [alert]);
  const setScrim = useCallback((node: HTMLDivElement | null) => {
    if (node) lastScrim.current = node;
  }, []);
  // Si el padre desmonta el panel estando abierto, se anima la salida igual.
  useLayoutEffect(() => {
    mountedAt.current = performance.now();
    return () => {
      const content = lastContent.current;
      if (!content || content.getAttribute("data-state") !== "open") return; // ya cerró con su propia animación
      if (performance.now() - mountedAt.current < 250) return; // doble montaje de StrictMode en desarrollo
      ghostOut(content, lastScrim.current);
    };
  }, []);
  // Control que tenía el foco al abrir. Radix solo devuelve el foco a su
  // propio `Trigger`; los paneles controlados (abiertos con `open`) lo
  // perdían al cerrar y el teclado volvía al inicio de la página.
  const returnFocus = useRef<HTMLElement | null>(null);
  const resolvedSize = size ?? (extraWide ? "xl" : wide ? "lg" : "md");
  // Siempre controlado hacia Radix: así se puede frenar el cierre para preguntar.
  const controlled = open !== undefined;
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = controlled ? open : innerOpen;
  const [askDiscard, setAskDiscard] = useState(false);
  const baseline = useRef<string | null>(null);
  const latest = useRef<string | null>(null);
  const frozen = useRef(false);

  const apply = (next: boolean) => {
    if (!controlled) setInnerOpen(next);
    onOpenChange?.(next);
  };
  const isDirty = () => {
    const node = contentRef.current;
    return !!node && frozen.current && baseline.current !== null && formSnapshot(node) !== baseline.current;
  };
  const handleOpenChange = (next: boolean) => {
    if (!next && busy) return;
    if (!next && unsavedGuard && isDirty()) {
      setAskDiscard(true);
      return;
    }
    apply(next);
  };
  const drag = useRef<{ y0: number; dy: number; lastY: number; lastT: number } | null>(null);

  function onPointerDown(event: React.PointerEvent) {
    if (event.button > 0 || busy || window.innerWidth >= 768) return;
    if ((event.target as Element).closest("button")) return;
    const el = contentRef.current;
    if (!el) return;
    drag.current = { y0: event.clientY, dy: 0, lastY: event.clientY, lastT: performance.now() };
    el.style.animation = "none";
    el.style.transition = "none";
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    const state = drag.current;
    const el = contentRef.current;
    if (!state || !el) return;
    state.dy = event.clientY - state.y0;
    const offset = state.dy < 0 ? state.dy * 0.18 : state.dy;
    el.style.transform = `translateY(${offset}px)`;
    state.lastY = event.clientY;
    state.lastT = performance.now();
  }

  function onPointerUp(event: React.PointerEvent) {
    const state = drag.current;
    const el = contentRef.current;
    if (!state || !el) return;
    drag.current = null;
    const velocity = (event.clientY - state.lastY) / Math.max(1, performance.now() - state.lastT);
    if (state.dy > 110 || (state.dy > 30 && velocity > 0.45)) {
      el.style.animation = "";
      handleOpenChange(false);
      return;
    }
    el.style.transition = "transform 480ms cubic-bezier(.32,1.35,.5,1)";
    el.style.transform = "translateY(0)";
    window.setTimeout(() => {
      el.style.transition = "";
      el.style.transform = "";
      el.style.animation = "";
    }, 500);
  }

  const dragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay ref={setScrim} className={cn(styles.scrim, alert && styles.scrimAlert)} />
        <DialogPrimitive.Content
          ref={setContent}
          {...(description ? {} : { "aria-describedby": undefined })}
          aria-busy={busy || undefined}
          data-size={resolvedSize}
          data-variant={drawer ? "drawer" : "dialog"}
          onOpenAutoFocus={(event) => {
            // PC: al primer campo (o al marcado con data-autofocus). Móvil: al
            // panel, para no abrir el teclado sin que el usuario lo pida.
            const content = contentRef.current;
            if (!content) return;
            const previous = document.activeElement;
            returnFocus.current = previous instanceof HTMLElement && !content.contains(previous) ? previous : null;
            event.preventDefault();
            const field =
              window.innerWidth >= 768
                ? content.querySelector<HTMLElement>("[data-autofocus], input:not([type=hidden]), select, textarea")
                : null;
            (field ?? content).focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            if (trigger) return; // Radix ya enfoca su Trigger.
            event.preventDefault();
            const target = returnFocus.current;
            returnFocus.current = null;
            if (target?.isConnected) target.focus({ preventScroll: true });
          }}
          className={cn(
            styles.sheet,
            alert && styles.alert,
            drawer && styles.drawer,
            !drawer && resolvedSize === "sm" && styles.narrow,
            !drawer && resolvedSize === "lg" && styles.wide,
            !drawer && resolvedSize === "xl" && styles.extraWide,
            !drawer && resolvedSize === "full" && styles.full,
            drawer && resolvedSize !== "md" && styles.drawerWide,
            className,
          )}
        >
          <div className={styles.grab} aria-hidden="true" {...dragHandlers}>
            <i />
          </div>
          <header className={styles.head} {...dragHandlers}>
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-lg font-semibold text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-[13px] text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              disabled={busy}
              className="grid size-10 shrink-0 place-items-center rounded-md text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X aria-hidden="true" className="size-[18px]" />
            </DialogPrimitive.Close>
          </header>
          <div className={styles.body}>{children}</div>
          {footer ? <footer className={styles.foot}>{footer}</footer> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
      {askDiscard ? (
        <ResponsiveSheet
          open
          alert
          onOpenChange={(next) => !next && setAskDiscard(false)}
          unsavedGuard={false}
          size="sm"
          title="¿Guardar los cambios?"
          description="Escribiste datos que todavía no se guardaron."
          footer={
            <>
              <Button variant="outline" onClick={() => setAskDiscard(false)}>
                Seguir editando
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  // Primero se va el aviso (rápido); enseguida el panel sale con su animación.
                  setAskDiscard(false);
                  window.setTimeout(() => apply(false), 110);
                }}
              >
                Descartar
              </Button>
              <Button
                data-autofocus=""
                onClick={() => {
                  setAskDiscard(false);
                  saveFromPrompt(contentRef.current);
                }}
              >
                Guardar
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Si sales ahora, lo que escribiste se pierde. Puedes guardarlo, descartarlo o volver a editarlo.
          </p>
        </ResponsiveSheet>
      ) : null}
    </DialogPrimitive.Root>
  );
}

/** Cierra el panel desde un botón del pie ("Cancelar"). */
export const SheetCloseButton = DialogPrimitive.Close;
