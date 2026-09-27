/**
 * NÚCLEO — catálogo de módulos y activación por organización.
 *
 * El módulo es el PRODUCTO (se construye una vez). La organización lo
 * ACTIVA cuando le sirve (OrganizationModule). La SUGERENCIA sale del
 * perfil del negocio (onboarding): Module.sugeridoPara contiene los
 * tipos de negocio para los que el módulo encaja.
 */
import { prisma } from "@/lib/core/prisma";

/** Módulos ACTIVOS de una org, ordenados por el catálogo. */
export async function getModulosActivos(orgId: string) {
  return prisma.organizationModule.findMany({
    where: { orgId, estado: "ACTIVO" },
    include: { module: true },
    orderBy: { module: { orden: "asc" } },
  });
}

/** Módulos sugeridos para el rubro de la org que todavía no están activos. */
export async function getModulosSugeridos(orgId: string, tipoNegocio?: string | null) {
  if (!tipoNegocio) return [];
  const activos = await getModulosActivos(orgId);
  const activosIds = new Set(activos.map((a) => a.moduleId));
  const sugeridos = await prisma.module.findMany({
    where: { activo: true, sugeridoPara: { has: tipoNegocio } },
    orderBy: { orden: "asc" },
  });
  return sugeridos.filter((m) => !activosIds.has(m.id));
}

/** Activa un módulo del catálogo en la org (si no estaba). */
export async function activarModuloEnOrg(orgId: string, moduleId: string, rol: string) {
  if (rol !== "ADMIN") return false;
  await prisma.organizationModule.upsert({
    where: { orgId_moduleId: { orgId, moduleId } },
    update: { estado: "ACTIVO", activadoAt: new Date() },
    create: { orgId, moduleId, estado: "ACTIVO", activadoAt: new Date() },
  });
  return true;
}

/** Al completar el onboarding con un rubro conocido, se activa su módulo base. */
export async function activarModuloPorRubro(orgId: string, rubro: string): Promise<boolean> {
  const modulo = await prisma.module.findFirst({
    where: { activo: true, sugeridoPara: { has: rubro } },
    orderBy: { orden: "asc" },
  });
  if (modulo) return activarModuloEnOrg(orgId, modulo.id, "ADMIN");
  return false;
}