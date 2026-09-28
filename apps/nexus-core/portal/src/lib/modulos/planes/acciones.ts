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

const LISTADO = "/modulos/pagos";

/** Duración razonable de un plan: de 1 día a 5 años. */
const DIAS_MIN = 1;
const DIAS_MAX = 1825;

/** Crea un plan de membresía (ej: Mensual, Trimestral) para esta organización. */
export async function crearPlan(input: FormData) {
  const { orgId } = await requiereModuloActivo("planes");
  const nombre = str(input, "nombre");
  const precio = din(input, "precio");
  if (!nombre || precio <= 0) redirect(`${LISTADO}?error=plan`);

  // `Math.round(din(...)) || 30` tenía dos agujeros:
  //   - NEGATIVO: `-5 || 30` da -5 (es truthy), y al cobrar, `periodoFin`
  //     retrocedía en vez de avanzar — la membresía "caducaba" al instante.
  //   - ABSURDO: 999999 días creaba planes de milenios.
  // Ahora se acota; si no viene nada usable, 30 días.
  const duracionPedida = Math.round(din(input, "duracionDias"));
  const duracionDias = Number.isFinite(duracionPedida) && duracionPedida >= DIAS_MIN
    ? Math.min(duracionPedida, DIAS_MAX)
    : 30;

  await prisma.plan.create({ data: { orgId, nombre, precio, duracionDias } });
  revalidatePath(LISTADO);
}