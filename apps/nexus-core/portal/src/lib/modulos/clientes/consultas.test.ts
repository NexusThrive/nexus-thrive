/**
 * REGRESIÓN — consultas multi-tenant del módulo Clientes.
 *
 * CONTEXTO: `Cliente.planId` es un FK GLOBAL a `Plan` sin restricción de
 * organización. Un `planId` manipulado guardaba un cliente de la org A
 * apuntando a un plan de la org B, y la ficha/listado mostraban el nombre y
 * el precio del plan ajeno (fuga cross-tenant, corregida en el PR #28).
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
    plan: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/core/prisma", () => ({ prisma: prismaMock }));

const { getClienteDeOrg, getClientesDeOrg, resolverPlanDeOrg } = await import(
  "@/lib/modulos/clientes/consultas"
);

const ORG_A = "org-a";
const ORG_B = "org-b";

const planA = { id: "plan-a", orgId: ORG_A, nombre: "Mensual A", precio: 90_000 };
const planB = { id: "plan-b", orgId: ORG_B, nombre: "Mensual B", precio: 120_000 };

function cliente(over: Record<string, unknown>) {
  return { id: "c1", orgId: ORG_A, planId: null, pagos: [], createdAt: new Date(0), ...over };
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
      cliente({ id: "c1", planId: planA.id }),
      // fila ya envenenada en la base: apunta a un plan de la ORG B
      cliente({ id: "c2", planId: planB.id }),
      cliente({ id: "c3", planId: null }),
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
    prismaMock.cliente.findFirst.mockResolvedValue(cliente({ id: "c2", planId: planB.id }));
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
