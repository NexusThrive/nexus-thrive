/**
 * Fondo de cuadrícula de Nexus (el mismo del 404, sin el haz animado: sin movimiento decorativo continuo).
 * Es decorativo: `aria-hidden`, no captura el puntero y se apoya en los tokens de borde.
 */
export function GridBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 ${className ?? ""}`}
      style={{
        backgroundImage: "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, #000 20%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, #000 20%, transparent 80%)",
        opacity: 0.7,
      }}
    />
  );
}
