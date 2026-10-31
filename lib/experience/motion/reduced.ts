/**
 * El movimiento se apaga si el sistema pide reducirlo o si el usuario lo
 * desactivó en Ajustes (`<html data-motion="off">`). Toda animación por JS
 * consulta esto antes de empezar; las de CSS se apagan en motion.css.
 */
export function motionOff(): boolean {
  if (typeof window === "undefined") return true;
  return (
    document.documentElement.dataset.motion === "off" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
