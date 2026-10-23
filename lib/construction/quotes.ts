/**
 * Cotizaciones.
 * Extraído de `lib/tenant/db.ts`; `createTenantDb` lo compone. Todo
 * acceso va acotado al `tenantId` recibido.
 */
import {
  or,
} from "@prisma/orm-postgres/orm-client";
import {
  db,
} from "@/prisma/db";
import {
  toNumber,
} from "@/lib/format";
import {
  calculateQuoteTotals,
  type ApuSnapshot,
} from "@/lib/construction/apu-engine";
import {
  type QuoteDetail,
  type QuoteListInput,
  type QuoteMetrics,
  type QuoteRow,
  escapeLike,
} from "./shared";

export function createQuotesDb(tenantId: string) {
  return {
      list: async ({
        q,
        status,
        page = 1,
        limit = 10,
      }: QuoteListInput = {}): Promise<{ rows: QuoteRow[]; total: number }> => {
        const text = (q ?? "").trim();
        const pattern = text ? `%${escapeLike(text)}%` : null;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.Quote.where({ tenantId });
        if (text) {
          filtered = filtered.where((quote) =>
            or(quote.code.ilike(pattern!), quote.title.ilike(pattern!)),
          );
        }
        if (status) {
          filtered = filtered.where((quote) => quote.status.eq(status));
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((quote) => quote.createdAt.desc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        const customerIds = [
          ...new Set(
            rows
              .map((row) => row.customerId)
              .filter((id): id is string => Boolean(id)),
          ),
        ];
        const customers =
          customerIds.length === 0
            ? []
            : await db.orm.public.Customer
                .where({ tenantId })
                .where((customer) => customer.id.in(customerIds))
                .all();
        const customerById = new Map(
          customers.map((customer) => [customer.id, customer]),
        );

        return {
          rows: rows.map((row) => ({
            id: row.id,
            code: row.code,
            title: row.title,
            customerId: row.customerId,
            customerName: row.customerId
              ? customerById.get(row.customerId)?.name ?? "Cliente eliminado"
              : null,
            status: row.status,
            directCost: String(row.directCost),
            totalAmount: String(row.totalAmount),
            createdAt: String(row.createdAt),
          })),
          total,
        };
      },

      /** Métricas de portada (datos reales, no mock). */
      getMetrics: async (): Promise<QuoteMetrics> => {
        const [countAgg, approvedAgg, draftAgg, totalAgg] = await Promise.all([
          db.orm.public.Quote
            .where({ tenantId })
            .aggregate((aggregate) => ({ total: aggregate.count() })),
          db.orm.public.Quote
            .where({ tenantId })
            .where((quote) => quote.status.eq("APPROVED"))
            .aggregate((aggregate) => ({ total: aggregate.count() })),
          db.orm.public.Quote
            .where({ tenantId })
            .where((quote) => quote.status.eq("DRAFT"))
            .aggregate((aggregate) => ({ total: aggregate.count() })),
          db.orm.public.Quote
            .where({ tenantId })
            .aggregate((aggregate) => ({ total: aggregate.sum("totalAmount") })),
        ]);

        return {
          total: countAgg.total,
          approved: approvedAgg.total,
          draft: draftAgg.total,
          totalAmount: toNumber(totalAgg.total),
        };
      },

      /**
       * Presupuesto completo. El desglose AIU se RECALCULA con el motor
       * desde los porcentajes guardados — nunca se confía en los totales
       * que haya enviado el navegador.
       */
      /** Obra a la que pertenece la cotización (`null` si es antigua, sin obra). */
      projectOf: async (id: string): Promise<string | null> => {
        const row = await db.orm.public.Quote.where({ id, tenantId }).select("projectId").first();
        return row?.projectId ?? null;
      },

      /** Fila tal cual de la cotización (para migrarla a una obra). */
      record: (id: string) => db.orm.public.Quote.where({ id, tenantId }).first(),

      get: async (id: string): Promise<QuoteDetail | null> => {
        const quote = await db.orm.public.Quote
          .where({ id, tenantId })
          .first();
        if (!quote) {
          return null;
        }

        const [items, customer] = await Promise.all([
          db.orm.public.QuoteItem.where({ quoteId: id }).all(),
          quote.customerId
            ? db.orm.public.Customer
                .where({ id: quote.customerId, tenantId })
                .select("name")
                .first()
            : null,
        ]);

        const breakdown = calculateQuoteTotals(
          items.map((item) => ({
            quantity: String(item.quantity),
            unitCost: String(item.unitCost),
          })),
          {
            adminPercent: String(quote.adminPercent),
            imprevPercent: String(quote.imprevPercent),
            utilPercent: String(quote.utilPercent),
            taxPercent: String(quote.taxPercent),
          },
        );

        return {
          id: quote.id,
          code: quote.code,
          title: quote.title,
          customerId: quote.customerId,
          customerName: quote.customerId
            ? customer?.name ?? "Cliente eliminado"
            : null,
          status: quote.status,
          adminPercent: String(quote.adminPercent),
          imprevPercent: String(quote.imprevPercent),
          utilPercent: String(quote.utilPercent),
          taxPercent: String(quote.taxPercent),
          directCost: String(quote.directCost),
          administration: breakdown.administration,
          contingency: breakdown.contingency,
          utility: breakdown.utility,
          subtotal: breakdown.subtotal,
          tax: breakdown.tax,
          totalAmount: String(quote.totalAmount),
          createdAt: String(quote.createdAt),
          updatedAt: String(quote.updatedAt),
          items: items.map((item) => ({
            id: item.id,
            activityId: item.activityId,
            name: item.name,
            unit: item.unit,
            quantity: String(item.quantity),
            unitCost: String(item.unitCost),
            totalCost: String(item.totalCost),
            apuSnapshot: (item.apuSnapshot as ApuSnapshot | null) ?? null,
          })),
        };
      },
  };
}
