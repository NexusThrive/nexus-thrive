/**
 * REGRESIÓN — catálogo de módulos y plantillas (Eje A).
 *
 * Fija cuándo el onboarding puede guardar un rubro, qué módulos se sugieren
 * para un negocio, y de dónde sale la ruta de un módulo:
 *
 *   - `esRubroDelCatalogo`: el rubro del onboarding se valida contra el
 *     catálogo (Plantilla.rubro / Module.sugeridoPara) + `"otro"` como
 *     personalización; un texto libre ("gimnasioo") no puede entrar.
 *   - `getModulosSugeridos`: un CAPA miembro de plantilla NO se excluye
 *     (antes `clientes` desaparecía de las sugerencias por regla de
 *     plantilla, aunque es la base que todo negocio necesita); un VERTICAL
 *     miembro sí (se activa con su plantilla).
 *   - `getRutaBase`: con el Eje A cada módulo vive en `/modulos/<slug>`;
 *     la herencia "un miembro de plantilla usa la base de su plantilla"
 *     dejó de aplicar.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    organizationModule: { findMany: vi.fn(), findUnique: vi.fn() },
    module: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    plantilla: { findFirst: vi.fn(), findUnique: vi.fn() },
    plantillaModulo: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/core/prisma", () => ({ prisma: prismaMock }));

const { esRubroDelCatalogo, getModulosSugeridos, getRutaBase } = await import("@/lib/core/modulos");

const ORG = "org-1";

function modulo(over: Record<string, unknown>) {
  return {
    id: "mod-" + over.slug,
    slug: undefined,
    nombre: "Módulo",
    descripcion: null,
    icono: null,
    rutaBase: null,
    naturaleza: "VERTICAL",
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.organizationModule.findMany.mockResolvedValue([]);
  prismaMock.module.findMany.mockResolvedValue([]);
  prismaMock.plantillaModulo.findMany.mockResolvedValue([]);
  prismaMock.module.findFirst.mockResolvedValue(null);
  prismaMock.plantilla.findFirst.mockResolvedValue(null);
  prismaMock.plantilla.findUnique.mockResolvedValue(null);
  prismaMock.module.findUnique.mockResolvedValue(null);
});

describe("esRubroDelCatalogo", () => {
  it("un rubro con plantilla activa es válido", async () => {
    prismaMock.plantilla.findFirst.mockResolvedValue({ id: "p-gym" });

    expect(await esRubroDelCatalogo("gimnasio")).toBe(true);
    expect(prismaMock.plantilla.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { activo: true, rubro: "gimnasio" } }),
    );
  });

  it("un rubro que ofrece un módulo activo también es válido", async () => {
    prismaMock.plantilla.findFirst.mockResolvedValue(null);
    prismaMock.module.findFirst.mockResolvedValue({ id: "m-x" });

    expect(await esRubroDelCatalogo("restaurante")).toBe(true);
  });

  it("un texto libre que nadie maneja NO es válido", async () => {
    expect(await esRubroDelCatalogo("gimnasioo")).toBe(false);
  });

  it("\"otro\" (personalización) es válido sin consultar la base", async () => {
    expect(await esRubroDelCatalogo("otro")).toBe(true);
    expect(prismaMock.plantilla.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.module.findFirst).not.toHaveBeenCalled();
  });

  it("vacío no es válido", async () => {
    expect(await esRubroDelCatalogo("")).toBe(false);
  });
});

describe("getModulosSugeridos", () => {
  it("un CAPA miembro de plantilla NO se descarta (clientes)", async () => {
    prismaMock.module.findMany.mockResolvedValue([
      modulo({ slug: "clientes", naturaleza: "CAPA", sugeridoPara: ["gimnasio"] }),
    ]);
    prismaMock.plantillaModulo.findMany.mockResolvedValue([{ moduleId: "mod-clientes" }]);

    const sugeridos = await getModulosSugeridos(ORG, "gimnasio");

    expect(sugeridos.map((m) => m.slug)).toEqual(["clientes"]);
  });

  it("un VERTICAL miembro de plantilla se descarta (se activa con su plantilla)", async () => {
    prismaMock.module.findMany.mockResolvedValue([
      modulo({ slug: "planes", naturaleza: "VERTICAL", sugeridoPara: ["gimnasio"] }),
      modulo({ slug: "clases", naturaleza: "VERTICAL", sugeridoPara: ["gimnasio"] }),
    ]);
    prismaMock.plantillaModulo.findMany.mockResolvedValue([
      { moduleId: "mod-planes" },
      // clases NO es miembro: se ofrece suelto
      { moduleId: "mod-gym" },
    ]);

    const sugeridos = await getModulosSugeridos(ORG, "gimnasio");

    expect(sugeridos.map((m) => m.slug)).toEqual(["clases"]);
  });

  it("un módulo ya activo en la org no se vuelve a sugerir", async () => {
    prismaMock.organizationModule.findMany.mockResolvedValue([
      { moduleId: "mod-clientes", module: modulo({ slug: "clientes", naturaleza: "CAPA" }) },
    ]);
    prismaMock.module.findMany.mockResolvedValue([
      modulo({ slug: "clientes", naturaleza: "CAPA", sugeridoPara: ["gimnasio"] }),
    ]);

    const sugeridos = await getModulosSugeridos(ORG, "gimnasio");

    expect(sugeridos).toEqual([]);
  });

  it("sin rubro no consulta la base", async () => {
    expect(await getModulosSugeridos(ORG, null)).toEqual([]);
    expect(prismaMock.module.findMany).not.toHaveBeenCalled();
  });
});

describe("getRutaBase", () => {
  it("un módulo miembro de plantilla usa SU ruta (/modulos/<slug>)", async () => {
    prismaMock.plantilla.findUnique.mockResolvedValue(null);
    prismaMock.module.findUnique.mockResolvedValue({ rutaBase: "/modulos/clientes" });

    expect(await getRutaBase("clientes")).toBe("/modulos/clientes");
    // ya no se pide la plantilla del módulo: la herencia dejó de aplicar
    expect(prismaMock.module.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "clientes" }, select: { rutaBase: true } }),
    );
  });

  it("un slug de plantilla devuelve la base de la plantilla", async () => {
    prismaMock.plantilla.findUnique.mockResolvedValue({ rutaBase: "/plantillas/gym" });

    expect(await getRutaBase("gym")).toBe("/plantillas/gym");
  });

  it("slug que no existe devuelve null (nunca cae a /<slug>)", async () => {
    expect(await getRutaBase("no-existe")).toBeNull();
  });
});