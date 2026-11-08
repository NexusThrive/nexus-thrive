"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/core/auth/permissions";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import * as config from "@/lib/business/growth/pipeline-config-db";

export type ConfigResult = { ok: true; message?: string } | { ok: false; message: string };

/** Cambios de la configuración del CRM: solo quien gobierna el negocio (`business.manage`). */
async function guard(slug: string) {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return { ctx: null, error: { ok: false as const, message: "No tienes acceso a este negocio." } };
  if (!can(ctx.role, "business.manage")) return { ctx: null, error: { ok: false as const, message: "Solo el dueño o un administrador cambia la configuración del CRM." } };
  return { ctx, error: null };
}

async function apply(slug: string, what: string, fn: (tenantId: string) => Promise<{ ok: true } | { ok: false; message: string }>, message: string): Promise<ConfigResult> {
  const { ctx, error } = await guard(slug);
  if (!ctx) return error;
  const r = await fn(ctx.tenantId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: `config_${what}` });
  revalidatePath(`/${slug}/crm`);
  revalidatePath(`/${slug}/crm/configuracion`);
  return { ok: true, message };
}

export const createStageAction = async (slug: string, name: string, probability: number) => apply(slug, "stage_create", (t) => config.createStage(t, name, probability), "Etapa creada");
export const updateStageAction = async (slug: string, id: string, patch: { name?: string; probability?: number }) => apply(slug, "stage_update", (t) => config.updateStage(t, id, patch), "Etapa guardada");
export const moveStageOrderAction = async (slug: string, id: string, delta: -1 | 1) => apply(slug, "stage_order", (t) => config.moveStageOrder(t, id, delta), "Orden guardado");
export const deleteStageAction = async (slug: string, id: string) => apply(slug, "stage_delete", (t) => config.deleteStage(t, id), "Etapa eliminada");
export const addReasonAction = async (slug: string, name: string) => apply(slug, "reason_add", (t) => config.addLostReason(t, name), "Motivo agregado");
export const renameReasonAction = async (slug: string, id: string, name: string) => apply(slug, "reason_rename", (t) => config.renameLostReason(t, id, name), "Motivo guardado");
export const deleteReasonAction = async (slug: string, id: string) => apply(slug, "reason_delete", (t) => config.deleteLostReason(t, id), "Motivo eliminado");
export const addTagAction = async (slug: string, name: string) => apply(slug, "tag_add", (t) => config.addTag(t, name), "Etiqueta agregada");
export const deleteTagAction = async (slug: string, id: string) => apply(slug, "tag_delete", (t) => config.deleteTag(t, id), "Etiqueta quitada de la lista");
export const saveTeamAction = async (slug: string, id: string | null, name: string, memberIds: string[]) => apply(slug, "team_save", (t) => config.saveTeam(t, id, name, memberIds), "Equipo guardado");
export const deleteTeamAction = async (slug: string, id: string) => apply(slug, "team_delete", (t) => config.deleteTeam(t, id), "Equipo eliminado");
