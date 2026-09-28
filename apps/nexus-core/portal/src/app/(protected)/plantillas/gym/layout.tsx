import { requiereModuloActivo } from "@/lib/core/requiere-modulo";

export const dynamic = "force-dynamic";

/**
 * PLANTILLA GYM — solo se entra si la org tiene la plantilla ACTIVA.
 * El gate es el MISMO que usan las server actions y las otras rutas
 * (`lib/core/requiere-modulo.ts`): los layouts no consultan Prisma directo.
 * La navegación del módulo (Dashboard · Clientes · Pagos · Gastos) vive en la
 * NAVBAR (lib/navegacion.ts); el layout solo cuida el acceso.
 *
 * `requiereModuloActivo("gym")` acepta el slug de plantilla: habilita si ALGÚN
 * módulo miembro está ACTIVO (la plantilla se activa junta).
 */
export default async function GymModuleLayout({ children }: { children: React.ReactNode }) {
  await requiereModuloActivo("gym");
  return <div className="space-y-6">{children}</div>;
}