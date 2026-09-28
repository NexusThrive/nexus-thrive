import { GuardModulo } from "@/components/core/GuardModulo";

export const dynamic = "force-dynamic";

/** MÓDULO GASTOS — solo se entra si la org lo tiene ACTIVO. */
export default async function GastosLayout({ children }: { children: React.ReactNode }) {
  return <GuardModulo slug="gastos">{children}</GuardModulo>;
}
