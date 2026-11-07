"use client";

import { usePathname } from "next/navigation";
import { PageSkeleton } from "@/components/organisms/page-skeleton";

/**
 * Precarga mientras el servidor responde (sin la intro de la N). En la raíz del negocio es el cajón de aplicaciones; en las secciones que
 * no tienen precarga propia, la forma general de un tablero.
 */
export default function Loading() {
  const atRoot = /^\/[^/]+\/?$/.test(usePathname() ?? "");
  return atRoot ? <PageSkeleton variant="apps" label="Cargando aplicaciones" /> : <PageSkeleton variant="dashboard" label="Cargando" />;
}
