import { randomBytes } from "node:crypto";
import { db } from "@/prisma/db";
import { msOf, toInstant } from "@/lib/events/instant";
import { decryptSecret, encryptSecret } from "@/lib/events/secrets";
import { adapterFor } from "./registry";
import type { Environment, ProviderCredentials } from "./types";

/** Conexiones de un negocio con proveedores externos. Las credenciales nunca salen de aquí. */
export type ConnectionRow = {
  id: string;
  kind: string;
  provider: string;
  environment: Environment;
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  lastCheckedAt: string | null;
  lastError: string | null;
  /** Ruta (sin dominio) a la que el proveedor debe enviar sus webhooks. */
  webhookPath: string;
};

export const webhookPath = (provider: string, id: string) => `/api/webhooks/providers/${provider}/${id}`;

const toRow = (c: Record<string, unknown>): ConnectionRow => ({
  id: String(c.id),
  kind: String(c.kind),
  provider: String(c.provider),
  environment: c.environment === "production" ? "production" : "sandbox",
  status: c.status === "CONNECTED" || c.status === "ERROR" ? c.status : "DISCONNECTED",
  lastCheckedAt: msOf(c.lastCheckedAt) === null ? null : new Date(msOf(c.lastCheckedAt) as number).toISOString(),
  lastError: (c.lastError as string | null) ?? null,
  webhookPath: webhookPath(String(c.provider), String(c.id)),
});

export const encryptCredentials = (credentials: ProviderCredentials) => encryptSecret(JSON.stringify(credentials));
export const decryptCredentials = (stored: string): ProviderCredentials => JSON.parse(decryptSecret(stored)) as ProviderCredentials;

export type ConnectResult = { ok: true; row: ConnectionRow; generated?: ProviderCredentials } | { ok: false; message: string };

export async function connectProvider(
  tenantId: string,
  input: { provider: string; environment: Environment; credentials?: ProviderCredentials },
): Promise<ConnectResult> {
  const adapter = adapterFor(input.provider);
  if (!adapter) return { ok: false, message: `El proveedor «${input.provider}» no está disponible.` };
  if (adapter.provider === "sandbox" && input.environment !== "sandbox") return { ok: false, message: "La pasarela de prueba solo funciona en sandbox." };

  // La pasarela de prueba genera su propio secreto de webhook (se muestra una vez).
  const generated: ProviderCredentials = {};
  const credentials: ProviderCredentials = { ...(input.credentials ?? {}) };
  if (adapter.provider === "sandbox" && !credentials.webhookSecret) {
    generated.webhookSecret = `whsec_sbx_${randomBytes(24).toString("hex")}`;
    credentials.webhookSecret = generated.webhookSecret;
  }
  const missing = adapter.requiredCredentials.find((k) => !credentials[k]?.trim());
  if (missing) return { ok: false, message: `Falta «${missing}».` };

  const existing = await db.orm.public.ExternalConnection.where({ tenantId, kind: adapter.kind, provider: adapter.provider, environment: input.environment }).first();
  if (existing && existing.status !== "DISCONNECTED") return { ok: false, message: "Ya hay una conexión activa con este proveedor y entorno." };

  const checked = await adapter.check(credentials);
  const fields = {
    status: checked.ok ? "CONNECTED" : "ERROR",
    credentialsEnc: encryptCredentials(credentials),
    credentialsKeyId: "v1",
    lastCheckedAt: toInstant(Date.now()),
    lastError: checked.ok ? null : checked.message,
  };
  const row = existing
    ? await db.orm.public.ExternalConnection.where({ id: existing.id, tenantId }).update(fields)
    : await db.orm.public.ExternalConnection.create({ tenantId, kind: adapter.kind, provider: adapter.provider, environment: input.environment, ...fields });
  if (!row) return { ok: false, message: "No se pudo guardar la conexión." };
  if (!checked.ok) return { ok: false, message: checked.message };
  return { ok: true, row: toRow(row as unknown as Record<string, unknown>), ...(Object.keys(generated).length ? { generated } : {}) };
}

export async function listConnections(tenantId: string): Promise<ConnectionRow[]> {
  const rows = await db.orm.public.ExternalConnection.where({ tenantId }).orderBy((c) => c.createdAt.desc()).all();
  return rows.map((r) => toRow(r as unknown as Record<string, unknown>));
}

/** Desconecta: borra las credenciales y deja de aceptar sus webhooks. */
export async function disconnectProvider(tenantId: string, id: string): Promise<boolean> {
  const found = await db.orm.public.ExternalConnection.where({ id, tenantId }).first();
  if (!found) return false;
  await db.orm.public.ExternalConnection.where({ id, tenantId }).update({ status: "DISCONNECTED", credentialsEnc: null, credentialsKeyId: null, lastError: null });
  return true;
}
