/**
 * NÚCLEO — gate de acceso a módulos.
 *
 * ESTE ARCHIVO ES EL ÚNICO que consulta si una organización tiene un módulo
 * habilitado. Antes había cuatro copias del mismo chequeo:
 *   - `requiere-modulo.ts`   (este, el canónico)
 *   - `caja-menor/acciones.ts`   `requireModuloCajaMenor`
 *   - `caja-menor/datos.ts`       `cajamenorHabilitado`
 *   - `plantillas/gym/dashboard.ts` `gymHabilitado`
 * Las tres últimas quedaron como envolturas DELEGADAS aquí: conservan sus
 * nombres porque las páginas y los actions las usan, pero la decisión vive
 * en un solo lado. Si el criterio de "tiene el módulo" cambia, cambia acá.
 *
 * Un slug puede ser:
 *   1) un MÓDULO del catálogo (`Module`)  → exige ESE módulo activo;
 *   2) un alias de PLANTILLA (`Plantilla`) → habilita si ALGÚN módulo
 *      miembro está ACTIVO (la plantilla se activa junta).
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/core/prisma";
import { requiereSesion, getOrgActiva } from "@/lib/core/org";

/**
 * ¿Tiene la organización `orgId` el módulo `slug` habilitado?
 *
 * Es la decisión pura, sin sesión ni redirect: la usan los data loaders y los
 * layouts para decidir si pintan la sección o el estado vacío.
 */
export async function moduloActivoEnOrg(slug: string, orgId: string): Promise<boolean> {
  // 1) Slug de módulo real (Module) — el caso normal.
  const modulo = await prisma.module.findUnique({ where: { slug }, select: { id: true } });
  if (modulo) {
    const om = await prisma.organizationModule.findUnique({
      where: { orgId_moduleId: { orgId, moduleId: modulo.id } },
      select: { estado: true },
    });
    if (om?.estado === "ACTIVO") return true;
    // Un módulo real que existe pero NO está activo no cae al caso de
    // plantilla: "caja-menor" es un módulo, y si está enSolicitado no se
    // entra (que en la práctica da igual, pero deja la regla explícita).
    return false;
  }

  // 2) Slug de plantilla (ej: "gym") — habilita si ALGÚN módulo miembro ACTIVO.
  const plantilla = await prisma.plantilla.findUnique({
    where: { slug },
    select: { modulos: { select: { moduleId: true } } },
  });
  if (!plantilla || plantilla.modulos.length === 0) return false;

  const activo = await prisma.organizationModule.findFirst({
    where: {
      orgId,
      estado: "ACTIVO",
      moduleId: { in: plantilla.modulos.map((pm) => pm.moduleId) },
    },
    select: { id: true },
    take: 1,
  });
  return activo !== null;
}

/**
 * Guard de escritura/lectura protegida: exige sesión, org activa y el módulo
 * ACTIVO. Si algo falta, redirige (no devuelve, no lanza).
 */
export async function requiereModuloActivo(slug: string) {
  const { email } = await requiereSesion();
  const { org } = await getOrgActiva();

  if (await moduloActivoEnOrg(slug, org.id)) return { email, orgId: org.id };

  redirect("/");
}
