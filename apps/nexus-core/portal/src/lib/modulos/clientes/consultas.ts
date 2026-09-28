/**
 * MÓDULO CLIENTES — consultas seguras (capa Services, plantilla Gym).
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------
 * `Cliente.planId` es un FK global a `Plan` sin restricción de organización:
 * la base permite que un cliente de la org A apunte a un plan de la org B.
 * Eso convertía un `<select name="planId">` manipulado en una fuga de datos
 * entre negocios: el cliente se guardaba en la org A pero la ficha y el listado
 * mostraban el nombre y el precio del plan de la org B.
 *
 * Por eso se corrigen LOS DOS LADOS:
 *   - ESCRITURA (`resolverPlanDeOrg`): un plan ajeno nunca se persiste.
 *   - LECTURA (`getClientesDeOrg` / `getClienteDeOrg`): aunque ya exista una
 *     fila envenenada en la base, el plan se resuelve con `orgId` y se
 *     entrega `null` si no es de esta org. Nunca se muestra nada ajeno,
 *     aunque el dato ya esté guardado.
 *
 * Nota sobre Prisma: `include: { plan: true }` NO admite `where` (solo las
 * relaciones to-many lo admiten), así que para acotar un to-one hay que
 * resolverlo aparte con su propio filtro por org.
 */

import { prisma } from "@/lib/core/prisma";
import type { Plan, Prisma } from "@prisma/client";

/**
 * Los tipos se DERIVAN de las queries con `GetPayload` en vez de escribirse a
 * mano: si el `include` de una consulta cambia, el tipo la sigue y el
 * type-check avisa. Escribirlos a mano ya falló una vez (`pagos` desaparecía).
 */

/** Listado: cliente + plan acotado a la org + último pago no anulado. */
export type ClienteListado = Prisma.ClienteGetPayload<{
  include: { pagos: { where: { anulado: false }; orderBy: { pagadoEl: "desc" }; take: 1 } };
}> & { plan: Plan | null };

/** Ficha: cliente + plan acotado a la org + todos sus pagos. */
export type ClienteFicha = Prisma.ClienteGetPayload<{
  include: { pagos: { orderBy: { pagadoEl: "desc" } } };
}> & { plan: Plan | null };

/**
 * Valida un `planId` entrante: devuelve el id solo si el plan pertenece a
 * `orgId`, o `null` si no se envió ninguno / no es de esta org.
 *
 * Que devuelva `null` en vez de lanzar es a propósito: el llamador decide
 * si eso es "sin membresía" (legítimo) o un intento de cruce de org.
 */
export async function resolverPlanDeOrg(planId: string | null, orgId: string): Promise<string | null> {
  if (!planId) return null;
  const plan = await prisma.plan.findFirst({ where: { id: planId, orgId }, select: { id: true } });
  return plan?.id ?? null;
}

/**
 * Listado de clientes con el plan resuelto dentro de la MISMA org.
 * Reemplaza a `include: { plan: true }`, que cruzaba organizaciones.
 */
export async function getClientesDeOrg(orgId: string): Promise<ClienteListado[]> {
  const clientes = await prisma.cliente.findMany({
    where: { orgId },
    include: {
      pagos: { where: { anulado: false }, orderBy: { pagadoEl: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  // Un solo query para todos los planes de la org y se indexa en memoria:
  // resolver plan por plan sería N+1.
  const planes = await prisma.plan.findMany({ where: { orgId } });
  const porId = new Map(planes.map((p) => [p.id, p]));

  return clientes.map((c) => ({
    ...c,
    // `?? null` es lo que impide la fuga: un planId que apunta a otra org
    // simplemente no resuelve y se muestra como "Sin membresía".
    plan: c.planId ? porId.get(c.planId) ?? null : null,
  }));
}

/** Ficha de un cliente, acotada a la org, con su plan resuelto dentro de la org. */
export async function getClienteDeOrg(id: string, orgId: string): Promise<ClienteFicha | null> {
  const cliente = await prisma.cliente.findFirst({
    where: { id, orgId },
    include: { pagos: { orderBy: { pagadoEl: "desc" } } },
  });
  if (!cliente) return null;

  const plan = cliente.planId
    ? await prisma.plan.findFirst({ where: { id: cliente.planId, orgId } })
    : null;

  return { ...cliente, plan };
}
