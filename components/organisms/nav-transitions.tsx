"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motionOff } from "@/lib/experience/motion/index";

const MOBILE = "(max-width: 767px)";
const DURATION = 400;
/** Curva de los empujes de iOS: arranque rápido y frenada larga. */
const IOS = "cubic-bezier(.32,.72,0,1)";

/** Inicio del negocio: `/{negocio}` sin nada más. */
const isHome = (path: string) => path.split("/").filter(Boolean).length <= 1;

/** Contador de entradas del historial: cada una guarda su número en `history.state` para saber si un `popstate` va atrás o adelante. */
const INDEX_KEY = "nx:nav-index";

type Snapshot = { dir: "forward" | "back"; node: HTMLElement; rect: DOMRect; at: number };

/**
 * Cambio de sección en móvil, como el empuje de iOS: al ir a otra sección la vista nueva entra desde el borde derecho
 * y se superpone a la anterior, que se corre un poco a la izquierda y se oscurece; al retroceder pasa lo contrario:
 * la vista de la que sales se va hacia la derecha y deja ver debajo la anterior, que vuelve a su sitio. La barra
 * superior y la inferior no se mueven. Solo bajo 768 px y sin movimiento reducido.
 *
 * Cómo: al pulsar un enlace interno (adelante) o al volver (`popstate`) se copia la vista actual (`#contenido`); cuando
 * cambia la ruta, la copia queda debajo de la vista nueva (adelante) o encima de la que aparece (atrás). La copia es solo
 * imagen: sin ids, inerte y oculta a lectores de pantalla, y se quita al terminar.
 */
export function NavTransitions() {
  const pathname = usePathname();
  const pending = useRef<Snapshot | null>(null);
  const last = useRef(pathname);
  const index = useRef(0);

  /** Marca la entrada actual del historial con su número (si aún no lo tiene) y lo recuerda. */
  const markEntry = () => {
    const state = (window.history.state ?? {}) as Record<string, unknown>;
    if (typeof state.nxIndex === "number") {
      index.current = state.nxIndex;
      return;
    }
    let next = 1;
    try {
      next = (Number(window.sessionStorage.getItem(INDEX_KEY)) || 0) + 1;
      window.sessionStorage.setItem(INDEX_KEY, String(next));
    } catch {
      /* sin almacenamiento: el contador vale para esta carga */
    }
    index.current = next;
    window.history.replaceState({ ...state, nxIndex: next }, "", window.location.href);
  };

  useEffect(() => {
    const mobile = () => window.matchMedia(MOBILE).matches && !motionOff();
    const snapshot = (dir: Snapshot["dir"]) => {
      if (!mobile()) return;
      const view = document.getElementById("contenido");
      if (!view) return;
      const node = view.cloneNode(true) as HTMLElement;
      node.removeAttribute("id");
      node.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      node.setAttribute("inert", "");
      node.setAttribute("aria-hidden", "true");
      pending.current = { dir, node, rect: view.getBoundingClientRect(), at: Date.now() };
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      // Inicio es la raíz: salir de él es avanzar (la sección nueva se pone encima) y volver a él es retroceder
      // (Inicio queda debajo y la sección que dejas se va por encima).
      snapshot(isHome(url.pathname) && !isHome(window.location.pathname) ? "back" : "forward");
    };
    // Atrás o adelante del navegador: si la entrada de destino tiene un número mayor, es adelante.
    const onPop = (event: PopStateEvent) => {
      const target = typeof event.state?.nxIndex === "number" ? (event.state.nxIndex as number) : null;
      snapshot(target !== null && target > index.current ? "forward" : "back");
      if (target !== null) index.current = target;
    };
    markEntry();
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop, true);
    };
  }, []);

  // Antes de pintar la ruta nueva: la copia sale (atrás) o la vista real entra (adelante).
  useLayoutEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    markEntry();
    const snap = pending.current;
    pending.current = null;
    const view = document.getElementById("contenido");
    if (!view || !window.matchMedia(MOBILE).matches || motionOff()) return;
    const dir = snap && Date.now() - snap.at < 6000 ? snap.dir : "forward";
    const root = document.documentElement;
    root.style.overflowX = "clip";

    // La copia de la vista anterior, fija bajo la barra superior (puesta junto a la vista para compartir su capa).
    let wrap: HTMLElement | null = null;
    if (snap) {
      wrap = document.createElement("div");
      Object.assign(wrap.style, {
        position: "fixed",
        left: "0",
        right: "0",
        bottom: "0",
        top: "calc(var(--topbar-height) + env(safe-area-inset-top, 0px))",
        overflow: "hidden",
        pointerEvents: "none",
        background: "var(--background)",
        // Adelante la anterior queda debajo de la nueva; atrás, encima de la que aparece.
        zIndex: dir === "forward" ? "var(--z-raised)" : "var(--z-sticky)",
      });
      view.parentElement?.appendChild(wrap);
      const top = wrap.getBoundingClientRect().top;
      Object.assign(snap.node.style, { position: "absolute", left: `${snap.rect.left}px`, top: `${snap.rect.top - top}px`, width: `${snap.rect.width}px` });
      wrap.appendChild(snap.node);
    }

    const options = { duration: DURATION, easing: IOS } as const;
    const finished: Promise<unknown>[] = [];
    if (dir === "forward") {
      // Empuje: la vista nueva entra desde la derecha por encima; la anterior se corre hacia la izquierda y se oscurece.
      Object.assign(view.style, { position: "relative", zIndex: "var(--z-sticky)", backgroundColor: "var(--background)" });
      finished.push(
        view.animate(
          [
            { transform: "translateX(100%)", boxShadow: "-16px 0 32px rgba(0,0,0,.18)" },
            { transform: "translateX(0)", boxShadow: "-16px 0 32px rgba(0,0,0,0)" },
          ],
          options,
        ).finished,
      );
      if (wrap) finished.push(wrap.animate([{ transform: "translateX(0)", filter: "brightness(1)" }, { transform: "translateX(-28%)", filter: "brightness(.88)" }], { ...options, fill: "forwards" }).finished);
    } else {
      // Atrás, al revés: la vista que dejas se va hacia la derecha y deja ver la anterior, que vuelve a su sitio y se aclara.
      finished.push(view.animate([{ transform: "translateX(-28%)", filter: "brightness(.88)" }, { transform: "translateX(0)", filter: "brightness(1)" }], options).finished);
      if (wrap) {
        wrap.style.boxShadow = "-16px 0 32px rgba(0,0,0,.18)";
        finished.push(wrap.animate([{ transform: "translateX(0)" }, { transform: "translateX(100%)" }], { ...options, fill: "forwards" }).finished);
      }
    }
    const cleanup = () => {
      wrap?.remove();
      root.style.overflowX = "";
      Object.assign(view.style, { position: "", zIndex: "", backgroundColor: "" });
    };
    Promise.all(finished).then(cleanup, cleanup);
  }, [pathname]);

  return null;
}
