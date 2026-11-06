"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/core/auth/permissions";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { wompiEnvironment } from "@/lib/domains/finance/payments/intents";
import { connectProvider, disconnectProvider, listConnections } from "@/lib/integrations/providers/connections";

export type WompiField = "publicKey" | "integritySecret" | "eventsSecret";
export type ConnectionResult = { ok: true; message: string } | { ok: false; message: string; field?: WompiField };

const DENIED: ConnectionResult = { ok: false, message: "Solo el dueño o administración conecta herramientas." };
const manager = async (slug: string) => {
  const ctx = await requireTenantContext(slug, "/integrations");
  return ctx && can(ctx.role, "business.manage") ? ctx : null;
};
const refresh = (slug: string) => {
  revalidatePath(`/${slug}/integrations`);
  revalidatePath(`/${slug}/cobros`);
};

/**
 * Conecta la cuenta Wompi del negocio: el entorno sale de la llave pública, Wompi verifica la llave y los secretos se
 * guardan cifrados. Ni los secretos ni la llave vuelven al navegador ni quedan en la auditoría.
 */
export async function connectWompiAction(slug: string, input: Record<WompiField, string>): Promise<ConnectionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const credentials = { publicKey: input.publicKey.trim(), integritySecret: input.integritySecret.trim(), eventsSecret: input.eventsSecret.trim() };
  const environment = wompiEnvironment(credentials.publicKey);
  if (!environment) return { ok: false, field: "publicKey", message: "La llave pública de Wompi empieza por pub_prod_ o pub_test_." };
  if (!credentials.integritySecret) return { ok: false, field: "integritySecret", message: "Escribe el secreto de integridad." };
  if (!credentials.eventsSecret) return { ok: false, field: "eventsSecret", message: "Escribe el secreto de eventos." };

  // Un solo Wompi activo: cambiar de pruebas a producción pide desconectar primero el otro.
  const other = (await listConnections(ctx.tenantId)).find((c) => c.provider === "wompi" && c.status === "CONNECTED" && c.environment !== environment);
  if (other) return { ok: false, message: `Ya tienes Wompi conectado en ${other.environment === "production" ? "producción" : "pruebas"}. Desconéctalo antes de conectar el otro entorno.` };

  const r = await connectProvider(ctx.tenantId, { provider: "wompi", environment, credentials });
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "connect", provider: "wompi", environment, ok: r.ok });
  refresh(slug);
  if (!r.ok) return { ok: false, field: "publicKey", message: r.message };
  return { ok: true, message: environment === "production" ? "Wompi conectado: tus cobros llegan a tu cuenta" : "Wompi conectado en pruebas: los cobros no mueven dinero real" };
}

/** Desconecta un proveedor de pagos: borra sus credenciales y deja de aceptar sus webhooks. */
export async function disconnectPaymentAction(slug: string, id: string): Promise<ConnectionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const found = (await listConnections(ctx.tenantId)).find((c) => c.id === id && c.kind === "PAYMENT");
  if (!found || !(await disconnectProvider(ctx.tenantId, id))) return { ok: false, message: "No se encontró la conexión." };
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "disconnect", provider: found.provider, environment: found.environment });
  refresh(slug);
  return { ok: true, message: "Pasarela desconectada" };
}
