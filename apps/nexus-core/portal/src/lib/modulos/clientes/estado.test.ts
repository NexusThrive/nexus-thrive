/**
 * REGRESIÓN — estado y período de la membresía (Eje B).
 *
 * `Membresia.estado`/`periodoFin` son una CACHÉ derivada de los pagos vivos.
 * La regla vive en `estado.ts` (UN solo dueño) y estos tests la fijan:
 *   - el período vigente es el `periodoFin` más alto de pagos NO anulados;
 *   - sin pagos vivos → VENCIDO con periodoFin null;
 *   - CONGELADO nunca se pisa solo (decisión del dueño);
 *   - sin membresía no se toca nada.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    membresia: { findFirst: vi.fn(), updateMany: vi.fn() },
    pago: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/core/prisma", () => ({ prisma: prismaMock }));

const { derivarEstadosMembresias, recalcularMembresia } = await import("@/lib/modulos/clientes/estado");

const DIA = 86400000;
const ORG = "org-a";
const CLIENTE = "c1";

const pasado = new Date(Date.now() - DIA);
const futuro = new Date(Date.now() + DIA);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recalcularMembresia", () => {
  it("con un pago vigente deja la membresía ACTIVA con su periodoFin", async () => {
    prismaMock.membresia.findFirst.mockResolvedValue({ id: "m1", estado: "ACTIVO" });
    prismaMock.pago.findFirst.mockResolvedValue({ periodoFin: futuro });

    await recalcularMembresia(CLIENTE, ORG);

    expect(prismaMock.pago.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: ORG, membresia: { clienteId: CLIENTE }, anulado: false },
      }),
    );
    expect(prismaMock.membresia.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "m1", orgId: ORG }, data: { periodoFin: futuro, estado: "ACTIVO" } }),
    );
  });

  it("sin pagos vivos la membresía queda VENCIDA con periodoFin null", async () => {
    prismaMock.membresia.findFirst.mockResolvedValue({ id: "m1", estado: "ACTIVO" });
    prismaMock.pago.findFirst.mockResolvedValue(null);

    await recalcularMembresia(CLIENTE, ORG);

    expect(prismaMock.membresia.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { periodoFin: null, estado: "VENCIDO" } }),
    );
  });

  it("con el pago ya vencido la membresía pasa a VENCIDA", async () => {
    prismaMock.membresia.findFirst.mockResolvedValue({ id: "m1", estado: "ACTIVO" });
    prismaMock.pago.findFirst.mockResolvedValue({ periodoFin: pasado });

    await recalcularMembresia(CLIENTE, ORG);

    expect(prismaMock.membresia.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estado: "VENCIDO" }) }),
    );
  });

  it("CONGELADO se preserva aunque el período haya vencido", async () => {
    prismaMock.membresia.findFirst.mockResolvedValue({ id: "m1", estado: "CONGELADO" });
    prismaMock.pago.findFirst.mockResolvedValue({ periodoFin: pasado });

    await recalcularMembresia(CLIENTE, ORG);

    expect(prismaMock.membresia.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { periodoFin: pasado, estado: "CONGELADO" } }),
    );
  });

  it("sin membresía (cliente genérico sin plan) no toca nada", async () => {
    prismaMock.membresia.findFirst.mockResolvedValue(null);

    await recalcularMembresia(CLIENTE, ORG);

    expect(prismaMock.membresia.updateMany).not.toHaveBeenCalled();
  });
});

describe("derivarEstadosMembresias", () => {
  it("marca VENCIDA a la membresía ACTIVA cuyo período ya pasó", async () => {
    await derivarEstadosMembresias(ORG);

    expect(prismaMock.membresia.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: ORG, estado: "ACTIVO", periodoFin: { not: null, lt: expect.any(Date) } },
        data: { estado: "VENCIDO" },
      }),
    );
  });

  it("reactiva la membresía VENCIDA que volvió a tener período vigente", async () => {
    await derivarEstadosMembresias(ORG);

    expect(prismaMock.membresia.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: ORG, estado: "VENCIDO", periodoFin: { not: null, gte: expect.any(Date) } },
        data: { estado: "ACTIVO" },
      }),
    );
  });
});