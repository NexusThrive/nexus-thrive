import { GuardModulo } from "@/components/core/GuardModulo";

export const dynamic = "force-dynamic";

/**
 * MÓDULO CAJA MENOR — solo se entra si la org lo tiene ACTIVO.
 * La navegación del módulo (Dashboard · Movimientos · Categorías) vive en
 * la NAVBAR (lib/navegacion.ts); el layout solo cuida el acceso.
 */
export default async function CajaMenorModuleLayout({ children }: { children: React.ReactNode }) {
  return <GuardModulo slug="caja-menor">{children}</GuardModulo>;
}
