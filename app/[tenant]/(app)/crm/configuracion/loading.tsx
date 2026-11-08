import { PageSkeleton } from "@/components/organisms/page-skeleton";

/** Precarga de la configuración del CRM. */
export default function Loading() {
  return <PageSkeleton variant="form" label="Cargando la configuración" kpis={false} />;
}
