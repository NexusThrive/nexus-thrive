"use client";

import { usePathname } from "next/navigation";
import { PageSkeleton } from "@/components/organisms/page-skeleton";

/**
 * Precarga de Clientes (sin la intro de la N). También cubre la ficha y el alta (`/contactos/[id]`, `/contactos/nuevo`) mientras su
 * precarga propia no ha llegado: según la ruta se pinta la lista o el registro, así se ve un solo esqueleto y no dos seguidos.
 */
export default function Loading() {
  const record = /\/contactos\/[^/]+/.test(usePathname() ?? "");
  return record ? <PageSkeleton variant="record" label="Cargando cliente" /> : <PageSkeleton variant="list" label="Cargando clientes" />;
}
