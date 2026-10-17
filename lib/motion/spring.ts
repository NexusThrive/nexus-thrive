import { motionOff } from "./reduced";

export type SpringOptions = {
  stiffness?: number;
  damping?: number;
  mass?: number;
};

type SpringProp = "scale" | "x" | "y" | "rotate";

/**
 * Simula un resorte a 60 fps y devuelve las posiciones. Se precalcula y se
 * reproduce con la Web Animations API (en el compositor), así que no hay
 * trabajo por cuadro en JS ni librerías de animación.
 */
export function springFrames(
  from: number,
  to: number,
  { stiffness = 420, damping = 16, mass = 1 }: SpringOptions = {},
): number[] {
  const dt = 1 / 60;
  let x = from;
  let v = 0;
  const out = [x];
  for (let i = 0; i < 150; i++) {
    const force = -stiffness * (x - to) - damping * v;
    v += (force / mass) * dt;
    x += v * dt;
    out.push(x);
    if (Math.abs(x - to) < 0.0008 && Math.abs(v) < 0.01) break;
  }
  out.push(to);
  return out;
}

function toTransform(prop: SpringProp, value: number): string {
  switch (prop) {
    case "scale":
      return `scale(${value})`;
    case "x":
      return `translateX(${value}px)`;
    case "y":
      return `translateY(${value}px)`;
    case "rotate":
      return `rotate(${value}deg)`;
  }
}

/**
 * Anima `transform` de `el` con un resorte, p. ej. `spring(el, "scale", .94, 1)`
 * al soltar un botón o `spring(input, "x", -10, 0)` para sacudir un error.
 */
export function spring(
  el: Element | null | undefined,
  prop: SpringProp,
  from: number,
  to: number,
  options?: SpringOptions,
): Animation | null {
  if (!el || motionOff() || !("animate" in el)) return null;
  const frames = springFrames(from, to, options);
  return el.animate(
    frames.map((v) => ({ transform: toTransform(prop, v) })),
    { duration: (frames.length * 1000) / 60, easing: "linear" },
  );
}

/** Sacudida de error (campo inválido, código incorrecto). */
export function shake(el: Element | null | undefined): void {
  spring(el, "x", -10, 0, { stiffness: 700, damping: 9 });
}
