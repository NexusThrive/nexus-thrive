"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { NOTE_MAX_LENGTH } from "@/lib/customer-notes";

export type NoteFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  /** Se devuelve el contenido sin trim para que el form pueda restaurarlo. */
  content?: string;
};

/** Contexto verificado: Clerk → tenant activo → miembro (autor de la nota). */
type NoteContext = {
  tenantId: string;
  tenantSlug: string;
  memberId: string;
};

async function requireTenantContext(
  tenantSlug: string,
): Promise<NoteContext | null> {
  if (!tenantSlug || tenantSlug.trim() === "") {
    return null;
  }
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    return null;
  }
  const tenantDb = createTenantDb(tenantRecord.id);
  const member = await tenantDb.users.findByClerkUserId(userId);
  if (!member) {
    return null;
  }
  return {
    tenantId: tenantRecord.id,
    tenantSlug,
    memberId: member.id,
  };
}

/**
 * Agrega una nota interna sobre un cliente (Ficha 360°).
 * Cadena de seguridad obligatoria:
 * Clerk → tenant activo → customerId → el cliente pertenece a ESTE tenant →
 * valida contenido → guarda (scoped a tenantId) → revalida la ruta.
 */
export async function createCustomerNoteAction(
  _prevState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return { status: "error", message: "No tienes acceso a este negocio.", content };
  }

  if (!customerId) {
    return { status: "error", message: "Falta el identificador del cliente.", content };
  }
  if (!content) {
    return { status: "error", message: "La nota no puede estar vacía.", content };
  }
  if (content.length > NOTE_MAX_LENGTH) {
    return {
      status: "error",
      message: `La nota no puede superar los ${NOTE_MAX_LENGTH} caracteres.`,
      content,
    };
  }

  const tenantDb = createTenantDb(context.tenantId);

  // El customerId de la URL NUNCA se usa sin verificar pertenencia al tenant.
  const customer = await tenantDb.customers.get(customerId);
  if (!customer) {
    return { status: "error", message: "El cliente no existe en este negocio.", content };
  }

  await tenantDb.customerNotes.create({
    customerId,
    content,
    createdBy: context.memberId,
  });

  revalidatePath(`/${tenantSlug}/crm/${customerId}`);
  return { status: "ok", message: "Nota agregada." };
}