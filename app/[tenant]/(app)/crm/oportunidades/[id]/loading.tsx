import { PageSkeleton } from "@/components/organisms/page-skeleton";

/** Precarga del detalle de la oportunidad: la forma de la vista de registro. */
export default function Loading() {
  return <PageSkeleton variant="record" label="Cargando la oportunidad" />;
}
