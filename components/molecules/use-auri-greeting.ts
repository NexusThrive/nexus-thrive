"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { useCurrentUserName } from "@/components/providers/current-user";

/** Cuánto hay que mantenerla presionada para que salude (menos que eso es un clic normal). */
const HOLD_MS = 450;
/** Cuánto se queda el saludo en pantalla después de soltar. */
const LINGER_MS = 1600;

/**
 * Mantener presionada la cara de AURI AI: pone cara de alegría y saluda con «Hola [nombre]!» en una burbuja que se escribe
 * letra a letra. Soltar antes de tiempo es un clic normal (abre el chat); si el saludo ya salió, el clic de soltar se descarta
 * para no abrir el chat por accidente. Devuelve lo que se le pasa al `EyeTracker` (`joy`, `say`) y lo que se le pone al botón.
 */
export function useAuriGreeting() {
  const name = useCurrentUserName();
  const [greeting, setGreeting] = useState<string | null>(null);
  const timer = useRef(0);
  const linger = useRef(0);
  const held = useRef(false);

  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
  }, []);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(linger.current);
    },
    [],
  );

  const start = useCallback(() => {
    held.current = false;
    window.clearTimeout(linger.current);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      held.current = true;
      setGreeting(name ? `Hola ${name}!` : "Hola!");
    }, HOLD_MS);
  }, [name]);

  const end = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!held.current) return;
    window.clearTimeout(linger.current);
    linger.current = window.setTimeout(() => setGreeting(null), LINGER_MS);
  }, []);

  return {
    joy: greeting !== null,
    say: greeting,
    /** Para el botón que envuelve la cara. */
    bind: {
      onPointerDown: (event: PointerEvent) => {
        if (event.button === 0 || event.pointerType === "touch") start();
      },
      onPointerUp: end,
      onPointerLeave: end,
      onPointerCancel: end,
      // En el celular, mantener presionado abriría el menú del sistema.
      onContextMenu: (event: MouseEvent) => event.preventDefault(),
      /** Si el saludo salió, el clic al soltar no abre nada. */
      onClick: (event: MouseEvent) => {
        clear();
        if (held.current) {
          held.current = false;
          event.preventDefault();
        }
      },
    },
  };
}
