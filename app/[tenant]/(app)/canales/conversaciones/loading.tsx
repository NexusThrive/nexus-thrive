import { PageSkeleton } from "@/components/organisms/page-skeleton";

export default function Loading() {
  return <PageSkeleton variant="table" label="Cargando conversaciones" kpis={false} />;
}
