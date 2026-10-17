import { BrandLogo } from "@nexus/brand/BrandLogo";
import { cn } from "@/lib/utils";

/**
 * Firma horizontal: la N + "NEXUS THRIVE" en Montserrat 700 con tracking
 * amplio (único lugar con mayúsculas espaciadas, como THRIVE en el logo).
 * Para cabeceras de páginas públicas (acceso, precios).
 */
export function Wordmark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <BrandLogo variant="mark" size={size} className="shrink-0 text-primary" />
      <span className="font-display text-[12.5px] font-bold uppercase tracking-[0.32em]">Nexus Thrive</span>
    </span>
  );
}
