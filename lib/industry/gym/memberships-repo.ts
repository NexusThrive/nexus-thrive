import { and, or } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import { formatDateShort, toNumber } from "@/lib/foundation/format";
import { monthRangeBogota, resolveMonthYear } from "@/lib/foundation/dates/bogota-month";
import { escapeLike } from "@/lib/foundation/db/sql-like";
import type { Customer360Contribution, CustomerTimelineEvent } from "@/lib/core/tenancy/db";
import {
  EXPIRING_WINDOW_DAYS,
  MEMBERSHIP_STATUSES,
  computeMembershipStatus,
  plusDays,
  typeLabel,
  type Customer360Membership,
  type MembershipPaymentEntry,
  type MembershipStatusValue,
  type MembershipTypeValue,
} from "./memberships";

/**
 * Repositorio de membresías del gimnasio (lectura, listados, métricas y altas
 * simples) y su aporte a la ficha 360° del cliente.
 *
 * Vivía dentro de `createTenantDb` (Core). Ahora lo componen quienes lo usan:
 * las pantallas del módulo de membresías, el inicio y las notificaciones.
 * Las escrituras que van con dinero siguen en `memberships-db.ts`.
 */

export type MembershipListInput = {
  /** Texto libre contra nombre/teléfono/email del cliente. */
  q?: string;
  /** Estado DINÁMICO (calculado desde `endDate`), no el persistido. */
  status?: MembershipStatusValue;
  type?: MembershipTypeValue;
  page?: number;
  limit?: number;
};

/** Fila serializable de membresía (Decimal → number, Temporal → ISO). */
export type MembershipRow = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  type: MembershipTypeValue;
  status: MembershipStatusValue;
  price: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  /** Congelada o cancelada (prima sobre el estado por fechas). */
  hold: "frozen" | "cancelled" | null;
};

/** Congelada (ahora dentro del congelamiento) o cancelada. */
function membershipHold(m: { frozenFrom?: unknown; frozenUntil?: unknown; cancelledAt?: unknown }): MembershipRow["hold"] {
  if (m.cancelledAt) return "cancelled";
  const now = Date.now();
  if (m.frozenFrom && m.frozenUntil && now >= Date.parse(String(m.frozenFrom)) && now < Date.parse(String(m.frozenUntil))) return "frozen";
  return null;
}

/** Detalle de membresía con su historial de cobros (de `Payment`). */
export type MembershipDetail = MembershipRow & {
  payments: MembershipPaymentEntry[];
};

export type MembershipMetrics = {
  activeCount: number;
  expiringCount: number;
  expiredCount: number;
  /** Suma de precios de membresías que vencen en el mes (Bogotá). */
  renewalRevenueProjection: number;
};

/**
 * Capa de datos de membresías de un negocio. Aislamiento: `tenantId` siempre
 * en el filtro base.
 */
