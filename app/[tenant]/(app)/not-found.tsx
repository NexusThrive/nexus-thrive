import { EmptyState } from "@/components/molecules/empty-state";

/**
 * No encontrado dentro del negocio (DR-09, DR-10): se muestra con el shell. Cubre
 * tanto una ruta inexistente como una función a la que el rol no tiene acceso:
 * para ese rol, la ruta no existe (no se revela qué hay en el negocio).
 */
export default function TenantNotFound() {
  return (
    <EmptyState mark="page" remember={false}
      headingLevel={2}
      title="No encontramos esta pantalla"
      description="Puede que haya cambiado de lugar, que la función esté apagada o que tu rol no la use. Usa el menú o la búsqueda para ir a otra parte."
    />
  );
}
