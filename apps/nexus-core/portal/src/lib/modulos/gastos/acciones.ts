/**
 * MÓDULO GASTOS (capa Services — dentro de la plantilla Gym).
 * Acciones server: registro y anulación de gastos del negocio.
 * Regla de la base: un gasto NUNCA se borra — se anula con motivo.
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { CategoriaGasto } from "@prisma/client";
import { prisma } from "@/lib/core/prisma";
import { requiereModuloActivo } from "@/lib/core/requiere-modulo";
import { str, din } from "@/lib/shared/form";

const GASTO_ENUM = ["ARRIENDO", "NOMINA", "SERVICIOS", "MANTENIMIENTO", "PUBLICIDAD", "OTROS"];

export async function registrarGasto(input: FormData) {
  const { orgId } = await requiereModuloActivo("gastos");
  const monto = din(input, "monto");
  const categoria = (str(input, "categoria") || "OTROS").toUpperCase();
  if (monto <= 0) redirect("/modulos/gastos?error=monto");

  await prisma.gasto.create({
    data: {
      orgId,
      monto,
      categoria: GASTO_ENUM.includes(categoria) ? (categoria as CategoriaGasto) : "OTROS",
      descripcion: str(input, "descripcion") || null,
    },
  });

  revalidatePath("/"); revalidatePath("/plantillas/gym");
  revalidatePath("/modulos/gastos");
}

export async function anularGasto(input: FormData) {
  const { orgId } = await requiereModuloActivo("gastos");
  const id = str(input, "id");
  const motivo = str(input, "motivo");
  if (!id || !motivo) return;
  await prisma.gasto.updateMany({ where: { id, orgId }, data: { anulado: true, motivoAnulacion: motivo } });
  revalidatePath("/"); revalidatePath("/plantillas/gym");
  revalidatePath("/modulos/gastos");
}