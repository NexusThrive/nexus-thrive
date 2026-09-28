/**
 * MÓDULO CLIENTES (capa Services).
 * Acciones server: alta, edición, congelar y reactivar clientes.
 * Guard: la org debe tener el módulo CLIENTES activo.
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/core/prisma";
import { requiereModuloActivo } from "@/lib/core/requiere-modulo";
import { resolverPlanDeOrg } from "@/lib/modulos/clientes/consultas";
import { recalcularMembresia } from "@/lib/modulos/clientes/estado";
import { str } from "@/lib/shared/form";

const LISTADO = "/modulos/clientes";

/** Resultado de leer una fecha opcional de un formulario. */
type FechaOpcional =
  | { ok: true; valor: Date | null }
  | { ok: false }; // el campo venía y no era una fecha válida

/**
 * Lee una fecha de `<input type="date">` de forma segura.
 *
 * `new Date("cualquier cosa")` devuelve `Invalid Date` (no lanza), y Prisma
 * lo serializa como error al insertar → 500 en vez de un rechazo limpio.
 * Se valida el round-trip: se reconstruye la fecha y se compara con el texto,
 * así que "2026-02-30" (que JS "corrige" a marzo) también se rechaza.
 */
function fechaOpcional(input: FormData, key: string): FechaOpcional {
  const raw = str(input, key);
  if (!raw) return { ok: true, valor: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { ok: false };

  const d = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return { ok: false };

  const normalizado =
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (normalizado !== raw) return { ok: false };

  return { ok: true, valor: d };
}

export async function crearCliente(input: FormData) {
  const { orgId } = await requiereModuloActivo("clientes");
  const nombre = str(input, "nombre");
  if (!nombre) redirect(`${LISTADO}?error=nombre`);

  const fecha = fechaOpcional(input, "fechaNacimiento");
  if (!fecha.ok) redirect(`${LISTADO}?error=fecha`);

  // El plan tiene que ser de ESTA org: sin esto, un `planId` manipulado
  // guardaba el cliente apuntando a un plan de otro negocio y la ficha
  // mostraba su nombre y su precio. Ver consultas.ts.
  const planPedido = str(input, "planId") || null;
  const planId = await resolverPlanDeOrg(planPedido, orgId);
  if (planPedido && !planId) redirect(`${LISTADO}?error=plan`);

  const datos = {
    orgId,
    nombre,
    documento: str(input, "documento") || null,
    telefono: str(input, "telefono") || null,
    email: str(input, "email") || null,
    fechaNacimiento: fecha.valor,
    nota: str(input, "nota") || null,
  };

  // El cliente y su membresía van en UNA transacción: si nace con plan, nace
  // con membresía (estado ACTIVO por defecto; el vencimiento lo da el primer
  // cobro — no se inventan pagos acá).
  const cliente = planId
    ? await prisma.$transaction(async (tx) => {
        const c = await tx.cliente.create({ data: datos });
        await tx.membresia.create({ data: { orgId, clienteId: c.id, planId } });
        return c;
      })
    : await prisma.cliente.create({ data: datos });

  // Si el cliente nace con membresía definida, registrar el primer pago es
  // responsabilidad del dueño desde el perfil (no se inventan pagos acá).
  revalidatePath(LISTADO);
  redirect(`${LISTADO}/${cliente.id}`);
}

export async function actualizarCliente(input: FormData) {
  const { orgId } = await requiereModuloActivo("clientes");
  const id = str(input, "id");
  if (!id) return;
  const nombre = str(input, "nombre");
  if (!nombre) return;

  const fecha = fechaOpcional(input, "fechaNacimiento");
  if (!fecha.ok) return;

  // Misma validación que en el alta (ver consultas.ts). Si mandan un plan
  // que no es de esta org no se escribe NADA: actualizar el resto de campos
  // dejando la membresía a medias sería peor que no hacer el cambio.
  const planPedido = str(input, "planId") || null;
  const planId = await resolverPlanDeOrg(planPedido, orgId);
  if (planPedido && !planId) return;

  const { count } = await prisma.cliente.updateMany({
    where: { id, orgId },
    data: {
      nombre,
      documento: str(input, "documento") || null,
      telefono: str(input, "telefono") || null,
      email: str(input, "email") || null,
      fechaNacimiento: fecha.valor,
      nota: str(input, "nota") || null,
    },
  });
  if (count === 0) return; // cliente inexistente: nada que tocar

  // La membresía se actualiza SOLO si el usuario la cambió: si mandan un plan
  // se crea/actualiza; si mandan vacío se le quita el plan a la membresía que
  // ya existía (no se inventa una membresía sin plan ni se borra la existente:
  // borrarla arrastraría el historial de pagos).
  if (planId) {
    await prisma.membresia.upsert({
      where: { clienteId: id },
      create: { orgId, clienteId: id, planId },
      update: { planId },
    });
  } else {
    await prisma.membresia.updateMany({ where: { orgId, clienteId: id }, data: { planId: null } });
  }

  revalidatePath(`${LISTADO}/${id}`);
}

export async function congelarCliente(input: FormData) {
  const { orgId } = await requiereModuloActivo("clientes");
  const id = str(input, "id");
  if (!id) return;
  // La pausa es un estado de la MEMBRESÍA (Eje B): sin membresía no hay nada
  // que congelar.
  await prisma.membresia.updateMany({ where: { orgId, clienteId: id }, data: { estado: "CONGELADO" } });
  revalidatePath(`${LISTADO}/${id}`);
  revalidatePath(LISTADO);
}

export async function reactivarCliente(input: FormData) {
  const { orgId } = await requiereModuloActivo("clientes");
  const id = str(input, "id");
  if (!id) return;
  // Reactivar NO devuelve a ACTIVO a ciegas: si el período ya venció, el
  // cliente queda VENCIDO igual. `cobrarPago` es lo que reactiva de verdad.
  await recalcularMembresia(id, orgId);
  revalidatePath(`${LISTADO}/${id}`);
  revalidatePath(LISTADO);
}