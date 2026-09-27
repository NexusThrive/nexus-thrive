import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const HASH = bcrypt.hashSync("Admin123", 10);

/**
 * Seed DEMO del NÚCLEO de Nexus — para mostrar el producto.
 *
 * Corre DESPUÉS del seed estructural (catálogo/plantillas ya existen).
 * Crea negocios reales con datos de ejemplo:
 *   - Casa Museo Pozón (museo real del profe) → Caja Menor ACTIVA
 *   - Zona Rosa Gym (cliente real, demo) → plantilla Gym ACTIVA
 *
 * DEMO:
 *   profe@casamuseopozon.com / Admin123 (Casa Museo Pozón → Caja Menor)
 *   yoli@zonarosa.com       / Admin123 (Zona Rosa → Gym)
 */
async function main() {
  const cajamenor = await prisma.module.findUniqueOrThrow({ where: { slug: "caja-menor" } });
  const gym = await prisma.plantilla.findUniqueOrThrow({
    where: { slug: "gym" },
    include: { modulos: true },
  });

  // ---------- Casa Museo Pozón (museo real del profe → Caja Menor) ----------
  // `now` marca el onboarding como YA TERMINADO. Sin esto, el layout (protected)
  // redirige para siempre a /onboarding y el demo no se puede ni mostrar:
  // el gate es POR PERSONA (member.onboardingCompletadoAt), no solo de la org.
  const now = new Date();

  const museo = await prisma.organization.upsert({
    where: { slug: "casamuseopozon" },
    update: { nombre: "Casa Museo Pozón", tipoNegocio: "museo", moneda: "COP", pais: "CO", onboardingCompletadoAt: now },
    create: {
      nombre: "Casa Museo Pozón",
      slug: "casamuseopozon",
      tipoNegocio: "museo",
      moneda: "COP",
      pais: "CO",
      onboardingCompletadoAt: now,
    },
  });

  await prisma.member.upsert({
    where: { email_orgId: { email: "profe@casamuseopozon.com", orgId: museo.id } },
    update: { nombre: "Profe (pendiente nombre)", rol: "ADMIN", passwordHash: HASH, activo: true, onboardingCompletadoAt: now },
    create: {
      orgId: museo.id,
      nombre: "Profe (pendiente nombre)",
      email: "profe@casamuseopozon.com",
      passwordHash: HASH,
      rol: "ADMIN",
      onboardingCompletadoAt: now,
    },
  });

  // Módulo Caja Menor ACTIVO para Casa Museo Pozón.
  await prisma.organizationModule.upsert({
    where: { orgId_moduleId: { orgId: museo.id, moduleId: cajamenor.id } },
    update: { estado: "ACTIVO", activadoAt: new Date() },
    create: { orgId: museo.id, moduleId: cajamenor.id, estado: "ACTIVO", activadoAt: new Date() },
  });

  // Categorías iniciales de caja menor (configurables por el dueño después).
  const categoriasIniciales = ["Mercado", "Transporte", "Papelería", "Mantenimiento", "Servicios", "Ventas", "Otros"];
  for (const nombre of categoriasIniciales) {
    await prisma.cajaCategoria.upsert({
      where: { orgId_nombre: { orgId: museo.id, nombre } },
      update: { activo: true },
      create: { orgId: museo.id, nombre },
    });
  }

  // ---------- Zona Rosa Gym (cliente real, demo → plantilla Gym) ----------
  const zonaRosa = await prisma.organization.upsert({
    where: { slug: "zonarosa" },
    update: { nombre: "Zona Rosa Gym", tipoNegocio: "gimnasio", moneda: "COP", pais: "CO", onboardingCompletadoAt: now },
    create: {
      nombre: "Zona Rosa Gym",
      slug: "zonarosa",
      tipoNegocio: "gimnasio",
      moneda: "COP",
      pais: "CO",
      onboardingCompletadoAt: now,
    },
  });

  await prisma.member.upsert({
    where: { email_orgId: { email: "yoli@zonarosa.com", orgId: zonaRosa.id } },
    update: { nombre: "Yoli Ortiz", rol: "ADMIN", passwordHash: HASH, activo: true, onboardingCompletadoAt: now },
    create: {
      orgId: zonaRosa.id,
      nombre: "Yoli Ortiz",
      email: "yoli@zonarosa.com",
      passwordHash: HASH,
      rol: "ADMIN",
      onboardingCompletadoAt: now,
    },
  });

  // Plantilla Gym ACTIVA = todos sus módulos juntos (la plantilla se activa completa).
  for (const pm of gym.modulos) {
    await prisma.organizationModule.upsert({
      where: { orgId_moduleId: { orgId: zonaRosa.id, moduleId: pm.moduleId } },
      update: { estado: "ACTIVO", activadoAt: new Date() },
      create: { orgId: zonaRosa.id, moduleId: pm.moduleId, estado: "ACTIVO", activadoAt: new Date() },
    });
  }

  console.log("🌌 Seed demo listo:");
  console.log("  Casa Museo Pozón → Caja Menor ACTIVA");
  console.log("  Zona Rosa Gym    → plantilla Gym ACTIVA (clientes, planes, pagos, gastos)");
  console.log("  DEMO → profe@casamuseopozon.com / Admin123 · yoli@zonarosa.com / Admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());