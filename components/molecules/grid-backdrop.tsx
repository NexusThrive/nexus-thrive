/**
 * Fondo de cuadrícula de Nexus (el mismo del 404, sin el haz animado: sin movimiento decorativo continuo).
 * Es decorativo: `aria-hidden`, no captura el puntero y se apoya en los tokens de borde.
 * `home` es la variante de Inicio: cuadros de 58 px más tenues que se desvanecen hacia los bordes desde el centro de la pantalla.
 */
const VARIANTS = {
  default: { size: "64px 64px", mask: "radial-gradient(ellipse 70% 60% at 50% 35%, #000 20%, transparent 80%)", opacity: 0.7 },
  home: { size: "58px 58px", mask: "radial-gradient(ellipse 70% 65% at 50% 45%, #000 20%, transparent 78%)", opacity: 0.55 },
} as const;

export function GridBackdrop({ className, variant = "default" }: { className?: string; variant?: keyof typeof VARIANTS }) {
  const v = VARIANTS[variant];
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 ${className ?? ""}`}
      style={{
        backgroundImage: "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
        backgroundSize: v.size,
        maskImage: v.mask,
        WebkitMaskImage: v.mask,
        opacity: v.opacity,
      }}
    />
  );
}
