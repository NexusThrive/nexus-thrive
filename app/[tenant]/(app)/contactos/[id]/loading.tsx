import { PageSkeleton } from "@/components/organisms/page-skeleton";

/** Precarga de la ficha: la misma forma de la vista de registro (sin la intro de la N). */
export default function Loading() {
  return <PageSkeleton variant="record" label="Cargando ficha" />;
}
