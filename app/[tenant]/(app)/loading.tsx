import { PageSkeleton } from "@/components/organisms/page-skeleton";

/** Precarga mientras el servidor responde (sin la intro de la N). */
export default function Loading() {
  return <PageSkeleton variant="dashboard" label="Cargando inicio" />;
}
