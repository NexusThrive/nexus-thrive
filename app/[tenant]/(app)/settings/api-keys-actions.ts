"use server";

import { revalidatePath } from "next/cache";
import { createApiKey, listApiKeys, revokeApiKey, type ApiEnvironment, type ApiKeyRow } from "@/lib/api/keys";
import { invalidScope } from "@/lib/api/scopes";
import { canManageTeam } from "@/lib/business/roles";
import { OPERATIONS } from "@/lib/operations/registry";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

/** Llaves de API del negocio (X.02). Solo quien maneja el equipo (dueño y administración). */
export type CreateKeyResult =
  | { ok: true; secret: string; row: ApiKeyRow }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
export type SimpleResult = { ok: true } | { ok: false; message: string };

const DENIED = { ok: false as const, message: "Solo el dueño o administración maneja las llaves de API." };
const MAX_ACTIVE_KEYS = 20;
const MAX_DAYS = 730;

async function manager(slug: string) {
  const ctx = await requireTenantContext(slug);
  return ctx && canManageTeam(ctx.role) ? ctx : null;
}

export async function createApiKeyAction(
  slug: string,
  input: { name: string; environment: string; scopes: string[]; expiresInDays: number | null },
): Promise<CreateKeyResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: { name: "Ponle un nombre para reconocerla (por ejemplo, «n8n»)." } };
  if (input.environment !== "live" && input.environment !== "test") return { ok: false, message: "El entorno no es válido." };
  const scopes = [...new Set(input.scopes)];
  const bad = scopes.length === 0 ? "(vacío)" : invalidScope(scopes, OPERATIONS);
  if (bad) return { ok: false, message: `El alcance «${bad}» no existe.` };
  const days = input.expiresInDays;
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > MAX_DAYS)) return { ok: false, message: "El vencimiento debe estar entre 1 y 730 días." };

  const active = (await listApiKeys(ctx.tenantId)).filter((k) => !k.revokedAt);
  if (active.length >= MAX_ACTIVE_KEYS) return { ok: false, message: `Ya hay ${MAX_ACTIVE_KEYS} llaves activas. Revoca alguna antes de crear otra.` };

  const created = await createApiKey(ctx.tenantId, {
    name,
    environment: input.environment as ApiEnvironment,
    scopes,
    expiresAt: days === null ? null : new Date(Date.now() + days * 86_400_000),
    createdById: ctx.memberId,
    // La llave nunca puede más que quien la crea: hereda su rol.
    createdByRole: ctx.role,
  });
  await logTenantAction(ctx, "BIZ_API_KEY_CREATE", { keyId: created.row.id, name, environment: input.environment, scopes });
  revalidatePath(`/${slug}/settings`);
  return { ok: true, secret: created.secret, row: created.row };
}

export async function revokeApiKeyAction(slug: string, id: string): Promise<SimpleResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const done = await revokeApiKey(ctx.tenantId, id);
  if (!done) return { ok: false, message: "No se encontró esa llave en tu negocio." };
  await logTenantAction(ctx, "BIZ_API_KEY_REVOKE", { keyId: id });
  revalidatePath(`/${slug}/settings`);
  return { ok: true };
}
