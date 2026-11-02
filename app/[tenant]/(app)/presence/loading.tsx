import { PageSkeleton } from "@/components/organisms/page-skeleton";

/** Precarga de la pantalla (DR-09): su forma mientras el servidor responde. */
export default function Loading() {
  return <PageSkeleton variant="table" label="Cargando presencia en línea" kpis={false} />;
}
