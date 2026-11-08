import { PageSkeleton } from "@/components/organisms/page-skeleton";

/** Precarga de los informes del CRM. */
export default function Loading() {
  return <PageSkeleton variant="dashboard" label="Cargando los informes" />;
}
