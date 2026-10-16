/**
 * Cotizaciones.
 * Extraído de `lib/tenant-db.ts`; `createTenantDb` lo compone. Todo
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
  buildApuSnapshot,
  calculateQuoteTotals,
  currentYearBogota,
  lineTotal,
  moneyToString,
  type ApuSnapshot,
  type QuoteStatusValue,
} from "@/lib/apu-engine";
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

      /**
       * Crea un presupuesto DRAFT con snapshot inmutable de cada APU.
       * Precios y costos se recalculan SIEMPRE en el servidor con el motor
       * (el navegador solo manda activityId + cantidad + % AIU). Todo en
       * una transacción; código correlativo PRES-<año>-NNN por tenant.
       */
      create: async (data: {
        customerId: string | null;
        title: string;
        items: { activityId: string; quantity: string }[];
        aiuConfig: {
          adminPercent: string;
          imprevPercent: string;
          utilPercent: string;
          taxPercent: string;
        };
      }): Promise<QuoteDetail> => {
        const activityIds = [
          ...new Set(data.items.map((item) => item.activityId)),
        ];

        const [activities, allCompositions] = await Promise.all([
          db.orm.public.ApuActivity
            .where({ tenantId })
            .where((activity) => activity.id.in(activityIds))
            .all(),
          db.orm.public.ApuActivityComposition.where((composition) =>
            composition.activityId.in(activityIds),
          )
            .include("item", (item) =>
              item.select(
                "id",
                "code",
                "name",
                "unit",
                "category",
                "unitPrice",
              ),
            )
            .all(),
        ]);
        if (activities.length !== activityIds.length) {
          throw new Error(
            "Alguna de las actividades no existe en este negocio.",
          );
        }

        const activityById = new Map(
          activities.map((activity) => [activity.id, activity]),
        );
        const compositionsByActivity = new Map<
          string,
          typeof allCompositions
        >();
        for (const composition of allCompositions) {
          const list =
            compositionsByActivity.get(composition.activityId) ?? [];
          list.push(composition);
          compositionsByActivity.set(composition.activityId, list);
        }

        // Líneas con snapshot inmutable + costo unitario congelado.
        const quoteItems = data.items.map(({ activityId, quantity }) => {
          const activity = activityById.get(activityId);
          if (!activity) {
            throw new Error("Actividad no encontrada.");
          }
          const components = (
            compositionsByActivity.get(activityId) ?? []
          ).map((composition) => {
            const item = composition.item!;
            return {
              itemId: item.id,
              code: item.code,
              name: item.name,
              unit: item.unit,
              category: item.category,
              unitPrice: String(item.unitPrice),
              consumption: String(composition.consumption),
              wastePercent: String(composition.wastePercent),
            };
          });
          const snapshot = buildApuSnapshot({
            activity: {
              id: activity.id,
              code: activity.code,
              name: activity.name,
              unit: activity.unit,
            },
            components,
          });
          return {
            activityId,
            quantity,
            name: activity.name,
            unit: activity.unit,
            unitCost: snapshot.unitCost,
            totalCost: moneyToString(lineTotal(quantity, snapshot.unitCost)),
            apuSnapshot: snapshot,
          };
        });

        const totals = calculateQuoteTotals(
          quoteItems.map((item) => ({
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
          data.aiuConfig,
        );

        // Código correlativo por tenant y año (solo lectura previa).
        const year = currentYearBogota();
        const prefix = `PRES-${year}-`;
        const latest = await db.orm.public.Quote
          .where({ tenantId })
          .where((quote) => quote.code.like(`${prefix}%`))
          .orderBy((quote) => quote.code.desc())
          .first();
        const sequence = latest
          ? Number(latest.code.slice(prefix.length)) + 1
          : 1;
        const code = `${prefix}${String(sequence).padStart(3, "0")}`;

        const created = await db.transaction(async (tx) => {
          const quote = await tx.orm.public.Quote.create({
            tenantId,
            customerId: data.customerId,
            title: data.title,
            code,
            status: "DRAFT",
            adminPercent: data.aiuConfig.adminPercent,
            imprevPercent: data.aiuConfig.imprevPercent,
            utilPercent: data.aiuConfig.utilPercent,
            taxPercent: data.aiuConfig.taxPercent,
            directCost: totals.directCost,
            totalAmount: totals.totalAmount,
          });
          const createdItems: Awaited<
            ReturnType<typeof tx.orm.public.QuoteItem.create>
          >[] = [];
          for (const item of quoteItems) {
            createdItems.push(
              await tx.orm.public.QuoteItem.create({
                quoteId: quote.id,
                activityId: item.activityId,
                name: item.name,
                unit: item.unit,
                quantity: item.quantity,
                unitCost: item.unitCost,
                totalCost: item.totalCost,
                apuSnapshot: item.apuSnapshot,
              }),
            );
          }
          return { quote, createdItems };
        });

        const customer = created.quote.customerId
          ? await db.orm.public.Customer
              .where({ id: created.quote.customerId, tenantId })
              .select("name")
              .first()
          : null;

        return {
          id: created.quote.id,
          code: created.quote.code,
          title: created.quote.title,
          customerId: created.quote.customerId,
          customerName: created.quote.customerId
            ? customer?.name ?? "Cliente eliminado"
            : null,
          status: created.quote.status as QuoteStatusValue,
          adminPercent: String(created.quote.adminPercent),
          imprevPercent: String(created.quote.imprevPercent),
          utilPercent: String(created.quote.utilPercent),
          taxPercent: String(created.quote.taxPercent),
          directCost: String(created.quote.directCost),
          administration: totals.administration,
          contingency: totals.contingency,
          utility: totals.utility,
          subtotal: totals.subtotal,
          tax: totals.tax,
          totalAmount: String(created.quote.totalAmount),
          createdAt: String(created.quote.createdAt),
          updatedAt: String(created.quote.updatedAt),
          items: created.createdItems.map((item) => ({
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
