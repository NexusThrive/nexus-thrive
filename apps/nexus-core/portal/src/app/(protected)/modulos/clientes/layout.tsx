import { GuardModulo } from "@/components/core/GuardModulo";

export const dynamic = "force-dynamic";

/**
 * MÓDULO CLIENTES — solo se entra si la org lo tiene ACTIVO.
 * `clientes` es un CAPA: lo puede activar cualquier negocio, no solo un gym.
 */
export default async function ClientesLayout({ children }: { children: React.ReactNode }) {
  return <GuardModulo slug="clientes">{children}</GuardModulo>;
}
