/**
 * MÓDULO CLIENTES (capa Services — dentro de la plantilla Gym).
 * Acciones server: alta, edición, congelar y reactivar socios.
 * Guard: la org debe tener el módulo de la plantilla ACTIVO.
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/core/prisma";
import { requiereModuloActivo } from "@/lib/core/requiere-modulo";
import { resolverPlanDeOrg } from "@/lib/modulos/clientes/consultas";
import { str } from "@/lib/shared/form";

export async function crearCliente(input: FormData) {
  const { orgId } = await requiereModuloActivo("gym");
  const nombre = str(input, "nombre");
  if (!nombre) redirect("/plantillas/gym/clientes?error=nombre");

  // El plan tiene que ser de ESTA org: sin esto, un `planId` manipulado
  // guardaba el cliente apuntando a un plan de otro negocio y la ficha
  // mostraba su nombre y su precio. Ver consultas.ts.
  const planPedido = str(input, "planId") || null;
  const planId = await resolverPlanDeOrg(planPedido, orgId);
  if (planPedido && !planId) redirect("/plantillas/gym/clientes?error=plan");

  const cliente = await prisma.cliente.create({
    data: {
      orgId,
      nombre,
      documento: str(input, "documento") || null,
      telefono: str(input, "telefono") || null,
      email: str(input, "email") || null,
      fechaNacimiento: str(input, "fechaNacimiento") ? new Date(str(input, "fechaNacimiento")) : null,
      planId,
      nota: str(input, "nota") || null,
    },
  });

  // Si el cliente nace con membresía definida, registrar el primer pago es
  // responsabilidad del dueño desde el perfil (no se inventan pagos acá).
  revalidatePath("/plantillas/gym/clientes");
  redirect(`/plantillas/gym/clientes/${cliente.id}`);
}

export async function actualizarCliente(input: FormData) {
  const { orgId } = await requiereModuloActivo("gym");
  const id = str(input, "id");
  if (!id) return;
  const nombre = str(input, "nombre");
  if (!nombre) return;

  // Misma validación que en el alta (ver consultas.ts). Si mandan un plan
  // que no es de esta org no se escribe NADA: actualizar el resto de campos
  // dejando la membresía a medias sería peor que no hacer el cambio.
  const planPedido = str(input, "planId") || null;
  const planId = await resolverPlanDeOrg(planPedido, orgId);
  if (planPedido && !planId) return;

  await prisma.cliente.updateMany({
    where: { id, orgId },
    data: {
      nombre,
      documento: str(input, "documento") || null,
      telefono: str(input, "telefono") || null,
      email: str(input, "email") || null,
      fechaNacimiento: str(input, "fechaNacimiento") ? new Date(str(input, "fechaNacimiento")) : null,
      planId,
      nota: str(input, "nota") || null,
    },
  });

  revalidatePath(`/plantillas/gym/clientes/${id}`);
}

export async function congelarCliente(input: FormData) {
  const { orgId } = await requiereModuloActivo("gym");
  const id = str(input, "id");
  if (!id) return;
  await prisma.cliente.updateMany({ where: { id, orgId }, data: { estado: "CONGELADO" } });
  revalidatePath(`/plantillas/gym/clientes/${id}`);
  revalidatePath("/plantillas/gym/clientes");
}

export async function reactivarCliente(input: FormData) {
  const { orgId } = await requiereModuloActivo("gym");
  const id = str(input, "id");
  if (!id) return;
  await prisma.cliente.updateMany({ where: { id, orgId }, data: { estado: "ACTIVO" } });
  revalidatePath(`/plantillas/gym/clientes/${id}`);
  revalidatePath("/plantillas/gym/clientes");
}