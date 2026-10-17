import { EASE_OUT } from "./easing";
import { motionOff } from "./reduced";

/** Destello oro que se desvanece: un dato que acaba de cambiar. */
export function flash(el: Element | null | undefined): void {
  if (!el || motionOff()) return;
  el.animate(
    [
      { backgroundColor: "rgba(212,175,55,.32)" },
      { backgroundColor: "rgba(212,175,55,0)" },
    ],
    { duration: 1600, easing: "ease-out" },
  );
}

/** Dibuja un trazo SVG de principio a fin (sparklines, la N). */
export function drawPath(
  path: SVGPathElement | null | undefined,
  { duration = 1100, delay = 0 }: { duration?: number; delay?: number } = {},
): void {
  if (!path || motionOff() || !path.getTotalLength) return;
  const length = path.getTotalLength();
  path.style.strokeDasharray = String(length);
  path.style.strokeDashoffset = String(length);
  const animation = path.animate(
    [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
    { duration, delay, easing: EASE_OUT, fill: "forwards" },
  );
  animation.onfinish = () => {
    path.style.strokeDasharray = "";
    path.style.strokeDashoffset = "";
    animation.cancel();
  };
}

/**
 * Lluvia de cortes oro y tinta con el ángulo de la N (éxito importante:
 * pago registrado, plan mejorado). Las partículas siguen una parábola
 * precalculada; el contenedor se elimina solo.
 */
export function burst(x: number, y: number, count = 26): void {
  if (motionOff()) return;
  const host = document.createElement("div");
  host.className = "nx-burst";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("i");
    if (i % 5 === 0) piece.className = "k";
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    host.appendChild(piece);
    const angle = ((-90 + (Math.random() * 150 - 75)) * Math.PI) / 180;
    const speed = 300 + Math.random() * 360;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const spin = Math.random() * 540 - 270;
    const total = 1.15 + Math.random() * 0.35;
    const frames: Keyframe[] = [];
    for (let q = 0; q <= 8; q++) {
      const t = (total * q) / 8;
      frames.push({
        transform: `translate(${vx * t}px,${vy * t + 620 * t * t}px) skewX(-24deg) rotate(${(spin * q) / 8}deg)`,
        opacity: q > 5 ? 1 - (q - 5) / 3 : 1,
      });
    }
    piece.animate(frames, {
      duration: total * 1000,
      easing: "cubic-bezier(.2,.6,.4,1)",
      fill: "forwards",
    });
  }
  window.setTimeout(() => host.remove(), 1700);
}

/** Ráfaga centrada sobre un elemento. */
export function burstFrom(el: Element | null | undefined, count?: number): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, count);
}

/** Entrada escalonada: sube 14 px y se enfoca. */
export function reveal(
  elements: Iterable<Element>,
  { stagger = 45, delay = 0, y = 14, blur = 8 } = {},
): void {
  if (motionOff()) return;
  let i = 0;
  for (const el of elements) {
    el.animate(
      [
        { opacity: 0, transform: `translateY(${y}px)`, filter: `blur(${blur}px)` },
        { opacity: 1, transform: "none", filter: "blur(0)" },
      ],
      { duration: 700, delay: delay + i * stagger, easing: EASE_OUT, fill: "backwards" },
    );
    i++;
  }
}
