/**
 * REGRESIÓN — el gate "¿esta organización tiene el módulo?".
 *
 * Este archivo es el ÚNICO que decide eso (se unificó en el PR #29: gym,
 * caja-menor y sus acciones lo delegan). Estos tests fijan la semántica:
 *
 *   - módulo del catálogo ACTIVO            → habilitado
 *   - módulo del catálogo que no está ACTIVO → NO habilitado (ni cae al
 *     caso de plantilla)
 *   - slug de PLANTILLA con ≥1 miembro ACTIVO → habilitado (la plantilla se
 *     activa junta)
 *   - slug que no existe en el catálogo      → NO habilitado
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    module: { findUnique: vi.fn() },
    plantilla: { findUnique: vi.fn() },
    organizationModule: { findUnique: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/core/prisma", () => ({ prisma: prismaMock }));

const { moduloActivoEnOrg } = await import("@/lib/core/requiere-modulo");

const ORG = "org-1";

beforeEach(() => {
  vi.clearAllMocks();
  // por defecto: nada en el catálogo
  prismaMock.module.findUnique.mockResolvedValue(null);
  prismaMock.plantilla.findUnique.mockResolvedValue(null);
  prismaMock.organizationModule.findUnique.mockResolvedValue(null);
  prismaMock.organizationModule.findFirst.mockResolvedValue(null);
});

describe("moduloActivoEnOrg — módulo real", () => {
  it("true si la fila de la org está ACTIVO", async () => {
    prismaMock.module.findUnique.mockResolvedValue({ id: "mod-caja" });
    prismaMock.organizationModule.findUnique.mockResolvedValue({ estado: "ACTIVO" });

    expect(await moduloActivoEnOrg("caja-menor", ORG)).toBe(true);
    expect(prismaMock.organizationModule.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId_moduleId: { orgId: ORG, moduleId: "mod-caja" } } }),
    );
  });

  it("false si está SOLICITADO: no entra al caso de plantilla", async () => {
    prismaMock.module.findUnique.mockResolvedValue({ id: "mod-caja" });
    prismaMock.organizationModule.findUnique.mockResolvedValue({ estado: "SOLICITADO" });

    expect(await moduloActivoEnOrg("caja-menor", ORG)).toBe(false);
    expect(prismaMock.organizationModule.findFirst).not.toHaveBeenCalled();
  });

  it("false si la org no tiene la fila", async () => {
    prismaMock.module.findUnique.mockResolvedValue({ id: "mod-caja" });
    prismaMock.organizationModule.findUnique.mockResolvedValue(null);

    expect(await moduloActivoEnOrg("caja-menor", ORG)).toBe(false);
  });
});

describe("moduloActivoEnOrg — plantilla", () => {
  it("true con al menos un módulo miembro ACTIVO", async () => {
    prismaMock.plantilla.findUnique.mockResolvedValue({
      modulos: [{ moduleId: "m1" }, { moduleId: "m2" }],
    });
    prismaMock.organizationModule.findFirst.mockResolvedValue({ id: "om-1" });

    expect(await moduloActivoEnOrg("gym", ORG)).toBe(true);
    expect(prismaMock.organizationModule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: ORG, estado: "ACTIVO", moduleId: { in: ["m1", "m2"] } },
      }),
    );
  });

  it("false si la plantilla no tiene ningún miembro activo", async () => {
    prismaMock.plantilla.findUnique.mockResolvedValue({ modulos: [{ moduleId: "m1" }] });
    prismaMock.organizationModule.findFirst.mockResolvedValue(null);

    expect(await moduloActivoEnOrg("gym", ORG)).toBe(false);
  });

  it("false si la plantilla no tiene miembros", async () => {
    prismaMock.plantilla.findUnique.mockResolvedValue({ modulos: [] });

    expect(await moduloActivoEnOrg("gym", ORG)).toBe(false);
    expect(prismaMock.organizationModule.findFirst).not.toHaveBeenCalled();
  });
});

describe("moduloActivoEnOrg — slug inexistente", () => {
  it("false sin tocar la tabla de activaciones", async () => {
    expect(await moduloActivoEnOrg("no-existe", ORG)).toBe(false);
    expect(prismaMock.organizationModule.findFirst).not.toHaveBeenCalled();
  });
});
