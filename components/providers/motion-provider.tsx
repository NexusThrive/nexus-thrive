"use client";

import { useEffect } from "react";
import { motionOff, spring } from "@/lib/motion";

/** Elementos que se hunden al presionarlos y vuelven con un resorte. */
const PRESS_SELECTOR = "[data-press], .nx-press";
const CARD_PRESS = 0.985;
const CONTROL_PRESS = 0.94;

/**
 * Instala una sola vez los efectos de puntero de toda la app con listeners
 * delegados en `document` (sin un listener por elemento):
 *
 * - `data-press`: el elemento se hunde al presionarlo y vuelve con resorte.
 *   `data-press="card"` usa una escala más sutil para tarjetas.
 * - `.nx-spot`: foco de luz oro que sigue al puntero (solo puntero fino).
 * - `data-mag`: el botón se deja atraer un poco por el cursor.
 *
 * No renderiza nada. Va una vez en la raíz (TenantShell, auth, precios).
 */
export function MotionProvider() {
  useEffect(() => {
    const pressed = new Set<HTMLElement>();

    function scaleFor(el: HTMLElement) {
      return el.dataset.press === "card" ? CARD_PRESS : CONTROL_PRESS;
    }

    function onDown(event: PointerEvent) {
      const target = (event.target as Element | null)?.closest<HTMLElement>(PRESS_SELECTOR);
      if (!target || (target as HTMLButtonElement).disabled || motionOff()) return;
      pressed.add(target);
      target.style.transition = "transform 90ms var(--nx-ease-out)";
      target.style.transform = `scale(${scaleFor(target)})`;
    }

    function onUp() {
      for (const el of pressed) {
        const from = scaleFor(el);
        el.style.transform = "";
        el.style.transition = "";
        spring(el, "scale", from, 1, { stiffness: 520, damping: 14 });
      }
      pressed.clear();
    }

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function onMove(event: PointerEvent) {
      const target = event.target as Element | null;
      const spot = target?.closest<HTMLElement>(".nx-spot");
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${event.clientX - r.left}px`);
        spot.style.setProperty("--my", `${event.clientY - r.top}px`);
      }
      const magnet = target?.closest<HTMLElement>("[data-mag]");
      if (magnet && !motionOff()) {
        const r = magnet.getBoundingClientRect();
        const dx = event.clientX - (r.left + r.width / 2);
        const dy = event.clientY - (r.top + r.height / 2);
        magnet.style.transition = "translate 120ms ease-out";
        magnet.style.translate = `${(dx * 0.22).toFixed(1)}px ${(dy * 0.3).toFixed(1)}px`;
      }
    }

    function onOut(event: PointerEvent) {
      const magnet = (event.target as Element | null)?.closest<HTMLElement>("[data-mag]");
      if (magnet && !magnet.contains(event.relatedTarget as Node | null)) {
        magnet.style.transition = "translate 620ms var(--nx-ease-bounce)";
        magnet.style.translate = "0px 0px";
      }
    }

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    if (fine) {
      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerout", onOut);
    }
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  return null;
}
