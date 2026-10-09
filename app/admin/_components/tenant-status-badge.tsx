import { cn } from "@/lib/cn";

/**
 * Badge del estado global del negocio: `Activo` responde vía subdominio;
 * `Suspendido` no (proxy rechaza el host) y oculta su app en el host base.
 */
export default function TenantStatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        active
          ? "bg-success/10 text-success ring-success/20"
          : "bg-destructive/10 text-destructive ring-destructive/20",
      )}
    >
      {active ? "Activo" : "Suspendido"}
    </span>
  );
}
