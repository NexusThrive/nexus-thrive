"use client";

import { useEffect, useState } from "react";

/**
 * Escribe `text` letra a letra (como en la burbuja de AURI). Devuelve lo escrito hasta ahora y si todavía está escribiendo. Con movimiento
 * reducido el texto aparece completo. Al cambiar `text` vuelve a empezar.
 */
export function useTypedText(text: string, speedMs = 24): { typed: string; typing: boolean } {
  const [state, setState] = useState({ text, count: 0 });
  // Un texto nuevo reinicia la cuenta (se ajusta al renderizar, sin efecto).
  if (state.text !== text) setState({ text, count: 0 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const id = window.setTimeout(() => setState({ text, count: text.length }), 0);
      return () => window.clearTimeout(id);
    }
    let k = 0;
    const id = window.setInterval(() => {
      k += 1;
      setState((s) => (s.text === text ? { text, count: k } : s));
      if (k >= text.length) window.clearInterval(id);
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, speedMs]);

  return { typed: text.slice(0, state.count), typing: state.count < text.length };
}