export function createMembershipsDb(tenantId: string) {
  return {
    /**
     * Listado paginado de membresías del tenant, con datos del cliente
     * (include) y estado dinámico calculado desde `endDate`.
     *
     * El filtro `status` se traduce a rangos sobre `endDate` (now /
     * now+3d), así que se evalúa 100% en la base de datos.
     * Aislamiento: `tenantId` siempre en el filtro base.
     */
    list: async ({
      q,
      status,
      type,
      page = 1,
      limit = 10,
    }: MembershipListInput): Promise<{ rows: MembershipRow[]; total: number }> => {
      const text = (q ?? "").trim();
      const pattern = `%${escapeLike(text)}%`;
      const safePage = Math.max(1, Math.trunc(page));
      const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

      const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
      const windowEnd = plusDays(now, EXPIRING_WINDOW_DAYS);

      let filtered = db.orm.public.Membership.where({ tenantId });
      if (type) {
        filtered = filtered.where((membership) => membership.type.eq(type));
      }
      if (status === "active") {
        filtered = filtered.where((membership) => membership.endDate.gt(windowEnd));
      } else if (status === "expiring") {
        filtered = filtered.where((membership) =>
          and(membership.endDate.gt(now), membership.endDate.lte(windowEnd)),
        );
      } else if (status === "expired") {
        filtered = filtered.where((membership) => membership.endDate.lte(now));
      }
      if (text) {
        filtered = filtered.where((membership) =>
          membership.customer.some((customer) =>
            or(
              customer.name.ilike(pattern),
              customer.phone.ilike(pattern),
              customer.email.ilike(pattern),
            ),
          ),
        );
      }

      const [rows, { total }] = await Promise.all([
        filtered
          .orderBy([
            (membership) => membership.endDate.asc(),
            (membership) => membership.id.asc(),
          ])
          .include("customer", (customer) =>
            customer.select("name", "phone", "email"),
          )
          .limit(safeLimit)
          .offset((safePage - 1) * safeLimit)
          .all(),
        filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
      ]);

      return {
        rows: rows.map((row) => ({
          id: row.id,
          customerId: row.customerId,
          customerName: row.customer?.name ?? "Cliente eliminado",
          customerPhone: row.customer?.phone ?? null,
          customerEmail: row.customer?.email ?? null,
          type: row.type,
          status: computeMembershipStatus(row.endDate),
          price: toNumber(row.price),
          startDate: String(row.startDate),
          endDate: String(row.endDate),
          createdAt: String(row.createdAt),
          hold: membershipHold(row),
        })),
        total,
      };
    },

    /**
     * Detalle de una membresía con su historial de cobros (de `Payment`).
     * Devuelve `null` si no existe en este tenant.
     */
    get: async (id: string): Promise<MembershipDetail | null> => {
      const membership = await db.orm.public.Membership
        .where({ id, tenantId })
        .include("customer", (customer) =>
          customer.select("name", "phone", "email"),
        )
        .first();

      if (!membership) {
        return null;
      }

      // El historial sale de Payment, no del Json (DATA-02).
      const charges = await db.orm.public.Payment
        .where({ tenantId, membershipId: id })
        .select("id", "description", "createdAt", "amount", "provider", "status", "receiptNumber")
        .orderBy((p) => p.createdAt.asc())
        .all();
      const payments: MembershipPaymentEntry[] = charges.map((p) => ({
        paymentId: p.id,
        kind: /renovaci[oó]n/i.test(p.description ?? "") ? "renovacion" : "inicial",
        date: String(p.createdAt),
        amount: String(p.amount),
        provider: p.provider,
        status: p.status,
        receiptNumber: p.receiptNumber ?? null,
      }));

      return {
        id: membership.id,
        customerId: membership.customerId,
        customerName: membership.customer?.name ?? "Cliente eliminado",
        customerPhone: membership.customer?.phone ?? null,
        customerEmail: membership.customer?.email ?? null,
        type: membership.type,
        status: computeMembershipStatus(membership.endDate),
        price: toNumber(membership.price),
        startDate: String(membership.startDate),
        endDate: String(membership.endDate),
        createdAt: String(membership.createdAt),
        hold: membershipHold(membership),
        payments,
      };
    },

    /**
     * Métricas del módulo: conteos por estado dinámico (active / expiring
     * / expired según `endDate` vs. ahora) y proyección de renovaciones =
     * suma de precios de las membresías que vencen en el mes (Bogotá).
     */
    getMetrics: async (options?: {
      month?: number;
      year?: number;
    }): Promise<MembershipMetrics> => {
      const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
      const windowEnd = plusDays(now, EXPIRING_WINDOW_DAYS);

      const { month, year } = resolveMonthYear(options?.month, options?.year);
      const { start, end } = monthRangeBogota(year, month);

      const [activeAgg, expiringAgg, expiredAgg, projectionAgg] =
        await Promise.all([
          db.orm.public.Membership
            .where({ tenantId })
            .where((membership) => membership.endDate.gt(windowEnd))
            .aggregate((aggregate) => ({ total: aggregate.count() })),
          db.orm.public.Membership
            .where({ tenantId })
            .where((membership) =>
              and(membership.endDate.gt(now), membership.endDate.lte(windowEnd)),
            )
            .aggregate((aggregate) => ({ total: aggregate.count() })),
          db.orm.public.Membership
            .where({ tenantId })
            .where((membership) => membership.endDate.lte(now))
            .aggregate((aggregate) => ({ total: aggregate.count() })),
          db.orm.public.Membership
            .where({ tenantId })
            .where((membership) =>
              and(membership.endDate.gte(start), membership.endDate.lt(end)),
            )
            .aggregate((aggregate) => ({ total: aggregate.sum("price") })),
        ]);

      return {
        activeCount: activeAgg.total,
        expiringCount: expiringAgg.total,
        expiredCount: expiredAgg.total,
        renewalRevenueProjection: toNumber(projectionAgg.total),
      };
    },

    create: (
      data: Omit<
        Parameters<typeof db.orm.public.Membership.create>[0],
        "tenantId"
      >,
    ) =>
      db.orm.public.Membership.create({
        ...data,
        tenantId,
      }),

    update: (id: string, data: Record<string, unknown>) =>
      db.orm.public.Membership
        .where({ id, tenantId })
        .update(data),
  };
}

