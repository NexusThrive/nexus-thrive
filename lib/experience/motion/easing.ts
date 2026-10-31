/** Curvas de la marca (las mismas que los tokens --nx-ease-*). */
export const EASE_OUT = "cubic-bezier(.16,1,.3,1)";
export const EASE_IN = "cubic-bezier(.7,0,.84,0)";
export const EASE_IN_OUT = "cubic-bezier(.65,0,.35,1)";
export const EASE_SPRING = "cubic-bezier(.34,1.3,.64,1)";

/** expo.out: arranca rápido y se asienta suave (contadores). */
export function expoOut(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Curva de aceleración cuártica que arranca y termina suave; recibe el avance `t` de 0 a 1 y devuelve el avance suavizado.
 */
export function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;
}
