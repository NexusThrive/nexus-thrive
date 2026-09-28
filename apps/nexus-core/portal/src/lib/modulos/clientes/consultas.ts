/**
 * MÓDULO CLIENTES — consultas seguras (capa Services, plantilla Gym).
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------
 * Un `planId` manipulado convertía un `<select>` en una fuga de datos entre
 * negocios: el cliente se guardaba en la org A pero la ficha y el listado
 * mostraban el nombre y el precio del plan de la org B (PR #28).
 *
 * Desde el Eje B el plan ya no cuelga de `Cliente` sino de `Membresia`, pero
 * el riesgo es el MISMO — `Membresia.planId` sigue siendo un FK global a
 * `Plan`. Se mantienen LOS DOS LADOS de la defensa:
 *   - ESCRITURA (`resolverPlanDeOrg`): un plan ajeno nunca se persiste.
 *   - LECTURA (`getClientesDeOrg` / `getClienteDeOrg` / `getClientesPorVencer`):
 *     el plan se resuelve con `orgId` y se entrega `null` si no es de esta
 *     org. Nunca se muestra nada ajeno, aunque el dato ya esté guardado.
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

/** Listado: cliente + membresía (con último pago no anulado) + plan acotado. */
export type ClienteListado = Prisma.ClienteGetPayload<{
  include: {
    membresia: {
      include: { pagos: { where: { anulado: false }; orderBy: { pagadoEl: "desc" }; take: 1 } };
    };
  };
}> & { plan: Plan | null };

/** Ficha: cliente + membresía (con todos sus pagos) + plan acotado a la org. */
export type ClienteFicha = Prisma.ClienteGetPayload<{
  include: { membresia: { include: { pagos: { orderBy: { pagadoEl: "desc" } } } } };
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
 * El estado / vencimiento / último pago salen de `membresia` (Eje B).
 */
export async function getClientesDeOrg(orgId: string): Promise<ClienteListado[]> {
  const clientes = await prisma.cliente.findMany({
    where: { orgId },
    include: {
      membresia: {
        include: { pagos: { where: { anulado: false }, orderBy: { pagadoEl: "desc" }, take: 1 } },
      },
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
    plan: c.membresia?.planId ? porId.get(c.membresia.planId) ?? null : null,
  }));
}

/** Ficha de un cliente, acotada a la org, con su plan resuelto dentro de la org. */
export async function getClienteDeOrg(id: string, orgId: string): Promise<ClienteFicha | null> {
  const cliente = await prisma.cliente.findFirst({
    where: { id, orgId },
    include: { membresia: { include: { pagos: { orderBy: { pagadoEl: "desc" } } } } },
  });
  if (!cliente) return null;

  const plan = cliente.membresia?.planId
    ? await prisma.plan.findFirst({ where: { id: cliente.membresia.planId, orgId } })
    : null;

  return { ...cliente, plan };
}

/** Listado mínimo para poblar un `<select>` de cobro (id + nombre). */
export async function getNombresClientes(orgId: string) {
  return prisma.cliente.findMany({
    where: { orgId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
}

/**
 * Membresías que vencen dentro de la ventana dada, con el nombre del plan
 * resuelto DENTRO de la org.
 *
 * POR QUÉ EXISTE: la página de pagos hacía esto con
 * `select: { plan: { select: { nombre: true } } }`. Como en Prisma las
 * relaciones to-one no admiten `where`, ese include no lleva `orgId`: una fila
 * ya envenenada (membresía de la org A con `planId` de un plan de la org B)
 * filtraba el NOMBRE del plan ajeno. Esta función resuelve el plan con el
 * mismo criterio que el listado, así que un plan ajeno nunca se muestra.
 */
export async function getClientesPorVencer(
  orgId: string,
  { desde, hasta }: { desde: Date; hasta: Date },
) {
  const membresias = await prisma.membresia.findMany({
    where: { orgId, estado: "ACTIVO", periodoFin: { gte: desde, lte: hasta } },
    select: {
      planId: true,
      periodoFin: true,
      cliente: { select: { id: true, nombre: true } },
    },
    orderBy: { periodoFin: "asc" },
  });
  if (membresias.length === 0) return [];

  const planIds = membresias.map((m) => m.planId).filter((id): id is string => id !== null);
  const planes = planIds.length
    ? await prisma.plan.findMany({ where: { orgId, id: { in: planIds } }, select: { id: true, nombre: true } })
    : [];
  const nombrePorPlan = new Map(planes.map((p) => [p.id, p.nombre]));

  return membresias.map((m) => ({
    id: m.cliente.id,
    nombre: m.cliente.nombre,
    periodoFin: m.periodoFin,
    plan: m.planId ? (nombrePorPlan.get(m.planId) ?? null) : null,
  }));
}