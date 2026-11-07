import { PageSkeleton } from "@/components/organisms/page-skeleton";

export default function Loading() {
  return <PageSkeleton variant="form" label="Cargando el formulario" kpis={false} />;
}
