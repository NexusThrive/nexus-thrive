import { cn } from "@/lib/utils";
import { BrandLogo } from "@nexus/brand/BrandLogo";

/**
 * Marca NEXUS THRIVE — logo oficial (N + THRIVE) del paquete @nexus/brand.
 * Usa `currentColor`: se tiñe con `className` (`text-ink` sobre Paper,
 * `text-paper` sobre Ink, `text-sidebar-fg` sobre la superficie Sidebar).
 * No recolorear la N en oro ni añadir sombras.
 */

export function LogoMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <BrandLogo
      variant="mark"
      size={size}
      title="NEXUS THRIVE"
      className={cn("shrink-0", className)}
    />
  );
}

export function Brand({
  className,
  tone = "on-paper",
  size = 80,
  showMark = true,
}: {
  className?: string;
  tone?: "on-ink" | "on-paper" | "on-sidebar";
  size?: number;
  showMark?: boolean;
}) {
  const toneClass =
    tone === "on-ink"
      ? "text-paper"
      : tone === "on-sidebar"
        ? "text-sidebar-fg"
        : "text-ink";
  return (
    <span className={cn("inline-flex items-center", className)}>
      <BrandLogo
        variant={showMark ? "lockup" : "mark"}
        size={size}
        title="NEXUS THRIVE"
        className={cn("shrink-0", toneClass)}
      />
    </span>
  );
}
