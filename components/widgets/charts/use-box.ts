"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Mide el ancho y el alto reales de un contenedor (los gráficos rellenan su bloque al redimensionarlo). */
export function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setBox({ w: Math.floor(el.clientWidth), h: Math.floor(el.clientHeight) });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, box] as const;
}
