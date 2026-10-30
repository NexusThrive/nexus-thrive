"use client";

import { usePathname } from "next/navigation";
import { PageSkeleton } from "@/components/organisms/page-skeleton";

/**
 * Precarga de Clientes (sin la intro de la N). Esta también cubre la ficha
 * (`/crm/[id]`) mientras la precarga propia de la ficha no ha llegado: según la
 * ruta se pinta la forma de la lista o la de la ficha, así al abrir una ficha
 * se ve un solo esqueleto y no dos distintos seguidos.
 */
export default function Loading() {
  const profile = /\/crm\/[^/]+/.test(usePathname() ?? "");
  return profile ? (
    <PageSkeleton variant="profile" label="Cargando ficha" />
  ) : (
    <PageSkeleton variant="table" label="Cargando clientes" kpis={false} />
  );
}
