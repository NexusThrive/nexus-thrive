/**
 * REGRESIÓN — consultas multi-tenant del módulo Clientes.
 *
 * CONTEXTO: `Membresia.planId` es un FK GLOBAL a `Plan` sin restricción de
 * organización (antes `Cliente.planId`, corregida la fuga en el PR #28; desde
 * el Eje B el plan vive en la membresía pero el riesgo es el mismo). Un
 * `planId` manipulado guardaba una membresía de la org A apuntando a un plan
 * de la org B, y la ficha/listado mostraban el nombre y el precio del plan
 * ajeno (fuga cross-tenant).
 *
 * Estos tests fijan las TRES defensas:
 *   1. escritura → `resolverPlanDeOrg` valida el plan contra la org;
 *   2. listado   → el plan se resuelve con un Map de los planes DE LA ORG;
 *   3. ficha     → el plan se busca con `orgId` en el where.
 *
 * Si alguien cambia un `where` y vuelve a cruzar organizaciones, falla acá.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    cliente: { findMany: vi.fn(), findFirst: vi.fn() },
    membresia: { findMany: vi.fn() },
    plan: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/core/prisma", () => ({ prisma: prismaMock }));

const { getClientesPorVencer, getClienteDeOrg, getClientesDeOrg, resolverPlanDeOrg } = await import(
  "@/lib/modulos/clientes/consultas"
);

const ORG_A = "org-a";
const ORG_B = "org-b";

const planA = { id: "plan-a", orgId: ORG_A, nombre: "Mensual A", precio: 90_000 };
const planB = { id: "plan-b", orgId: ORG_B, nombre: "Mensual B", precio: 120_000 };

function cliente(over: Record<string, unknown>) {
  return { id: "c1", orgId: ORG_A, membresia: null, createdAt: new Date(0), ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolverPlanDeOrg (escritura)", () => {
  it("devuelve el id solo si el plan es de la MISMA org", async () => {
    prismaMock.plan.findFirst.mockResolvedValue({ id: planA.id });

    const id = await resolverPlanDeOrg(planA.id, ORG_A);

    expect(id).toBe(planA.id);
    // el filtro de org es lo que impide el cruce: tiene que viajar en el where
    expect(prismaMock.plan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: planA.id, orgId: ORG_A } }),
    );
  });

  it("un plan de otra org se resuelve a null (se guarda como sin membresía)", async () => {
    prismaMock.plan.findFirst.mockResolvedValue(null);

    expect(await resolverPlanDeOrg(planB.id, ORG_A)).toBeNull();
  });

  it("sin plan enviado no consulta la base", async () => {
    expect(await resolverPlanDeOrg(null, ORG_A)).toBeNull();
    expect(prismaMock.plan.findFirst).not.toHaveBeenCalled();
  });
});

describe("getClientesDeOrg (listado)", () => {
  it("acota los clientes a la org Y resuelve el plan dentro de la org", async () => {
    prismaMock.cliente.findMany.mockResolvedValue([
      // la membresía lleva el planId (Eje B); pagos y createdAt sobran acá
      cliente({ id: "c1", membresia: { planId: planA.id, pagos: [] } }),
      // fila ya envenenada en la base: la membresía apunta a un plan de la ORG B
      cliente({ id: "c2", membresia: { planId: planB.id, pagos: [] } }),
      // cliente sin membresía (genérico): no hay plan que resolver
      cliente({ id: "c3", membresia: null }),
    ]);
    prismaMock.plan.findMany.mockResolvedValue([planA]);

    const filas = await getClientesDeOrg(ORG_A);

    expect(prismaMock.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: ORG_A } }),
    );
    // los planes se piden SOLO de esta org (una query, indexada en un Map)
    expect(prismaMock.plan.findMany).toHaveBeenCalledWith({ where: { orgId: ORG_A } });

    expect(filas[0]!.plan?.nombre).toBe("Mensual A");
    // la fila envenenada NO filtra el plan ajeno: se ve como sin membresía
    expect(filas[1]!.plan).toBeNull();
    expect(filas[2]!.plan).toBeNull();
  });

  it("no devuelve clientes de otra org aunque se pidan", async () => {
    // El where lo pone Prisma; el test verifica que el filtro viaje siempre.
    prismaMock.cliente.findMany.mockResolvedValue([]);
    prismaMock.plan.findMany.mockResolvedValue([]);

    const filas = await getClientesDeOrg(ORG_B);

    expect(filas).toEqual([]);
    expect(prismaMock.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: ORG_B } }),
    );
  });
});

describe("getClienteDeOrg (ficha)", () => {
  it("exige que el cliente sea de la org", async () => {
    prismaMock.cliente.findFirst.mockResolvedValue(cliente({ id: "c1" }));

    await getClienteDeOrg("c1", ORG_B);

    expect(prismaMock.cliente.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1", orgId: ORG_B } }),
    );
  });

  it("resuelve el plan con orgId: uno ajeno queda null", async () => {
    prismaMock.cliente.findFirst.mockResolvedValue(
      cliente({ id: "c2", membresia: { planId: planB.id, pagos: [] } }),
    );
    prismaMock.plan.findFirst.mockResolvedValue(null);

    const ficha = await getClienteDeOrg("c2", ORG_A);

    expect(prismaMock.plan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: planB.id, orgId: ORG_A } }),
    );
    expect(ficha?.plan).toBeNull();
  });

  it("si el cliente no existe en esa org devuelve null (no 404 con datos ajenos)", async () => {
    prismaMock.cliente.findFirst.mockResolvedValue(null);

    expect(await getClienteDeOrg("c1", ORG_B)).toBeNull();
  });
});

describe("getClientesPorVencer", () => {
  it("resuelve el nombre del plan dentro de la org y filtra los ajenos", async () => {
    prismaMock.membresia.findMany.mockResolvedValue([
      { planId: planA.id, periodoFin: new Date(0), cliente: { id: "c1", nombre: "Ana" } },
      // membresía envenenada: planId de la ORG B — no puede mostrar su nombre
      { planId: planB.id, periodoFin: new Date(0), cliente: { id: "c2", nombre: "Luis" } },
      // membresía sin plan ("mes libre"): se muestra como sin membresía
      { planId: null, periodoFin: new Date(0), cliente: { id: "c3", nombre: "Rosa" } },
    ]);
    prismaMock.plan.findMany.mockResolvedValue([planA]);

    const filas = await getClientesPorVencer(ORG_A, {
      desde: new Date(0),
      hasta: new Date(86400000),
    });

    expect(prismaMock.membresia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: ORG_A, estado: "ACTIVO", periodoFin: { gte: new Date(0), lte: new Date(86400000) } },
      }),
    );
    expect(prismaMock.plan.findMany).toHaveBeenCalledWith({
      where: { orgId: ORG_A, id: { in: [planA.id, planB.id] } },
      select: { id: true, nombre: true },
    });

    expect(filas[0]).toEqual({ id: "c1", nombre: "Ana", periodoFin: new Date(0), plan: "Mensual A" });
    expect(filas[1]!.plan).toBeNull();
    expect(filas[2]!.plan).toBeNull();
  });

  it("sin membresías por vencer no consulta planes", async () => {
    prismaMock.membresia.findMany.mockResolvedValue([]);

    const filas = await getClientesPorVencer(ORG_A, { desde: new Date(0), hasta: new Date(1) });

    expect(filas).toEqual([]);
    expect(prismaMock.plan.findMany).not.toHaveBeenCalled();
  });
});