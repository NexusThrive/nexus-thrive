import { RouteLoading } from "@/components/organisms/route-loading";
import { TenantShellSkeleton } from "@/components/templates/tenant-shell-skeleton";

/**
 * Mientras llega el layout del negocio (`(app)/layout.tsx`: negocio, módulos, miembro, primeros pasos), el sistema completo en esqueleto:
 * barra lateral, barra superior y el contenido de la ruta de destino. Sin pantalla en blanco ni la N. Cuando llega el shell real, el
 * `loading.tsx` de `(app)` sigue pintando solo el contenido, con el mismo esqueleto, y nada salta.
 */
export default function TenantLoading() {
  return (
    <TenantShellSkeleton>
      <RouteLoading />
    </TenantShellSkeleton>
  );
}
