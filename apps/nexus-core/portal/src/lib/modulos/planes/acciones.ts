/**
 * MÓDULO PLANES (capa Services — dentro de la plantilla Gym).
 * Acciones server: alta de planes de membresía (Mensual, Trimestral, ...).
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/core/prisma";
import { requiereModuloActivo } from "@/lib/core/requiere-modulo";
import { str, din } from "@/lib/shared/form";

export async function crearPlan(input: FormData) {
  const { orgId } = await requiereModuloActivo("gym");
  const nombre = str(input, "nombre");
  const precio = din(input, "precio");
  const duracionDias = Math.round(din(input, "duracionDias")) || 30;
  if (!nombre || precio <= 0) redirect("/plantillas/gym/pagos?error=plan");

  await prisma.plan.create({ data: { orgId, nombre, precio, duracionDias } });
  revalidatePath("/plantillas/gym/pagos");
}