import { qrSvgPath } from "@/lib/qr";
import { cn } from "@/lib/utils";

/**
 * Código QR en SVG (sin dependencias): siempre negro sobre blanco, también en
 * modo oscuro, para que cualquier lector lo lea.
 */
export function QrCode({ value, size = 160, label, className }: { value: string; size?: number; label?: string; className?: string }) {
  const { path, size: n } = qrSvgPath(value);
  return (
    <svg
      role="img"
      aria-label={label ?? `Código QR: ${value}`}
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={cn("rounded-md bg-white", className)}
    >
      <rect width={n} height={n} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
