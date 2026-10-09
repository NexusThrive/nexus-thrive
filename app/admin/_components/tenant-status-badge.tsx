import { Badge, StatusDot } from "@/components/ui/badge";

/**
 * Badge del estado global del negocio: `Activo` responde vía subdominio;
 * `Suspendido` no (proxy rechaza el host) y oculta su app en el host base.
 * Punto cuadrado, no píldora de color.
 */
export default function TenantStatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <Badge variant="default">
      <StatusDot tone={active ? "success" : "danger"} />
      {active ? "Activo" : "Suspendido"}
    </Badge>
  );
}
