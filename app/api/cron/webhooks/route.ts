import { timingSafeEqual } from "node:crypto";
import { markAbandonedOrders } from "@/lib/store/store-db";
import { sendWeeklyReports } from "@/lib/presence/pillars-db";
import { dispatchPending } from "@/lib/events/dispatcher";
import { processPendingProviderEvents } from "@/lib/providers/inbound";

/**
 * Reintenta eventos de proveedores sin procesar y despacha el outbox: reparte eventos nuevos y envía/reintenta webhooks.
 * Se llama por un cron (Vercel Cron, n8n o `curl`) con
 * `Authorization: Bearer $CRON_SECRET`. Sin `CRON_SECRET` configurado, responde 503.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET no está configurado." }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return Response.json({ error: "No autorizado." }, { status: 401 });
  const reprocessed = await processPendingProviderEvents();
  const abandoned = await markAbandonedOrders();
  const weekly = await sendWeeklyReports(); // una vez por semana por negocio; las siguientes llamadas no repiten
  return Response.json({ ...(await dispatchPending()), providerEventsReprocessed: reprocessed, abandonedCarts: abandoned, weeklyReports: weekly });
}
