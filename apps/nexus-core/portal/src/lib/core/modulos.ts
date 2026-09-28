/**
 * NÚCLEO — catálogo de módulos, plantillas y activación por organización.
 *
 * El módulo es el PRODUCTO (se construye una vez). La organización lo
 * ACTIVA cuando le sirve (OrganizationModule). La PLANTILLA es un
 * conjunto de módulos que resuelven un rubro completo — se activa JUNTA.
 * La SUGERENCIA sale del perfil del negocio (onboarding).
 */
import { prisma } from "@/lib/core/prisma";
import { getSubpaginasModulo } from "@/lib/core/navegacion";

/** Una entrada navegable del sidebar. */
export interface SeccionModulo {
  href: string;
  label: string;
}

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
  /**
   * Sub-entradas del sidebar, también derivadas del catálogo: para una
   * plantilla, sus módulos miembros; para un módulo suelto, sus sub-páginas.
   * Antes las armaba `lib/core/navegacion.ts` con rutas fijas y claves que
   * nunca se usaban, y una org con `clientes` solo veía enlaces a Pagos y
   * Gastos que no tenía.
   */
  secciones: SeccionModulo[];
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
    where: { plantilla: { activo: true }, moduleId: { in: activos.map((a) => a.moduleId) } },
    include: { plantilla: true },
    orderBy: { orden: "asc" },
  });

  // Un módulo puede estar en más de una plantilla. El "último gana" del Map
  // no era determinista (el findMany no traía orden); ahora gana la primera
  // según el `orden` de la propia plantilla_modulos.
  const plantillaPorModule = new Map<string, { slug: string; nombre: string; descripcion: string | null; icono: string | null; rutaBase: string | null }>();
  for (const pm of enPlantilla) {
    if (plantillaPorModule.has(pm.moduleId)) continue;
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
      if (vistos.has(plantilla.slug)) continue;
      vistos.add(plantilla.slug);

      // Las sub-entradas de una plantilla son SUS MÓDULOS, cada uno en su
      // propia ruta (`/modulos/<slug>`), y salen de los miembros ACTIVOS: si
      // la org no tiene `gastos`, no aparece un enlace a Gastos.
      const secciones: SeccionModulo[] = [];
      for (const pm of enPlantilla) {
        if (pm.plantilla.slug !== plantilla.slug) continue;
        const activo = activos.find((a) => a.moduleId === pm.moduleId);
        if (!activo?.module.rutaBase) continue;
        secciones.push({ href: activo.module.rutaBase, label: activo.module.nombre });
      }

      resultado.push({
        slug: plantilla.slug,
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion,
        icono: plantilla.icono,
        rutaBase: plantilla.rutaBase,
        secciones,
      });
    } else {
      resultado.push({
        slug: om.module.slug,
        nombre: om.module.nombre,
        descripcion: om.module.descripcion,
        icono: om.module.icono,
        rutaBase: om.module.rutaBase,
        secciones: getSubpaginasModulo(om.module.slug, om.module.rutaBase),
      });
    }
  }
  return resultado;
}

/**
 * Base de ruta de un slug suelto, para cuando solo se tiene el slug y no se
 * quiere pagar el agrupado completo. Acepta el slug de una PLANTILLA
 * (`/plantillas/gym`) o de un MÓDULO (`/modulos/<slug>`).
 *
 * Después del Eje A cada módulo vive en SU ruta, aunque sea miembro de una
 * plantilla: es la ruta que revalida `activarModulo` y la que enlaza el
 * dashboard de la plantilla. La herencia "un módulo de plantilla usa la base
 * de su plantilla" era del modelo viejo de rutas anidadas y ya no aplica.
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
    select: { rutaBase: true },
  });
  return modulo?.rutaBase ?? null;
}

/**
 * ¿Es un rubro del catálogo? El onboarding valida contra esto en vez de
 * guardar texto libre. Fuente de verdad: `Plantilla.rubro` + lo que los
 * módulos ACTIVOS ofrecen en `sugeridoPara`.
 * `"otro"` es válido a propósito: es la personalización del catálogo
 * ("Personalizar negocio" en el wizard), no un rubro real.
 */
export async function esRubroDelCatalogo(rubro: string): Promise<boolean> {
  if (!rubro) return false;
  if (rubro === "otro") return true;
  const [plantilla, modulo] = await Promise.all([
    prisma.plantilla.findFirst({ where: { activo: true, rubro }, select: { id: true } }),
    prisma.module.findFirst({ where: { activo: true, sugeridoPara: { has: rubro } }, select: { id: true } }),
  ]);
  return Boolean(plantilla || modulo);
}

/**
 * Módulos sugeridos para el rubro de la org que todavía no están activos.
 *
 * Se excluyen los VERTICALES que son miembros de una plantilla: un vertical se
 * activa con SU plantilla, no suelto (ofrecer "Planes" sin Gym tiene poco
 * sentido). Pero un CAPA no se excluye por estar en una plantilla: `clientes`
 * es CAPA y miembro de Gym a la vez, y excluirlo por regla de plantilla lo
 * haría invisible para cualquier negocio.
 *
 * Solo se miran las plantillas ACTIVAS, y solo los módulos que la org tiene
 * disponibles: antes se cargaba todo `plantilla_modulos` del catálogo.
 */
export async function getModulosSugeridos(orgId: string, tipoNegocio?: string | null) {
  if (!tipoNegocio) return [];
  const activosIds = new Set((await getModulosActivos(orgId)).map((a) => a.moduleId));

  const sugeridos = await prisma.module.findMany({
    where: { activo: true, sugeridoPara: { has: tipoNegocio } },
    orderBy: { orden: "asc" },
  });
  if (sugeridos.length === 0) return [];

  const ids = sugeridos.map((m) => m.id);
  const enPlantilla = await prisma.plantillaModulo.findMany({
    where: { plantilla: { activo: true }, moduleId: { in: ids } },
    select: { moduleId: true },
  });
  const enPlantillaIds = new Set(enPlantilla.map((pm) => pm.moduleId));

  return sugeridos
    .filter((m) => !activosIds.has(m.id))
    // Un CAPA nunca se descarta por estar en una plantilla: solo los verticales
    // se activan con su plantilla, no sueltos.
    .filter((m) => m.naturaleza === "CAPA" || !enPlantillaIds.has(m.id));
}

/**
 * Activa los módulos BASE del catálogo en la org.
 *
 * `Module.porDefecto` marcaba en el schema que ciertos módulos se activan
 * "automáticamente en toda organización al crearla" (ej: clientes), pero la
 * columna solo se escribía en el seed: nadie la leía. Un negocio se quedaba
 * sin su módulo base y no había forma de recuperarlo salvo activarlo a mano
 * desde el panel.
 *
 * Se llama al crear la organización. Un CAPA con `porDefecto` es la base del
 * producto, no una recomendación: viene siempre, con independencia del rubro.
 */
export async function activarModulosPorDefecto(orgId: string): Promise<number> {
  const base = await prisma.module.findMany({ where: { activo: true, porDefecto: true } });
  for (const m of base) {
    await prisma.organizationModule.upsert({
      where: { orgId_moduleId: { orgId, moduleId: m.id } },
      update: {},
      create: { orgId, moduleId: m.id, estado: "ACTIVO", activadoAt: new Date() },
    });
  }
  return base.length;
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