/**
 * MÓDULO PAGOS (capa Services — dentro de la plantilla Gym).
 * Acciones server: cobro de membresía y anulación.
 * Regla de la base: un pago NUNCA se borra — se anula con motivo.
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { MetodoPago } from "@prisma/client";
import { prisma } from "@/lib/core/prisma";
import { requiereModuloActivo } from "@/lib/core/requiere-modulo";
import { str, din } from "@/lib/shared/form";

/**
 * Cobra una membresía: registra el pago y actualiza el período del cliente.
 * El estado pasa a ACTIVO y el periodoFin lo da el plan (o fecha libre).
 */
export async function cobrarPago(input: FormData) {
  const { orgId } = await requiereModuloActivo("gym");
  const clienteId = str(input, "clienteId");
  if (!clienteId) redirect("/plantillas/gym/clientes");

  const planId = str(input, "planId") || null;
  const monto = din(input, "monto");
  const metodo = (str(input, "metodo") || "EFECTIVO").toUpperCase();

  const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, orgId } });
  if (!cliente) return;

  const plan = planId ? await prisma.plan.findFirst({ where: { id: planId, orgId } }) : null;

  const base = cliente.periodoFin && cliente.periodoFin > new Date() ? cliente.periodoFin : new Date();
  const dias = plan?.duracionDias ?? 30;
  const periodoFin = new Date(base);
  periodoFin.setDate(periodoFin.getDate() + dias);

  await prisma.pago.create({
    data: {
      orgId,
      clienteId,
      monto: monto || (plan?.precio ?? 0),
      metodo: metodo as MetodoPago,
      concepto: plan ? `${plan.nombre} — ${periodoFin.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}` : "Membresía",
      periodoInicio: base,
      periodoFin,
    },
  });

  await prisma.cliente.update({
    where: { id: clienteId },
    data: { periodoFin, estado: "ACTIVO", planId: plan?.id },
  });

  revalidatePath("/"); revalidatePath("/plantillas/gym");
  revalidatePath("/plantillas/gym/pagos");
  revalidatePath(`/plantillas/gym/clientes/${clienteId}`);
  redirect(`/plantillas/gym/clientes/${clienteId}?ok=pago`);
}

export async function anularPago(input: FormData) {
  const { orgId } = await requiereModuloActivo("gym");
  const id = str(input, "id");
  const motivo = str(input, "motivo");
  if (!id || !motivo) return;

  await prisma.pago.updateMany({ where: { id, orgId }, data: { anulado: true, motivoAnulacion: motivo } });
  revalidatePath("/"); revalidatePath("/plantillas/gym");
  revalidatePath("/plantillas/gym/pagos");
}