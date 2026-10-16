"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/tenant-context";
import { validateCreateFieldLogEntry } from "./validators";
import { readImageUpload } from "@/lib/image-upload";

export type ActionState = {
  status: "idle" | "ok" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
  values?: Record<string, unknown>;
};

export async function getOrCreateFieldLogAction(
  tenantSlug: string,
  projectId: string,
  _prev: ActionState,
  _form: FormData,
): Promise<ActionState> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { status: "error", message: "Debes iniciar sesión para continuar." };
    }
    const context = await requireTenantContext(tenantSlug);
    if (!context) {
      return { status: "error", message: "No tienes acceso a este negocio." };
    }
    await context.tenantDb.fieldLog.getOrCreateLog(projectId);
    revalidatePath(`/${tenantSlug}/projects/${projectId}`);
    return { status: "ok" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al inicializar la bitácora.";
    return { status: "error", message };
  }
}

export async function createFieldLogEntryAction(
  tenantSlug: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Varias fotos por anotación: `getAll` (fromEntries se queda con una sola).
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  raw.photoUrls = formData
    .getAll("photoUrls")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const files = formData.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length + (raw.photoUrls as string[]).length > 10) {
    return { status: "error", message: "Máximo 10 fotografías por anotación." };
  }
  const uploads: { data: Uint8Array; mimeType: string }[] = [];
  for (const file of files) {
    const single = new FormData();
    single.set("photo", file);
    const photo = await readImageUpload(single, "photo");
    if (photo.status === "error") {
      return { status: "error", message: `${file.name}: ${photo.message}` };
    }
    if (photo.status === "ok") uploads.push({ data: photo.data, mimeType: photo.mimeType });
  }
  delete raw.photos;
  const validation = validateCreateFieldLogEntry(raw);
  if (!validation.ok) {
    return {
      status: "error",
      message: "Revisa los campos del formulario.",
      errors: validation.errors,
      values: raw,
    };
  }
  const values = validation.values;

  try {
    const { userId } = await auth();
    if (!userId) {
      return { status: "error", message: "Debes iniciar sesión para continuar." };
    }
    const context = await requireTenantContext(tenantSlug);
    if (!context) {
      return { status: "error", message: "No tienes acceso a este negocio." };
    }
    // El autor se deriva de la sesión, nunca del formulario (anti-suplantación).
    const member = await context.tenantDb.users.findByClerkUserId(context.userId);
    const authorName = member?.name?.trim() || member?.email || "Usuario";
    // Fotos subidas: se guardan en el sistema (no como enlaces externos).
    const stored: string[] = [];
    for (const upload of uploads) {
      const imageId = await context.tenantDb.apu.storeImage(upload.data, upload.mimeType);
      stored.push(`/api/apu-images/${imageId}`);
    }
    values.photoUrls = [...values.photoUrls, ...stored];
    // Obtener la bitácora del proyecto
    const log = await context.tenantDb.fieldLog.getOrCreateLog(projectId);
    await context.tenantDb.fieldLog.createEntry(log.id, {
      type: values.type,
      entryDate: values.entryDate,
      title: values.title,
      description: values.description,
      weather: values.weather,
      laborCount: values.laborCount,
      authorName,
      authorRole: context.role,
      photoUrls: values.photoUrls,
      budgetItemId: String(raw.budgetItemId ?? "").trim() || null,
    });
    revalidatePath(`/${tenantSlug}/projects/${projectId}`);
    return { status: "ok" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al crear la anotación.";
    return { status: "error", message, values: raw };
  }
}

export async function deleteFieldLogEntryAction(
  tenantSlug: string,
  projectId: string,
  entryId: string,
  _prev: ActionState,
  _form: FormData,
): Promise<ActionState> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { status: "error", message: "Debes iniciar sesión para continuar." };
    }
    const context = await requireTenantContext(tenantSlug);
    if (!context) {
      return { status: "error", message: "No tienes acceso a este negocio." };
    }
    // Obtener la bitácora para validar pertenencia
    const log = await context.tenantDb.fieldLog.getLog(projectId);
    if (!log) {
      return { status: "error", message: "Bitácora no encontrada." };
    }
    await context.tenantDb.fieldLog.deleteEntry(log.id, entryId);
    revalidatePath(`/${tenantSlug}/projects/${projectId}`);
    return { status: "ok" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al eliminar la anotación.";
    return { status: "error", message };
  }
}