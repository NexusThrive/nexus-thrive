import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed ESTRUCTURAL del NÚCLEO de Nexus.
 *
 * Crear SOLO lo que la estructura necesita para funcionar (catálogo de
 * módulos + plantillas). NO crea negocios demo: eso vive en seed-demo.ts.
 * El seed demo se encadena DESPUÉS de este (dependency: este corre primero).
 *
 * Separación (análisis 2026-09-22):
 *   - seed.ts      → estructural: para tests / CI / base vacía de un cliente
 *   - seed-demo.ts → demo: Zona Rosa + Casa Museo Pozón (mostrar producto)
 *
 * Un módulo nace de un dolor validado (regla §9 PLAN-BASE-NEXUS), no de
 * listas imaginadas. Hoy: Gym (vertical) y Caja Menor (capa).
 */
async function main() {
  // ---------- Limpieza del catálogo viejo (módulos que ya no existen) ----------
  const slugsViejos = ["facturacion", "presupuestos"];
  for (const slug of slugsViejos) {
    const old = await prisma.module.findUnique({ where: { slug } });
    if (old) {
      await prisma.organizationModule.deleteMany({ where: { moduleId: old.id } });
      await prisma.plantillaModulo.deleteMany({ where: { moduleId: old.id } });
      await prisma.module.delete({ where: { id: old.id } });
    }
  }

  // ---------- Catálogo de módulos (productos reutilizables) ----------
  const cajamenor = await prisma.module.upsert({
    where: { slug: "caja-menor" },
    update: {
      nombre: "Caja Menor",
      descripcion: "El efectivo del negocio claro: entradas, salidas y saldo al día.",
      campo: "FINANCE",
      naturaleza: "CAPA", // horizontal: sirve a cualquier negocio con efectivo
      icono: "wallet",
      porDefecto: false,
      // CAPA suelto → vive bajo /modulos/<slug>
      rutaBase: "/modulos/caja-menor",
      sugeridoPara: ["museo", "comercio", "restaurante", "tienda", "cafe"],
      orden: 2,
    },
    create: {
      slug: "caja-menor",
      nombre: "Caja Menor",
      descripcion: "El efectivo del negocio claro: entradas, salidas y saldo al día.",
      campo: "FINANCE",
      naturaleza: "CAPA",
      icono: "wallet",
      porDefecto: false,
      rutaBase: "/modulos/caja-menor",
      sugeridoPara: ["museo", "comercio", "restaurante", "tienda", "cafe"],
      orden: 2,
    },
  });

  // ---------- Plantilla GYM (vertical: rubro gimnasio) ----------
  // Los módulos de la plantilla se activan JUNTOS (OrganizationModule).
  const gymModules = [
    { slug: "clientes", nombre: "Clientes", descripcion: "Socios, membresías y cobros: el gimnasio al día sin planillas.", campo: "SERVICES" as const, icono: "users" },
    { slug: "planes", nombre: "Planes", descripcion: "Planes de membresía del gimnasio.", campo: "SERVICES" as const, icono: "clipboard-list" },
    { slug: "pagos", nombre: "Pagos", descripcion: "Cobros y pagos de membresías.", campo: "SERVICES" as const, icono: "credit-card" },
    { slug: "gastos", nombre: "Gastos", descripcion: "Gastos del gimnasio.", campo: "SERVICES" as const, icono: "receipt" },
  ];

  let gym: { id: string; slug: string };
  if (await prisma.module.findUnique({ where: { slug: "gym" } })) {
    gym = { id: (await prisma.module.findUnique({ where: { slug: "gym" } }))!.id, slug: "gym" };
    // módulo gym antiguo (VERTICAL suelto) → se reemplaza por la plantilla
    await prisma.organizationModule.deleteMany({ where: { moduleId: gym.id } });
    await prisma.module.delete({ where: { id: gym.id } });
  }

  const plantillaGym = await prisma.plantilla.upsert({
    where: { slug: "gym" },
    update: {
      nombre: "Gym",
      descripcion: "Socios, membresías y cobros: el gimnasio al día sin planillas.",
      campo: "SERVICES",
      rubro: "gimnasio",
      icono: "dumbbell",
      // Los módulos MIEMBROS heredan esta ruta: se navega a /plantillas/gym.
      rutaBase: "/plantillas/gym",
    },
    create: {
      slug: "gym",
      nombre: "Gym",
      descripcion: "Socios, membresías y cobros: el gimnasio al día sin planillas.",
      campo: "SERVICES",
      rubro: "gimnasio",
      icono: "dumbbell",
      rutaBase: "/plantillas/gym",
    },
  });

  for (const [i, m] of gymModules.entries()) {
    const mod = await prisma.module.upsert({
      where: { slug: m.slug },
      update: { nombre: m.nombre, descripcion: m.descripcion, campo: m.campo, naturaleza: "VERTICAL", icono: m.icono, porDefecto: false, sugeridoPara: ["gimnasio"], orden: i + 1 },
      create: { slug: m.slug, nombre: m.nombre, descripcion: m.descripcion, campo: m.campo, naturaleza: "VERTICAL", icono: m.icono, porDefecto: false, sugeridoPara: ["gimnasio"], orden: i + 1 },
    });
    await prisma.plantillaModulo.upsert({
      where: { plantillaId_moduleId: { plantillaId: plantillaGym.id, moduleId: mod.id } },
      update: { orden: i + 1 },
      create: { plantillaId: plantillaGym.id, moduleId: mod.id, orden: i + 1 },
    });
  }

  console.log("🌌 Seed estructural listo:");
  console.log("  módulos:", cajamenor.slug, "· plantilla gym (clientes, planes, pagos, gastos)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
