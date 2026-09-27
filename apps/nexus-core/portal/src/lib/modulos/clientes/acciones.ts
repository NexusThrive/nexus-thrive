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
import { str } from "@/lib/shared/form";

export async function crearCliente(input: FormData) {
  const { orgId } = await requiereModuloActivo("gym");
  const nombre = str(input, "nombre");
  if (!nombre) redirect("/plantillas/gym/clientes?error=nombre");

  const planId = str(input, "planId") || null;

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

  await prisma.cliente.updateMany({
    where: { id, orgId },
    data: {
      nombre,
      documento: str(input, "documento") || null,
      telefono: str(input, "telefono") || null,
      email: str(input, "email") || null,
      fechaNacimiento: str(input, "fechaNacimiento") ? new Date(str(input, "fechaNacimiento")) : null,
      planId: str(input, "planId") || null,
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