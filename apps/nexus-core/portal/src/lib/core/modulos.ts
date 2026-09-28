/**
 * NÚCLEO — catálogo de módulos, plantillas y activación por organización.
 *
 * El módulo es el PRODUCTO (se construye una vez). La organización lo
 * ACTIVA cuando le sirve (OrganizationModule). La PLANTILLA es un
 * conjunto de módulos que resuelven un rubro completo — se activa JUNTA.
 * La SUGERENCIA sale del perfil del negocio (onboarding).
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

/** Navegación de la org: módulos ACTIVOS agrupados por PLANTILLA. */
export interface ModuloNavAgrupado {
  slug: string; // slug visible: plantilla (ej: gym) o módulo suelto (caja-menor)
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  /**
   * Dónde vive en el portal, LEÍDO DEL CATÁLOGO (`rutaBase`).
   * Antes vivía en un allowlist hardcodeado (`RUTA_POR_SLUG`) con un fallback
   * `/${slug}` que producía 404: por eso un CAPA suelto como caja-menor
   * redirigía a `/caja-menor` en vez de `/modulos/caja-menor`. Con el catálogo
   * como fuente, un módulo nuevo no puede nacer con un link roto.
   * null = el catálogo no define ruta (el link no se renderiza).
   */
  rutaBase: string | null;
}

/**
 * Módulos ACTIVOS para mostrar en sidebar/panel.
 * Los módulos miembro de una plantilla se agrupan en UNA entrada de la
 * plantilla (ej: clientes+planes+pagos+gastos → "Gym"); los CAPA sueltos
 * (caja-menor) se muestran individuales.
 */
export async function getModulosActivosAgrupados(orgId: string): Promise<ModuloNavAgrupado[]> {
  const activos = await getModulosActivos(orgId);
  if (activos.length === 0) return [];

  const enPlantilla = await prisma.plantillaModulo.findMany({
    include: { plantilla: true },
  });
  const plantillaPorModule = new Map<string, { slug: string; nombre: string; descripcion: string | null; icono: string | null; rutaBase: string | null }>();
  for (const pm of enPlantilla) {
    plantillaPorModule.set(pm.moduleId, {
      slug: pm.plantilla.slug,
      nombre: pm.plantilla.nombre,
      descripcion: pm.plantilla.descripcion,
      icono: pm.plantilla.icono,
      // Los miembros de una plantilla se navegan desde la base DE LA PLANTILLA.
      rutaBase: pm.plantilla.rutaBase,
    });
  }

  const resultado: ModuloNavAgrupado[] = [];
  const vistos = new Set<string>();
  for (const om of activos) {
    const plantilla = plantillaPorModule.get(om.moduleId);
    if (plantilla) {
      if (!vistos.has(plantilla.slug)) {
        vistos.add(plantilla.slug);
        resultado.push(plantilla);
      }
    } else {
      resultado.push({
        slug: om.module.slug,
        nombre: om.module.nombre,
        descripcion: om.module.descripcion,
        icono: om.module.icono,
        rutaBase: om.module.rutaBase,
      });
    }
  }
  return resultado;
}

/**
 * Base de ruta de un slug suelto, para cuando solo se tiene el slug y no se
 * quiere pagar el agrupado completo. Acepta el slug de una PLANTILLA o de un
 * MÓDULO (un miembro de plantilla hereda la base de su plantilla).
 *
 * Devuelve null si el catálogo no define ruta → quien llame decide (ocultar el
 * link). NUNCA cae a `/${slug}`: ese fallback fue la causa de los 404.
 */
export async function getRutaBase(slug: string): Promise<string | null> {
  const plantilla = await prisma.plantilla.findUnique({
    where: { slug },
    select: { rutaBase: true },
  });
  if (plantilla?.rutaBase) return plantilla.rutaBase;

  const modulo = await prisma.module.findUnique({
    where: { slug },
    select: { rutaBase: true, plantillas: { select: { plantilla: { select: { rutaBase: true } } } } },
  });
  if (!modulo) return null;
  const dePlantilla = modulo.plantillas[0]?.plantilla.rutaBase;
  return dePlantilla ?? modulo.rutaBase ?? null;
}

/**
 * Módulos sugeridos para el rubro de la org que todavía no están activos.
 * Se excluyen los módulos MIEMBROS de una plantilla: la plantilla se
 * activa completa (no tiene sentido sugerir clientes suelto, por ejemplo).
 */
export async function getModulosSugeridos(orgId: string, tipoNegocio?: string | null) {
  if (!tipoNegocio) return [];
  const activos = await getModulosActivos(orgId);
  const activosIds = new Set(activos.map((a) => a.moduleId));
  const enPlantilla = await prisma.plantillaModulo.findMany({
    select: { moduleId: true },
  });
  const enPlantillaIds = new Set(enPlantilla.map((pm) => pm.moduleId));
  const sugeridos = await prisma.module.findMany({
    where: { activo: true, sugeridoPara: { has: tipoNegocio } },
    orderBy: { orden: "asc" },
  });
  return sugeridos.filter((m) => !activosIds.has(m.id) && !enPlantillaIds.has(m.id));
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

/**
 * Al completar el onboarding con un rubro conocido:
 *   - si el rubro tiene PLANTILLA → se activan TODOS sus módulos juntos;
 *   - si no → se activa el módulo CAPA sugerido para el rubro.
 */
export async function activarModuloPorRubro(orgId: string, rubro: string): Promise<boolean> {
  const plantilla = await prisma.plantilla.findFirst({
    where: { activo: true, rubro },
    include: { modulos: { select: { moduleId: true } } },
  });
  if (plantilla && plantilla.modulos.length > 0) {
    let alguno = false;
    for (const pm of plantilla.modulos) {
      const ok = await activarModuloEnOrg(orgId, pm.moduleId, "ADMIN");
      if (ok) alguno = true;
    }
    return alguno;
  }

  const modulo = await prisma.module.findFirst({
    where: { activo: true, sugeridoPara: { has: rubro } },
    orderBy: { orden: "asc" },
  });
  if (modulo) return activarModuloEnOrg(orgId, modulo.id, "ADMIN");
  return false;
}