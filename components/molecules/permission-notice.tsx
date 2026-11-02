import { Alert } from "@/components/molecules/alert";
import { accessMessage } from "@/lib/core/auth/roles";
import type { BusinessPermission } from "@/lib/core/auth/permissions";

/**
 * Aviso de «sin permiso» dentro de una pantalla (DR-10, DR-34): la función existe y está activa, pero este rol no la
 * usa. Dice qué no puede hacer, qué roles sí y cómo pedirlo. Los roles salen de la matriz de permisos, no del texto de
 * cada pantalla. Si el rol ni siquiera debe saber que la función existe, la página usa `notFound()` (ver `09` §4).
 */
export function PermissionNotice({ permission, action, className }: { permission: BusinessPermission; action: string; className?: string }) {
  const { title, detail } = accessMessage(permission, action);
  return (
    <Alert tone="info" title={title} className={className}>
      {detail}
    </Alert>
  );
}
