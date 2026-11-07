import { toNumber } from "@/lib/foundation/format";
import type { CustomerTimelineEvent } from "@/lib/core/tenancy/db";
import { QUOTE_STATUS_TEXT, quoteCode, type QuoteStatus } from "@/lib/business/sales/sales-quotes";
import { STAGE_TEXT, type OpportunityStage } from "./opportunities";
import { db } from "@/prisma/db";

/**
 * Lo comercial de un cliente para su ficha única (HU-customer360-01): oportunidades, cotizaciones, pedidos, tareas y documentos,
 * como eventos de la misma línea de tiempo que los pagos, las membresías y las notas. Cada fuente se pide con LÍMITE en el servidor
 * y todo por `tenantId` + `customerId`. Las conversaciones llegan con el WhatsApp propio del negocio (etapa 2d).
 */
const PER_SOURCE = 30;
const ORDER_TEXT: Record<string, string> = { PENDING_PAYMENT: "Por pagar", PAID: "Pagado", CANCELED: "Cancelado", ABANDONED: "Abandonado" };

export async function commercialTimeline(tenantId: string, customerId: string): Promise<CustomerTimelineEvent[]> {
  const [opps, quotes, orders, tasks, docs] = await Promise.all([
    db.orm.public.Opportunity.where({ tenantId, customerId }).orderBy((o) => o.createdAt.desc()).limit(PER_SOURCE).all(),
    db.orm.public.SalesQuote.where({ tenantId, customerId }).orderBy((q) => q.createdAt.desc()).limit(PER_SOURCE).all(),
    db.orm.public.StoreOrder.where({ tenantId, customerId }).orderBy((o) => o.createdAt.desc()).limit(PER_SOURCE).all(),
    db.orm.public.Task.where({ tenantId, customerId }).orderBy((t) => t.createdAt.desc()).limit(PER_SOURCE).all(),
    db.orm.public.Invoice.where({ tenantId, customerId }).orderBy((i) => i.createdAt.desc()).limit(PER_SOURCE).all(),
  ]);
  const out: CustomerTimelineEvent[] = [];
  for (const o of opps) {
    out.push({ id: `opp-${o.id}`, type: "opportunity", date: String(o.createdAt), title: `Oportunidad · ${o.interest}`, description: o.status === "LOST" && o.lostReason ? `Perdida: ${o.lostReason}` : o.nextAction ? `Siguiente: ${o.nextAction}` : undefined, amount: o.estimatedValue == null ? undefined : toNumber(o.estimatedValue), status: o.status === "OPEN" ? STAGE_TEXT[o.stage as OpportunityStage] : o.status === "WON" ? "Ganada" : "Perdida" });
  }
  for (const q of quotes) {
    out.push({ id: `quote-${q.id}`, type: "quote", date: String(q.createdAt), title: `Cotización ${quoteCode(q.number)} · ${q.title}`, amount: toNumber(q.total), status: QUOTE_STATUS_TEXT[q.status as QuoteStatus] });
  }
  for (const o of orders) {
    out.push({ id: `order-${o.id}`, type: "order", date: String(o.createdAt), title: `Pedido T-${String(o.number).padStart(4, "0")}`, description: o.quoteId ? "Nació de una cotización aprobada" : undefined, amount: toNumber(o.total), status: ORDER_TEXT[o.status] ?? o.status });
  }
  for (const t of tasks) {
    out.push({ id: `task-${t.id}`, type: "task", date: String(t.createdAt), title: `Tarea · ${t.title}`, description: t.dueDay ? `Para el ${t.dueDay}` : undefined, status: t.status === "DONE" ? "Hecha" : "Pendiente" });
  }
  for (const d of docs) {
    out.push({ id: `doc-${d.id}`, type: "document", date: String(d.createdAt), title: `${d.kind === "BILL" ? "Cuenta de cobro" : d.kind === "SALE" ? "Venta" : "Documento"} N.º ${d.number}`, amount: toNumber(d.total), status: d.status === "PAID" ? "Pagado" : d.status === "VOID" ? "Anulado" : "Emitido" });
  }
  return out;
}

/** Une los eventos de la ficha con los comerciales, del más reciente al más antiguo, con tope de 150. */
export const mergeTimeline = (...lists: CustomerTimelineEvent[][]): CustomerTimelineEvent[] => lists.flat().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 150);
