/**
 * MÓDULO CLIENTES — estado y período de la membresía.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------
 * `Cliente.estado` y `Cliente.periodoFin` son una CACHÉ derivada de los pagos
 * (ver schema/modulos/clientes.prisma). La regla es UNA sola y antes estaba
 * escrita en tres lugares distintos, con resultados distintos:
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
 *   - El período vigente es el `periodoFin` MÁS ALTO de los pagos NO anulados.
 *     Si no queda ningún pago vivo → `periodoFin = null` y el cliente queda
 *     VENCIDO (no hay membresía registrada).
 *   - `CONGELADO` es una decisión del dueño (pausa) y NUNCA se pisa sola: si
 *     el período vence, el socio sigue congelado, no "activo" ni "vencido".
 *     Solo `cobrarPago` lo saca de CONGELADO, y a propósito.
 */

import { prisma } from "@/lib/core/prisma";

/** Hoy a medianoche local: comparar días completos, no horas de reloj. */
function hoyMedianoche(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Recalcula `periodoFin` y `estado` de UN cliente a partir de sus pagos vivos.
 * Scope por `orgId` en todas las consultas: aunque le pasen un `clienteId`
 * ajeno, no se lee ni se escribe nada de otra organización.
 */
export async function recalcularMembresia(clienteId: string, orgId: string): Promise<void> {
  const [cliente, ultimoPago] = await Promise.all([
    prisma.cliente.findFirst({
      where: { id: clienteId, orgId },
      select: { estado: true },
    }),
    prisma.pago.findFirst({
      where: { clienteId, orgId, anulado: false },
      orderBy: { periodoFin: "desc" },
      select: { periodoFin: true },
    }),
  ]);

  // Cliente inexistente en esta org: no se inventa ni se toca nada.
  if (!cliente) return;

  const periodoFin = ultimoPago?.periodoFin ?? null;
  const vigente = periodoFin !== null && periodoFin >= hoyMedianoche();
  const estado = cliente.estado === "CONGELADO" ? "CONGELADO" : vigente ? "ACTIVO" : "VENCIDO";

  await prisma.cliente.updateMany({ where: { id: clienteId, orgId }, data: { periodoFin, estado } });
}

/**
 * Refleja el estado en el listado sin cambiar el período: solo marca como
 * VENCIDO a quien ya venció y reactiva a quien tiene período vigente. Un
 * CONGELADO no se toca. Se usa en el dashboard, donde interesta que el número
 * que se muestra sea real aunque el cliente no haya pasado por un cobro.
 */
export async function derivarEstadosClientes(orgId: string): Promise<void> {
  const hoy = hoyMedianoche();

  await prisma.cliente.updateMany({
    where: { orgId, estado: "ACTIVO", periodoFin: { not: null, lt: hoy } },
    data: { estado: "VENCIDO" },
  });

  await prisma.cliente.updateMany({
    where: { orgId, estado: "VENCIDO", periodoFin: { not: null, gte: hoy } },
    data: { estado: "ACTIVO" },
  });
}
