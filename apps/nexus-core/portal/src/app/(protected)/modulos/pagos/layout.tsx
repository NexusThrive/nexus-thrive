import { GuardModulo } from "@/components/core/GuardModulo";

export const dynamic = "force-dynamic";

/** MÓDULO PAGOS — solo se entra si la org lo tiene ACTIVO. */
export default async function PagosLayout({ children }: { children: React.ReactNode }) {
  return <GuardModulo slug="pagos">{children}</GuardModulo>;
}
