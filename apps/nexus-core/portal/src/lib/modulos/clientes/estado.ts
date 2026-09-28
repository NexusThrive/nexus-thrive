/**
 * MÓDULO CLIENTES — estado y período de la membresía.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------
 * `Membresia.estado` y `Membresia.periodoFin` son una CACHÉ derivada de los
 * pagos (ver schema/modulos/membresias.prisma). La regla es UNA sola y antes
 * estaba escrita en tres lugares distintos, con resultados distintos:
 *
 *   1. `plantillas/gym/dashboard.ts` la derivaba al LEER (un GET escribía).
 *   2. `pagos/acciones.ts` la pisaba al COBRAR.
 *   3. `anularPago` NO la tocaba: anular el cobro dejaba al cliente con el
 *      período extendido y en ACTIVO — la membresía anulada seguía vigente.
 *
 * Ahora hay UN dueño de la regla (este archivo) y cada módulo que la necesita
 * la llama. También se corrige el acoplamiento: el dashboard de la plantilla
 * Gym ya no escribe en la tabla de otro módulo, solo lo llama.
 *
 * REGLA
 * -----
 *   - El período vigente es el `periodoFin` MÁS ALTO de los pagos NO anulados
 *     de la membresía. Si no queda ningún pago vivo → `periodoFin = null` y la
 *     membresía queda VENCIDA.
 *   - `CONGELADO` es una decisión del dueño (pausa) y NUNCA se pisa sola: si
 *     el período vence, la membresía sigue congelada, no "activa" ni "vencida".
 *     Solo `cobrarPago` la saca de CONGELADO, y a propósito.
 *   - Sin membresía (cliente genérico sin plan) no hay nada que recalcular.
 */

import { prisma } from "@/lib/core/prisma";

/** Hoy a medianoche local: comparar días completos, no horas de reloj. */
function hoyMedianoche(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Recalcula `periodoFin` y `estado` de LA membresía de un cliente a partir de
 * sus pagos vivos. Scope por `orgId` en todas las consultas: aunque le pasen
 * un `clienteId` ajeno, no se lee ni se escribe nada de otra organización.
 */
export async function recalcularMembresia(clienteId: string, orgId: string): Promise<void> {
  const [membresia, ultimoPago] = await Promise.all([
    prisma.membresia.findFirst({
      where: { orgId, clienteId },
      select: { id: true, estado: true },
    }),
    prisma.pago.findFirst({
      where: { orgId, membresia: { clienteId }, anulado: false },
      orderBy: { periodoFin: "desc" },
      select: { periodoFin: true },
    }),
  ]);

  // Sin membresía (cliente sin plan) o cliente inexistente en esta org: no se
  // inventa ni se toca nada.
  if (!membresia) return;

  const periodoFin = ultimoPago?.periodoFin ?? null;
  const vigente = periodoFin !== null && periodoFin >= hoyMedianoche();
  const estado = membresia.estado === "CONGELADO" ? "CONGELADO" : vigente ? "ACTIVO" : "VENCIDO";

  await prisma.membresia.updateMany({ where: { id: membresia.id, orgId }, data: { periodoFin, estado } });
}

/**
 * Refleja el estado en el listado sin cambiar el período: solo marca como
 * VENCIDA a la membresía que ya venció y reactiva a la que tiene período
 * vigente. Una CONGELADA no se toca. Se usa en el dashboard, donde interesa
 * que el número que se muestra sea real aunque el socio no haya pasado por un
 * cobro.
 */
export async function derivarEstadosMembresias(orgId: string): Promise<void> {
  const hoy = hoyMedianoche();

  await prisma.membresia.updateMany({
    where: { orgId, estado: "ACTIVO", periodoFin: { not: null, lt: hoy } },
    data: { estado: "VENCIDO" },
  });

  await prisma.membresia.updateMany({
    where: { orgId, estado: "VENCIDO", periodoFin: { not: null, gte: hoy } },
    data: { estado: "ACTIVO" },
  });
}