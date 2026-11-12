import { NMark } from "@/components/atoms/n-mark";
import { cn } from "@/lib/utils";

/**
 * Espera de una sección o panel (no de la página entera: para eso
 * `PageSkeleton`, que conserva la forma de lo que viene). La N de marca con
 * el trazo en bucle y el texto visible de qué se está cargando; se anuncia
 * una vez a lectores de pantalla (`role="status"`). Con movimiento reducido
 * la N queda quieta y el texto sigue diciendo qué pasa.
 */
export function LoadingState({
  label = "Cargando…",
  inline = false,
  className,
}: {
  /** Qué se carga, en concreto: "Cargando clientes…". */
  label?: string;
  /** En línea (dentro de una fila o botón) en vez de un bloque centrado. */
  inline?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2.5 text-ui text-muted-foreground",
        inline ? "inline-flex" : "justify-center px-6 py-12",
        className,
      )}
    >
      {inline ? (
        <NMark size={16} state="loop" />
      ) : (
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-muted">
          <NMark size={24} state="loop" />
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}
