export type KeypadKey = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "000" | "0" | "back";

/** Aplica una tecla del teclado de cobro a una cifra entera (tope 99.999.999). */
export function applyKey(value: number, key: KeypadKey, max = 99_999_999): number {
  if (key === "back") return Math.floor(value / 10);
  const next = key === "000" ? value * 1000 : value * 10 + Number(key);
  return Math.min(max, next);
}
