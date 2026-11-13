"use client";

import { useEffect, useRef } from "react";

/**
 * Constante de tiempo (ms) de cada uno de los dos filtros en cascada. Con 110 ms un giro se asienta en unos 0,65 s: lento y con cuerpo, pero
 * siempre alcanzable (no se queda atrás cuando se gira rápido).
 */
const TAU = 110;
/** Cuánto empuja cada paso de la rueda, frente a lo que pediría el navegador (1 = igual): con 1,5 un paso de 100 px recorre unos 150 px. */
const GAIN = 1.5;
/** Con trackpad (eventos finos y seguidos) no se amplifica: la distancia total es la que pide el gesto. */
const GAIN_FINE = 1;
/** Distancia pendiente máxima, en alturas de panel: una rueda girada con furia no deja una meta lejana. */
const MAX_AHEAD = 3;

/**
 * Desplazamiento suave para la rueda del mouse **y el trackpad**, en el panel que contiene este elemento (su padre). Cada evento de rueda
 * mueve una meta; la meta pasa por un filtro de primer orden y la posición del panel persigue a ese resultado con otro igual. Dos filtros
 * en cascada dan arranque y frenado suaves **sin sobrepasar nunca**, y la velocidad es siempre continua: invertir el sentido rápido, girar
 * muy rápido o recibir cientos de eventos finos del trackpad se redondea solo, sin temblor (el resorte de segundo orden que había antes
 * sobrepasaba y oscilaba). Se resuelve por tiempo, no por fotograma, con la posición en decimales. Sin librerías.
 *
 * Se atiende todo evento vertical. La pantalla táctil, el teclado, el zoom con Ctrl, lo horizontal y cualquier lista o tabla interior que
 * aún pueda desplazarse quedan con el navegador. Con movimiento reducido (sistema o `data-motion="off"`) no hace nada.
 */
export function SmoothScroll() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = marker.current?.parentElement;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pos = el.scrollTop; // dónde está el panel
    let mid = pos; // el filtro intermedio
    let target = pos; // adónde pidió llegar la persona
    let frame = 0;
    let last = 0;
    let written = pos; // lo último que se escribió (ya redondeado por el navegador): lo demás que cambie el panel es ajeno
    // Último desplazable interior consultado: evita recorrer los ancestros en cada evento (el trackpad dispara más de 100 por segundo).
    let probed: { node: EventTarget | null; dir: number; result: boolean } | null = null;

    const limit = () => Math.max(0, el.scrollHeight - el.clientHeight);
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      mid = pos = target = written = el.scrollTop;
    };
    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      // Si algo ajeno movió el panel (el anclaje de desplazamiento del navegador, un bloque que cambió de alto), se acepta ese corrimiento y se
      // sigue desde ahí: sobrescribirlo con la posición guardada era lo que hacía «saltar» el panel hacia atrás.
      const drift = el.scrollTop - written;
      if (Math.abs(drift) > 1.5) {
        pos += drift;
        mid += drift;
        target += drift;
      }
      const k = 1 - Math.exp(-dt / TAU);
      mid += (target - mid) * k;
      pos += (mid - pos) * k;
      const max = limit();
      if (pos < 0 || pos > max) {
        pos = Math.min(max, Math.max(0, pos));
        mid = target = pos;
      }
      const settled = Math.abs(target - pos) < 0.4 && Math.abs(mid - pos) < 0.4;
      if (settled) pos = mid = target;
      // A píxeles reales del dispositivo: el navegador redondea de todos modos, y si lo hace él cuadro a cuadro el redondeo oscila (temblor) y
      // el texto queda a medios píxeles (borroso). Alineado aquí, cada paso es un salto limpio.
      const dpr = window.devicePixelRatio || 1;
      el.scrollTo({ top: Math.round(pos * dpr) / dpr, behavior: "instant" });
      written = el.scrollTop;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };

    /** ¿Hay un desplazable interior que todavía puede moverse en esa dirección? Entonces la rueda es suya. */
    const innerCanScroll = (from: EventTarget | null, dy: number) => {
      const dir = Math.sign(dy);
      if (probed && probed.node === from && probed.dir === dir) return probed.result;
      let result = false;
      for (let node = from as HTMLElement | null; node && node !== el; node = node.parentElement) {
        const overflow = getComputedStyle(node).overflowY;
        if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight + 1) {
          const atTop = node.scrollTop <= 0;
          const atEnd = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
          if ((dy < 0 && !atTop) || (dy > 0 && !atEnd)) {
            result = true;
            break;
          }
        }
      }
      probed = { node: from, dir, result };
      return result;
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || event.defaultPrevented || reduced.matches || document.documentElement.dataset.motion === "off") return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.deltaY === 0) return;
      if (innerCanScroll(event.target, event.deltaY)) return;
      // Rueda con pasos (múltiplos de 120 o líneas) → empuja más; trackpad (muchos eventos finos) → distancia exacta.
      const legacy = (event as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
      const notched = event.deltaMode === 1 || (typeof legacy === "number" && legacy !== 0 && legacy % 120 === 0);
      if (!frame) {
        pos = mid = target = written = el.scrollTop;
      }
      const delta = (event.deltaMode === 1 ? event.deltaY * 40 : event.deltaY) * (notched ? GAIN : GAIN_FINE);
      const reach = el.clientHeight * MAX_AHEAD;
      const next = Math.min(limit(), Math.max(0, Math.max(pos - reach, Math.min(pos + reach, target + delta))));
      if (next === target && (next === 0 || next === limit())) return; // en el borde: que el gesto siga a lo de afuera
      event.preventDefault();
      target = next;
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    // Si la persona arrastra la barra, usa el teclado o salta a un ancla, la meta se alinea con donde quedó el panel.
    const onScroll = () => {
      if (!frame) pos = mid = target = written = el.scrollTop;
    };
    const onPointerDown = () => stop();

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return <span ref={marker} hidden />;
}
