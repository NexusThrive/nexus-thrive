"use client";

import { useParams, usePathname } from "next/navigation";
import { CachedAppHome } from "@/components/organisms/app-home";
import { PageSkeleton } from "@/components/organisms/page-skeleton";
import { routeSkeleton } from "@/lib/experience/navigation/route-skeleton";
import { tenantRelativePath } from "@/lib/experience/navigation/tenant-nav";

/**
 * Precarga de una pantalla del negocio (el `loading.tsx` de la raíz y de cada sección). El esqueleto sale de la ruta de destino
 * (`routeSkeleton`), no de la carpeta: la frontera de afuera y la de la sección pintan el mismo, así no se ven varios seguidos.
 * Inicio no muestra esqueleto si ya se vio: se pinta con su último estado (`CachedAppHome`).
 */
export function RouteLoading() {
  const params = useParams<{ tenant?: string }>();
  const { variant, label, kpis } = routeSkeleton(tenantRelativePath(usePathname(), params?.tenant ?? ""));
  const skeleton = <PageSkeleton variant={variant} label={label} kpis={kpis} />;
  // Inicio se precarga con lo último que se vio (y su cajón real: la app que se cierra vuelve a su icono); la primera vez, el esqueleto.
  return variant === "apps" ? <CachedAppHome fallback={skeleton} /> : skeleton;
}
