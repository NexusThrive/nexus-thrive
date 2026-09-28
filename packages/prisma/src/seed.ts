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

  // ---------- Plantilla GYM (rubro gimnasio) ----------
  // Los módulos de la plantilla se activan JUNTOS (OrganizationModule).
  //
  // EJE A — `clientes` es CAPA, no VERTICAL. El registro de personas no es de
  // un rubro: un museo tiene visitantes y un salón tiene clientes. Por eso va
  // `porDefecto: true` (se activa en toda organización al crearla) y NO
  // depende del rubro. Sigue siendo MIEMBRO de Gym: un gimnasio lo recibe
  // también con la plantilla, y el nombre que muestra el menú lo pone la
  // plantilla ("Socios"), no el módulo ("Clientes").
  const clientesCapas = {
    slug: "clientes",
    nombre: "Clientes",
    descripcion: "El registro de personas del negocio: datos, historial y contacto.",
    campo: "CORE" as const,
    icono: "users",
  };

  // Los otros tres SIGUEN siendo verticales: solo tienen sentido con la
  // plantilla de un rubro (membresías, cobros y gastos de un gym).
  const gymVerticales = [
    { slug: "planes", nombre: "Planes", descripcion: "Planes de membresía del gimnasio.", campo: "SERVICES" as const, icono: "clipboard-list" },
    { slug: "pagos", nombre: "Pagos", descripcion: "Cobros y pagos de membresías.", campo: "SERVICES" as const, icono: "credit-card" },
    { slug: "gastos", nombre: "Gastos", descripcion: "Gastos del gimnasio.", campo: "SERVICES" as const, icono: "receipt" },
  ];

  // Un CAPA se navega suelto en su propia ruta; un miembro de plantilla
  // conserva la ruta del CATÁLOGO también, porque la ruta del módulo es la
  // que usa el sidebar para sus sub-entradas (`/modulos/<slug>`).
  const attrsClientes = {
    ...clientesCapas,
    naturaleza: "CAPA" as const,
    porDefecto: true,
    rutaBase: `/modulos/${clientesCapas.slug}`,
    // Un CAPA no se sugiere POR rubro: viene siempre, no es recomendación.
    sugeridoPara: [] as string[],
    orden: 0,
  };

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
      // El DASHBOARD de la plantilla. Los módulos ya NO cuelgan de esta ruta:
      // cada uno vive en la suya (`/modulos/<slug>`).
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

  // `clientes` se upsertea APARTE: es CAPA + porDefecto, los otros son
  // VERTICAL. El bucle único anterior los forzaba a todos a VERTICAL.
  const modClientes = await prisma.module.upsert({
    where: { slug: clientesCapas.slug },
    update: { ...attrsClientes },
    create: { ...attrsClientes },
  });
  await prisma.plantillaModulo.upsert({
    where: { plantillaId_moduleId: { plantillaId: plantillaGym.id, moduleId: modClientes.id } },
    update: { orden: 0 },
    create: { plantillaId: plantillaGym.id, moduleId: modClientes.id, orden: 0 },
  });

  for (const [i, m] of gymVerticales.entries()) {
    const attrs = {
      ...m,
      naturaleza: "VERTICAL" as const,
      porDefecto: false,
      rutaBase: `/modulos/${m.slug}`,
      sugeridoPara: ["gimnasio"],
      orden: i + 1,
    };
    const mod = await prisma.module.upsert({
      where: { slug: m.slug },
      update: attrs,
      create: attrs,
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