export type MembershipsDb = ReturnType<typeof createMembershipsDb>;

/**
 * Aporte del gimnasio a la ficha 360° (contrato `Customer360Contribution`).
 *
 * Devuelve las membresías para la pestaña propia del gimnasio y, por separado,
 * lo que la ficha general necesita: sus eventos de línea de tiempo, su actividad
 * más reciente y la señal para el estado de cuenta (la membresía con el fin más
 * lejano decide: vencida → `overdue`; vigente o por vencer → `current`).
 * Core no conoce este módulo: la pantalla de la ficha reúne los aportes.
 */
export async function getCustomer360Memberships(
  tenantId: string,
  customerId: string,
): Promise<{ memberships: Customer360Membership[]; contribution: Customer360Contribution }> {
  const MEMBERSHIPS_CAP = 100;
  const rows = await db.orm.public.Membership
    .select("id", "type", "startDate", "endDate", "price", "createdAt")
    .where({ tenantId, customerId })
    .orderBy((membership) => membership.startDate.desc())
    .limit(MEMBERSHIPS_CAP)
    .all();

  const memberships: Customer360Membership[] = rows.map((membership) => ({
    id: membership.id,
    type: membership.type,
    status: computeMembershipStatus(membership.endDate),
    price: toNumber(membership.price),
    startDate: String(membership.startDate),
    endDate: String(membership.endDate),
    createdAt: String(membership.createdAt),
  }));

  const latestByEnd = memberships.reduce<Customer360Membership | null>(
    (latest, membership) => (!latest || membership.endDate > latest.endDate ? membership : latest),
    null,
  );

  const statusLabel = (status: MembershipStatusValue): string =>
    MEMBERSHIP_STATUSES.find((option) => option.value === status)?.label ?? status;

  const events: CustomerTimelineEvent[] = memberships.map(
    (membership): CustomerTimelineEvent => ({
      id: `membership-${membership.id}`,
      type: "membership",
      date: membership.createdAt,
      title: `Membresía ${typeLabel(membership.type)}`,
      description: `${formatDateShort(membership.startDate)} → ${formatDateShort(membership.endDate)}`,
      status: statusLabel(membership.status),
    }),
  );

  const lastActivityDate = memberships.reduce<string | null>(
    (latest, membership) => (!latest || membership.createdAt > latest ? membership.createdAt : latest),
    null,
  );

  return {
    memberships,
    contribution: {
      events,
      lastActivityDate,
      hasRecords: memberships.length > 0,
      accountSignal: latestByEnd ? (latestByEnd.status === "expired" ? "overdue" : "current") : null,
    },
  };
}
