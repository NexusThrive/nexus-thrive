"use client";

import { useEffect } from "react";

/**
 * Teclado en pantalla (móvil): en iOS el teclado no achica la página, tapa lo de abajo. Mide cuánto tapa
 * (`visualViewport`) y lo publica como `--kb` en <html> (y `data-keyboard` mientras está abierto) para que las hojas
 * inferiores suban sobre el teclado en vez de quedar detrás. También deja a la vista el campo que se está escribiendo.
 * En Android (`interactive-widget=resizes-content`) el navegador ya reajusta la página y `--kb` queda en 0.
 */
export function KeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const inset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
        const open = inset > 80;
        root.style.setProperty("--kb", open ? `${inset}px` : "0px");
        if (open) {
          root.setAttribute("data-keyboard", "");
          const field = document.activeElement;
          if (field instanceof HTMLElement && field.matches("input, textarea, [contenteditable]")) field.scrollIntoView({ block: "center", behavior: "smooth" });
        } else {
          root.removeAttribute("data-keyboard");
        }
      });
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--kb");
      root.removeAttribute("data-keyboard");
    };
  }, []);
  return null;
}
