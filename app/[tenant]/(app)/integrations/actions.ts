"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/core/auth/permissions";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { encryptionConfigured } from "@/lib/core/events/secrets";
import { ensureGatewayAccount, setGatewayTariff } from "@/lib/domains/finance/payments/accounts-db";
import { wompiEnvironment } from "@/lib/domains/finance/payments/intents";
import { wompiSecretsProblem } from "@/lib/integrations/providers/wompi";
import { connectProvider, disconnectProvider, listConnections } from "@/lib/integrations/providers/connections";

export type WompiField = "publicKey" | "integritySecret" | "eventsSecret";
export type ConnectionResult = { ok: true; message: string } | { ok: false; message: string; field?: WompiField | "phoneNumberId" | "accessToken" | "appSecret" | "verifyToken" };

const DENIED: ConnectionResult = { ok: false, message: "Solo el dueño o administración conecta herramientas." };
const manager = async (slug: string) => {
  const ctx = await requireTenantContext(slug, "/integrations");
  return ctx && can(ctx.role, "business.manage") ? ctx : null;
};
const refresh = (slug: string) => {
  revalidatePath(`/${slug}/integrations`);
  revalidatePath(`/${slug}/ventas/cobros`);
  revalidatePath(`/${slug}/canales/conversaciones`);
};

/**
 * Conecta la cuenta Wompi del negocio: el entorno sale de la llave pública, Wompi verifica la llave y los secretos se
 * guardan cifrados. Ni los secretos ni la llave vuelven al navegador ni quedan en la auditoría.
 */
export async function connectWompiAction(slug: string, input: Record<WompiField, string>): Promise<ConnectionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  if (!encryptionConfigured()) return { ok: false, message: "El servidor no tiene configurada la clave de cifrado (WEBHOOK_ENCRYPTION_KEY), así que no puede guardar credenciales. Avisa al equipo técnico de Nexus." };
  const credentials = { publicKey: input.publicKey.trim(), integritySecret: input.integritySecret.trim(), eventsSecret: input.eventsSecret.trim() };
  const environment = wompiEnvironment(credentials.publicKey);
  if (!environment) return { ok: false, field: "publicKey", message: "La llave pública de Wompi empieza por pub_prod_ o pub_test_." };
  if (!credentials.integritySecret) return { ok: false, field: "integritySecret", message: "Escribe el secreto de integridad." };
  if (!credentials.eventsSecret) return { ok: false, field: "eventsSecret", message: "Escribe el secreto de eventos." };
  const mismatch = wompiSecretsProblem(environment, credentials.integritySecret, credentials.eventsSecret);
  if (mismatch) return { ok: false, ...mismatch };

  // Un solo Wompi activo: cambiar de pruebas a producción pide desconectar primero el otro.
  const other = (await listConnections(ctx.tenantId)).find((c) => c.provider === "wompi" && c.status === "CONNECTED" && c.environment !== environment);
  if (other) return { ok: false, message: `Ya tienes Wompi conectado en ${other.environment === "production" ? "producción" : "pruebas"}. Desconéctalo antes de conectar el otro entorno.` };

  let r: Awaited<ReturnType<typeof connectProvider>>;
  try {
    r = await connectProvider(ctx.tenantId, { provider: "wompi", environment, credentials });
  } catch (error) {
    console.error("[integrations] no se pudo conectar Wompi:", error);
    return { ok: false, message: "No pudimos guardar la conexión. Inténtalo de nuevo; si sigue igual, avisa al equipo técnico." };
  }
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "connect", provider: "wompi", environment, ok: r.ok });
  refresh(slug);
  if (!r.ok) return { ok: false, field: "publicKey", message: r.message };
  await ensureGatewayAccount(ctx.tenantId, "wompi");
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

/** Tarifa de Wompi para estimar la comisión de cada cobro: porcentaje, valor fijo por transacción e IVA de la comisión. La liquidación confirma la real. */
export async function saveWompiTariffAction(slug: string, tariff: { feePct: number; feeFixed: number; feeVatPct: number }): Promise<ConnectionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await setGatewayTariff(ctx.tenantId, "wompi", tariff);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "set_tariff", provider: "wompi" });
  refresh(slug);
  return { ok: true, message: "Tarifa guardada: los cobros nuevos muestran su comisión estimada" };
}

export type WhatsappField = "phoneNumberId" | "accessToken" | "appSecret" | "verifyToken";

/**
 * Conecta el WhatsApp Business del negocio (ADR 0010): Meta verifica el token contra ese número y las credenciales se guardan cifradas.
 * El webhook que se pega en Meta es el de esta conexión, que sale en la ficha. Los secretos nunca vuelven al navegador.
 */
export async function connectWhatsappAction(slug: string, input: Record<WhatsappField, string>): Promise<ConnectionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  if (!encryptionConfigured()) return { ok: false, message: "El servidor no tiene configurada la clave de cifrado (WEBHOOK_ENCRYPTION_KEY), así que no puede guardar credenciales. Avisa al equipo técnico de Nexus." };
  const credentials = { phoneNumberId: input.phoneNumberId.trim(), accessToken: input.accessToken.trim(), appSecret: input.appSecret.trim(), verifyToken: input.verifyToken.trim() };
  if (!/^\d{8,20}$/.test(credentials.phoneNumberId)) return { ok: false, field: "phoneNumberId", message: "El identificador del número son solo dígitos (lo ves en Meta, en WhatsApp → Configuración de la API)." };
  if (credentials.accessToken.length < 20) return { ok: false, field: "accessToken", message: "El token de acceso es muy corto: copia el token permanente de tu usuario del sistema." };
  if (credentials.appSecret.length < 16) return { ok: false, field: "appSecret", message: "Copia el secreto de tu app de Meta (Configuración de la app → Básica)." };
  if (credentials.verifyToken.length < 8) return { ok: false, field: "verifyToken", message: "Inventa un token de verificación de al menos 8 caracteres: lo pegarás también en Meta." };
  let r: Awaited<ReturnType<typeof connectProvider>>;
  try {
    r = await connectProvider(ctx.tenantId, { provider: "whatsapp_cloud", environment: "production", credentials });
  } catch (error) {
    console.error("[integrations] no se pudo conectar WhatsApp:", error);
    return { ok: false, message: "No pudimos guardar la conexión. Inténtalo de nuevo; si sigue igual, avisa al equipo técnico." };
  }
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "connect", provider: "whatsapp_cloud", ok: r.ok });
  refresh(slug);
  if (!r.ok) return { ok: false, field: "accessToken", message: r.message };
  return { ok: true, message: "WhatsApp conectado: ahora pega el webhook en Meta para recibir los mensajes" };
}

/** Desconecta el WhatsApp del negocio: borra sus credenciales. Las conversaciones se conservan. */
export async function disconnectWhatsappAction(slug: string, id: string): Promise<ConnectionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const found = (await listConnections(ctx.tenantId)).find((c) => c.id === id && c.kind === "MESSAGING");
  if (!found || !(await disconnectProvider(ctx.tenantId, id))) return { ok: false, message: "No se encontró la conexión." };
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "disconnect", provider: "whatsapp_cloud" });
  refresh(slug);
  return { ok: true, message: "WhatsApp desconectado. Tus conversaciones se conservan y puedes volver a conectarlo" };
}
