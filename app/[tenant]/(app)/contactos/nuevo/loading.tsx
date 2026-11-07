import { PageSkeleton } from "@/components/organisms/page-skeleton";

/** Precarga del alta: la misma forma de la vista de registro (sin la intro de la N). */
export default function Loading() {
  return <PageSkeleton variant="record" label="Cargando el formulario" />;
}
