/**
 * MÓDULO PAGOS (capa Services).
 * Acciones server: cobro de membresía y anulación.
 * Regla de la base: un pago NUNCA se borra — se anula con motivo.
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { MetodoPago } from "@prisma/client";
import { prisma } from "@/lib/core/prisma";
import { requiereModuloActivo } from "@/lib/core/requiere-modulo";
import { resolverPlanDeOrg } from "@/lib/modulos/clientes/consultas";
import { recalcularMembresia } from "@/lib/modulos/clientes/estado";
import { str, din } from "@/lib/shared/form";

/**
 * Métodos de pago válidos. Se comparan contra la lista en vez de castear:
 * `metodo as MetodoPago` con un valor inventado llegaba al enum de Postgres y
 * reventaba la acción con un error 500 en vez de un rechazo limpio.
 */
const METODOS: readonly string[] = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "NEQUI", "OTRO"];

const FICHA = "/modulos/clientes";
const LISTADO = "/modulos/pagos";
const DASHBOARD = "/plantillas/gym";

/** Revalida todo lo que un cobro o una anulación puede haber cambiado. */
function revalidarCobro(clienteId?: string) {
  revalidatePath("/");
  revalidatePath(DASHBOARD);
  revalidatePath(LISTADO);
  if (clienteId) revalidatePath(`${FICHA}/${clienteId}`);
}

/**
 * Cobra una membresía: registra el pago y actualiza el período del cliente.
 * El estado pasa a ACTIVO y el periodoFin lo da el plan (o fecha libre).
 */
export async function cobrarPago(input: FormData) {
  const { orgId } = await requiereModuloActivo("pagos");
  const clienteId = str(input, "clienteId");
  if (!clienteId) redirect(LISTADO);

  // El plan tiene que ser de ESTA org (misma defensa que el alta de cliente,
  // ver modulos/clientes/consultas.ts). Si mandan uno ajeno, NO se cobra nada.
  const planPedido = str(input, "planId") || null;
  const planId = await resolverPlanDeOrg(planPedido, orgId);
  if (planPedido && !planId) redirect(`${LISTADO}?error=plan`);

  const plan = planId ? await prisma.plan.findFirst({ where: { id: planId, orgId } }) : null;

  // `din` no distingue "vacío" de "0". Un monto NEGATIVO se usaba tal cual
  // (0 y negativo son truthy) y quedaba un pago negativo que RESTABA en el
  // dashboard de ingresos. Ahora se rechaza; vacío significa "usar el precio
  // del plan" (o 0 en el mes libre).
  const montoIngresado = din(input, "monto");
  if (montoIngresado < 0) redirect(`${LISTADO}?error=monto`);
  const monto = montoIngresado > 0 ? montoIngresado : Number(plan?.precio ?? 0);

  const metodoIngresado = (str(input, "metodo") || "EFECTIVO").toUpperCase();
  const metodo = (METODOS.includes(metodoIngresado) ? metodoIngresado : "EFECTIVO") as MetodoPago;

  const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, orgId } });
  if (!cliente) redirect(`${LISTADO}?error=cliente`);

  // Encadenar sobre el período que ya venía: cobrar dos meses seguidos no
  // reinicia el contador, lo extiende.
  const base = cliente.periodoFin && cliente.periodoFin > new Date() ? cliente.periodoFin : new Date();
  const dias = plan?.duracionDias ?? 30;
  const periodoFin = new Date(base);
  periodoFin.setDate(periodoFin.getDate() + dias);

  // El pago y el estado del cliente van en UNA transacción: antes eran dos
  // escrituras sueltas y, si la segunda fallaba, quedaba un cobro registrado
  // que no actualizaba la membresía.
  await prisma.$transaction([
    prisma.pago.create({
      data: {
        orgId,
        clienteId,
        monto,
        metodo,
        concepto: plan
          ? `${plan.nombre} — ${periodoFin.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}`
          : "Membresía",
        periodoInicio: base,
        periodoFin,
      },
    }),
    prisma.cliente.updateMany({
      where: { id: clienteId, orgId },
      data: { periodoFin, estado: "ACTIVO", planId: plan?.id ?? null },
    }),
  ]);

  revalidarCobro(clienteId);
  redirect(`${FICHA}/${clienteId}?ok=pago`);
}

/**
 * Anula un cobro con motivo (nada se borra).
 *
 * ANTES: marcar `anulado` era lo único. La membresía NO se tocaba, así que
 * anular el último cobro dejaba al socio con el período extender y en ACTIVO:
 * la membresía anulada seguía vigente y el dashboard lo contaba como cobrado.
 * Ahora, tras anular, el período se recalcula sobre los pagos que QUEDAN vivos
 * (`recalcularMembresia`).
 */
export async function anularPago(input: FormData) {
  const { orgId } = await requiereModuloActivo("pagos");
  const id = str(input, "id");
  const motivo = str(input, "motivo");
  if (!id || !motivo) return;

  // Se lee el cliente ANTES de anular: hay que saber a quién pertenece el pago
  // para recalcular su membresía, y el `where` lleva `orgId` para no tocar un
  // pago de otra organización.
  const pago = await prisma.pago.findFirst({
    where: { id, orgId },
    select: { id: true, clienteId: true },
  });
  if (!pago) return;

  await prisma.pago.updateMany({ where: { id, orgId }, data: { anulado: true, motivoAnulacion: motivo } });

  await recalcularMembresia(pago.clienteId, orgId);

  revalidarCobro(pago.clienteId);
}
