import { EASE_IN_OUT } from "./easing";
import { motionOff } from "./reduced";

/**
 * Cambia el tema con un barrido diagonal a 24° (el corte de la N) usando
 * View Transitions. Sin soporte o con movimiento reducido, cambia directo.
 */
export function withThemeSweep(apply: () => void): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void> };
  };
  if (!doc.startViewTransition || motionOff()) {
    apply();
    return;
  }
  const W = window.innerWidth;
  const H = window.innerHeight;
  const off = Math.tan((24 * Math.PI) / 180) * H;
  const transition = doc.startViewTransition(apply);
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `polygon(0 0,0px 0,${-off}px 100%,0 100%)`,
            `polygon(0 0,${W + off}px 0,${W}px 100%,0 100%)`,
          ],
        },
        {
          duration: 720,
          easing: EASE_IN_OUT,
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
}
