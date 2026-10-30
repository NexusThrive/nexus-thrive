import { bogotaDayKey, buildFinanceSeries, cumulativeByDay, lastBogotaDays, type FinanceSeries } from "@/lib/finance/series";
import {
  and,
  or,
} from "@prisma/orm-postgres/orm-client";
import {
  db,
} from "@/prisma/db";
import {
  formatDateShort,
  toNumber,
} from "@/lib/format";
import {
  DEFAULT_MODULES_BY_VERTICAL,
  type VerticalValue,
} from "@/lib/admin/catalogs";
import {
  paymentMethodLabel,
  paymentStatusLabel,
  type PaymentMethodValue,
  type PaymentStatusValue,
} from "@/lib/finance";
import {
  EXPIRING_WINDOW_DAYS,
  MEMBERSHIP_STATUSES,
  computeMembershipStatus,
  plusDays,
  typeLabel,
  type MembershipPaymentEntry,
  type MembershipStatusValue,
  type MembershipTypeValue,
} from "@/lib/business/memberships";
import { createCatalogDb } from "@/lib/construction/catalog";
import { createQuotesDb } from "@/lib/construction/quotes";
import { createProjectQuotesDb } from "@/lib/construction/project-quotes";
import { createProgressDb } from "@/lib/construction/progress";
import { createProjectsDb } from "@/lib/construction/projects";
import { createProjectHeadersDb } from "@/lib/construction/project-headers";
import { createBudgetsDb } from "@/lib/construction/budget";
import { createPlanDb } from "@/lib/construction/plan";
import { createFieldLogDb } from "@/lib/construction/field-log";
import { createReportsDb } from "@/lib/construction/reports";
import {
  escapeLike,
} from "@/lib/construction/shared";

export type * from "@/lib/construction/shared";


export type CustomerSearchInput = {
  /** Texto libre (nombre, email o teléfono). */
  q?: string;
  /** `active` = clientes vigentes; `archived` = dados de baja. */
  status?: "active" | "archived";
  sort?: "recent" | "name_asc" | "name_desc";
  page?: number;
  pageSize?: number;
};

/** Fila de la lista de movimientos de Finanzas (ver `finance.getMovements`). */
export type MovementRow = {
  id: string;
  type: "in" | "out";
  title: string;
  subtitle: string;
  amount: number;
  at: string;
};

export type FinanceMetrics = {
  income: number;
  expenses: number;
  balance: number;
  byMethod: { method: PaymentMethodValue; total: number }[];
};

export type PaymentListInput = {
  q?: string;
  method?: PaymentMethodValue;
  status?: PaymentStatusValue;
  page?: number;
  limit?: number;
};

/** Fila serializable de pago (Decimal → number, Temporal → ISO string). */
export type PaymentRow = {
  id: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  amount: number;
  provider: PaymentMethodValue;
  status: PaymentStatusValue;
  providerRefId: string | null;
  description: string | null;
  createdAt: string;
  receiptNumber: number | null;
  voidReason: string | null;
  notes: string | null;
  customerPhone: string | null;
};

export type ExpenseListInput = {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
};

/** Fila serializable de gasto. */
export type ExpenseRow = {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  createdAt: string;
  supplier: string | null;
  paidFrom: string;
  voidReason: string | null;
  voided: boolean;
};

export type RecentActivityRow = {
  id: string;
  type: "payment" | "expense";
  title: string;
  description: string;
  amount: number;
  date: string;
};

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

/** Estado general de la cuenta del cliente (Ficha 360°). */
export type CustomerAccountStatus =
  | "al_dia"
  | "pendiente"
  | "vencido"
  | "sin_actividad"
  | "sin_datos";

/** Información general del cliente, serializada para la UI. */
export type Customer360Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Fila serializable de pago dentro de la ficha 360°. */
export type Customer360Payment = {
  id: string;
  amount: number;
  status: PaymentStatusValue;
  provider: PaymentMethodValue;
  providerRefId: string | null;
  description: string | null;
  createdAt: string;
};

/** Fila serializable de membresía (estado DINÁMICO desde `endDate`). */
export type Customer360Membership = {
  id: string;
  type: MembershipTypeValue;
  status: MembershipStatusValue;
  price: number;
  startDate: string;
  endDate: string;
  createdAt: string;
};

/** Nota interna serializable (autor resuelto en el servidor). */
export type Customer360Note = {
  id: string;
  content: string;
  authorName: string | null;
  createdAt: string;
};

/**
 * Evento tipado del timeline unificado de la ficha 360°.
 * Adaptado al schema real: solo existen Payment, Membership y CustomerNote
 * (no hay modelos Order/Booking en el contrato).
 */
export type CustomerTimelineEvent = {
  id: string;
  type: "payment" | "membership" | "note";
  /** ISO (Temporal.Instant serializado); la UI formatea en America/Bogota. */
  date: string;
  title: string;
  description?: string;
  amount?: number;
  status?: string;
};

/** Métricas calculadas con datos reales del tenant + cliente. */
export type Customer360Metrics = {
  /** SUM de pagos APPROVED del cliente (LTV). */
  ltv: number;
  approvedCount: number;
  avgTicket: number;
  favoriteMethod: PaymentMethodValue | null;
  lastActivityDate: string | null;
  accountStatus: CustomerAccountStatus;
};

/** Todo lo que necesita la vista 360° (serializable, scoped al tenant). */
export type Customer360Details = {
  customer: Customer360Profile;
  /** Últimos 200 pagos, descendente por fecha. */
  payments: Customer360Payment[];
  paymentsTotal: number;
  /** Últimas 100 membresías, descendente por inicio. */
  memberships: Customer360Membership[];
  /** Últimas 100 notas, descendente por fecha. */
  notes: Customer360Note[];
  timeline: CustomerTimelineEvent[];
  metrics: Customer360Metrics;
};

/* ------------------------------------------------------------------ */

/** Último ISO mayor (fecha ISO-8601 de ancho fijo: orden lexicográfico = cronológico). */
function maxIso(a: string | null, b: string | null): string | null {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return a > b ? a : b;
}

const PAYMENT_METHOD_VALUES: PaymentMethodValue[] = [
  "CASH",
  "NEQUI",
  "WOMPI",
  "TRANSFER",
];

/**
 * Rango del mes en horario de Bogotá (UTC−5): inicio del mes y del
 * siguiente, como `Temporal.Instant` (codec obligatorio del driver).
 * Los registros se comparan con `>= start` y `< end`.
 */
function monthRangeBogota(year: number, month: number): {
  start: Temporal.Instant;
  end: Temporal.Instant;
} {
  // 05:00 UTC del día 1 = 00:00 en Bogotá (UTC−5). JS normaliza el
  // overflow: mes 12 → enero del año siguiente.
  const start = Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(year, month - 1, 1, 5, 0, 0),
  );
  const end = Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(year, month, 1, 5, 0, 0),
  );
  return { start, end };
}

/** Valida y normaliza un mes/año; por defecto usa el mes actual (Bogotá). */
function resolveMonthYear(month?: number, year?: number) {
  const now = new Date();
  // El día actual en Bogotá: DateTimeFormat con timeZone para no depender
  // de la zona horaria del servidor.
  const bogotaParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    month: "numeric",
    year: "numeric",
  }).formatToParts(now);
  const bogotaMonth = Number(
    bogotaParts.find((part) => part.type === "month")?.value,
  );
  const bogotaYear = Number(
    bogotaParts.find((part) => part.type === "year")?.value,
  );

  const resolvedMonth = month ?? bogotaMonth;
  const resolvedYear = year ?? bogotaYear;

  if (
    !Number.isInteger(resolvedMonth) ||
    resolvedMonth < 1 ||
    resolvedMonth > 12
  ) {
    throw new Error("Mes inválido para las métricas financieras.");
  }
  if (!Number.isInteger(resolvedYear) || resolvedYear < 2000 || resolvedYear > 2100) {
    throw new Error("Año inválido para las métricas financieras.");
  }

  return { month: resolvedMonth, year: resolvedYear };
}

/**
 * Notas de un cliente (serializadas, autor resuelto vía include).
 * Siempre scoped por `tenantId`; usado por la ficha 360° y por el
 * namespace `customerNotes`.
 */
async function listCustomerNotes(
  tenantId: string,
  customerId: string,
  limit = 100,
): Promise<Customer360Note[]> {
  const safeLimit = Math.min(200, Math.max(1, Math.trunc(limit)));
  const rows = await db.orm.public.CustomerNote
    .where({ tenantId, customerId })
    .orderBy((note) => note.createdAt.desc())
    .include("author", (author) => author.select("name"))
    .limit(safeLimit)
    .all();

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    authorName: row.author?.name ?? null,
    createdAt: String(row.createdAt),
  }));
}


export function createTenantDb(tenantId: string) {
  if (!tenantId || tenantId.trim() === "") {
    throw new Error(
      "Se requiere un tenantId válido para inicializar la capa de base de datos."
    );
  }


  return {
    customers: {
      list: () => db.orm.public.Customer.where({ tenantId }).all(),

      get: (id: string) =>
        db.orm.public.Customer.where({ id, tenantId }).first(),

      create: (data: Omit<Parameters<typeof db.orm.public.Customer.create>[0], "tenantId">) =>
        db.orm.public.Customer.create({
          ...data,
          tenantId,
        }),

      update: (id: string, data: Record<string, unknown>) =>
        db.orm.public.Customer
          .where({ id, tenantId })
          .update(data),
        

      delete: (id: string) =>
        db.orm.public.Customer
          .where({ id, tenantId })
          .delete(),

      /**
       * Búsqueda paginada para el CRM: filtra siempre por `tenantId`,
       * por estado (activo/archivado), texto libre y orden.
       * Devuelve la página actual y el total para paginar.
       */
      search: ({
        q,
        status = "active",
        sort = "recent",
        page = 1,
        pageSize = 20,
      }: CustomerSearchInput) => {
        const text = (q ?? "").trim();
        const pattern = `%${escapeLike(text)}%`;

        // Las cláusulas encadenadas de .where() componen con AND.
        const byTenantAndStatus = db.orm.public.Customer
          .where({ tenantId })
          .where((customer) => customer.active.eq(status === "active"));

        const filtered =
          text
            ? byTenantAndStatus.where((customer) =>
                or(
                  customer.name.ilike(pattern),
                  customer.email.ilike(pattern),
                  customer.phone.ilike(pattern),
                  customer.documentId.ilike(pattern),
                  customer.city.ilike(pattern),
                ),
              )
            : byTenantAndStatus;

        const ordered =
          sort === "name_asc"
            ? filtered.orderBy((customer) => customer.name.asc())
            : sort === "name_desc"
              ? filtered.orderBy((customer) => customer.name.desc())
              : filtered.orderBy((customer) => customer.createdAt.desc());

        const safePage = Math.max(1, Math.trunc(page));
        const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));

        const rowsPromise = ordered
          .limit(safePageSize)
          .offset((safePage - 1) * safePageSize)
          .all();

        const countPromise = filtered.aggregate((aggregate) => ({
          total: aggregate.count(),
        }));

        return Promise.all([rowsPromise, countPromise]).then(
          ([rows, { total }]) => ({ rows, total }),
        );
      },

      /** Baja lógica: conserva el histórico de pagos del cliente. */
      archive: (id: string) =>
        db.orm.public.Customer
          .where({ id, tenantId })
          .update({ active: false }),

      /** Revierte una archivación. */
      restore: (id: string) =>
        db.orm.public.Customer
          .where({ id, tenantId })
          .update({ active: true }),

      /**
       * Borrado definitivo — SOLO de clientes ya archivados (la condición
       * `active: false` se aplica aquí, no se confía en el cliente).
       * `Payment.customerId` usa `onDelete: SetNull`, así que los pagos
       * se conservan y quedan sin cliente vinculado.
       *
       * El `.delete()` del ORM borra UNA fila por llamada; para borrar en
       * lote se usa la SQL lane, cuyo `execute` resuelve `affectedRows`.
       */
      deleteManyArchived: async (ids: string[]) => {
        const uniqueIds = [...new Set(ids)];

        if (uniqueIds.length === 0) {
          return 0;
        }

        const plan = db.sql.public.Customer
          .delete()
          .where((field, fns) =>
            fns.and(
              fns.eq(field.tenantId, tenantId),
              fns.eq(field.active, false),
              fns.in(field.id, uniqueIds),
            ),
          )
          .build();

        const { affectedRows } = await db.runtime().execute(plan);
        return affectedRows;
      },

      /** Los últimos clientes activos dados de alta (para la actividad del inicio). */
      recent: async (limit = 5): Promise<{ id: string; name: string; createdAt: string }[]> => {
        const rows = await db.orm.public.Customer
          .where({ tenantId })
          .where((customer) => customer.active.eq(true))
          .orderBy((customer) => customer.createdAt.desc())
          .limit(Math.min(20, Math.max(1, Math.trunc(limit))))
          .select("id", "name", "createdAt")
          .all();
        return rows.map((c) => ({ id: c.id, name: c.name, createdAt: String(c.createdAt) }));
      },

      /** Cantidad de clientes activos (para el dashboard). */
      countActive: () =>
        db.orm.public.Customer
          .where({ tenantId })
          .where((customer) => customer.active.eq(true))
          .aggregate((aggregate) => ({ total: aggregate.count() }))
          .then(({ total }) => total),

      /**
       * Clientes activos día a día en los últimos `days` días (Bogotá), para
       * el minigráfico del inicio, más cuántos se sumaron en el periodo.
       */
      activeGrowth: async (days: number): Promise<{ series: number[]; added: number }> => {
        const keys = lastBogotaDays(Math.max(2, days));
        const since = Temporal.Instant.fromEpochMilliseconds(Date.now() - (keys.length + 1) * 86_400_000);
        const [{ total }, recent] = await Promise.all([
          db.orm.public.Customer
            .where({ tenantId })
            .where((customer) => customer.active.eq(true))
            .aggregate((aggregate) => ({ total: aggregate.count() })),
          db.orm.public.Customer
            .where({ tenantId })
            .where((customer) => and(customer.active.eq(true), customer.createdAt.gte(since)))
            .select("createdAt")
            .all(),
        ]);
        const createdAt = recent.map((c) => String(c.createdAt));
        const inWindow = createdAt.filter((at) => keys.includes(bogotaDayKey(at))).length;
        return { series: cumulativeByDay(total - inWindow, createdAt, keys), added: inWindow };
      },

      /**
       * Ficha 360°: información general, pagos, membresías, notas, timeline
       * y métricas del cliente en un solo punto. Devuelve `null` si el
       * cliente no existe o no pertenece a este tenant (nunca se confía en
       * un customerId de URL sin verificar `tenantId`).
       *
       * Serialización: Decimal → number, Temporal → ISO string.
       * El LTV se calcula por agregación EXACTA (no depende del límite de
       * filas); los listados van acotados para no cargar historiales grandes.
       */
      get360Details: async (
        customerId: string,
      ): Promise<Customer360Details | null> => {
        const customer = await db.orm.public.Customer
          .select("id", "name", "email", "phone", "active", "createdAt", "updatedAt")
          .where({ id: customerId, tenantId })
          .first();
        if (!customer) {
          return null;
        }

        const PAYMENTS_CAP = 200;
        const MEMBERSHIPS_CAP = 100;
        const TIMELINE_CAP = 30;

        const [payments, paymentsTotalAgg, approvedAgg, pendingCountAgg, memberships] =
          await Promise.all([
            db.orm.public.Payment
              .select("id", "amount", "status", "provider", "providerRefId", "description", "createdAt")
              .where({ tenantId, customerId })
              .orderBy((payment) => payment.createdAt.desc())
              .limit(PAYMENTS_CAP)
              .all(),
            db.orm.public.Payment
              .where({ tenantId, customerId })
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Payment
              .where({ tenantId, customerId })
              .where((payment) => payment.status.eq("APPROVED"))
              .aggregate((aggregate) => ({
                total: aggregate.sum("amount"),
                count: aggregate.count(),
              })),
            db.orm.public.Payment
              .where({ tenantId, customerId })
              .where((payment) => payment.status.eq("PENDING"))
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Membership
              .select("id", "type", "startDate", "endDate", "price", "createdAt")
              .where({ tenantId, customerId })
              .orderBy((membership) => membership.startDate.desc())
              .limit(MEMBERSHIPS_CAP)
              .all(),
          ]);

        const notes = await listCustomerNotes(tenantId, customerId, 100);

        const serializedPayments: Customer360Payment[] = payments.map((payment) => ({
          id: payment.id,
          amount: toNumber(payment.amount),
          status: payment.status,
          provider: payment.provider,
          providerRefId: payment.providerRefId,
          description: payment.description,
          createdAt: String(payment.createdAt),
        }));

        const serializedMemberships: Customer360Membership[] = memberships.map(
          (membership) => ({
            id: membership.id,
            type: membership.type,
            status: computeMembershipStatus(membership.endDate),
            price: toNumber(membership.price),
            startDate: String(membership.startDate),
            endDate: String(membership.endDate),
            createdAt: String(membership.createdAt),
          }),
        );

        // --- Métricas -------------------------------------------------------
        const ltv = toNumber(approvedAgg.total);
        const approvedCount = approvedAgg.count;
        const avgTicket = approvedCount > 0 ? ltv / approvedCount : 0;

        // Método más frecuente entre pagos aprobados (lista desc: ante empate,
        // gana el más reciente).
        const methodFrequency = new Map<PaymentMethodValue, number>();
        for (const payment of payments) {
          if (payment.status !== "APPROVED") {
            continue;
          }
          methodFrequency.set(
            payment.provider,
            (methodFrequency.get(payment.provider) ?? 0) + 1,
          );
        }
        let favoriteMethod: PaymentMethodValue | null = null;
        let favoriteCount = 0;
        for (const [method, count] of methodFrequency) {
          if (count > favoriteCount) {
            favoriteCount = count;
            favoriteMethod = method;
          }
        }

        // Última actividad: pago, nota o membresía más reciente (real).
        // Pagos y notas vienen desc: basta el primero; membresías se recorren.
        let lastActivityDate: string | null = null;
        if (payments.length > 0) {
          lastActivityDate = String(payments[0].createdAt);
        }
        if (notes.length > 0) {
          lastActivityDate = maxIso(lastActivityDate, notes[0].createdAt);
        }
        for (const membership of memberships) {
          lastActivityDate = maxIso(lastActivityDate, String(membership.createdAt));
        }

        // Estado de cuenta basado en datos reales, nunca inventado:
        // 1. sin pagos/membresías/notas → sin actividad
        // 2. membresía más reciente vencida → vencido
        // 3. pagos PENDING → pendiente
        // 4. membresía activa o pagos aprobados → al día
        // 5. (solo notas / pagos no aprobados) → sin datos
        const latestByEnd = serializedMemberships.reduce<Customer360Membership | null>(
          (latest, membership) =>
            !latest || membership.endDate > latest.endDate ? membership : latest,
          null,
        );
        let accountStatus: CustomerAccountStatus;
        if (
          payments.length === 0 &&
          serializedMemberships.length === 0 &&
          notes.length === 0
        ) {
          accountStatus = "sin_actividad";
        } else if (latestByEnd && latestByEnd.status === "expired") {
          accountStatus = "vencido";
        } else if (pendingCountAgg.total > 0) {
          accountStatus = "pendiente";
        } else if (latestByEnd || approvedCount > 0) {
          accountStatus = "al_dia";
        } else {
          accountStatus = "sin_datos";
        }

        // --- Timeline unificado ---------------------------------------------
        const membershipStatusLabel = (status: MembershipStatusValue): string =>
          MEMBERSHIP_STATUSES.find((option) => option.value === status)?.label ??
          status;

        const timeline: CustomerTimelineEvent[] = [
          ...serializedPayments.map(
            (payment): CustomerTimelineEvent => ({
              id: `payment-${payment.id}`,
              type: "payment",
              date: payment.createdAt,
              title: "Pago",
              description: payment.description
                ? `${paymentMethodLabel(payment.provider)} · ${payment.description}`
                : paymentMethodLabel(payment.provider),
              amount: payment.amount,
              status: paymentStatusLabel(payment.status),
            }),
          ),
          ...serializedMemberships.map(
            (membership): CustomerTimelineEvent => ({
              id: `membership-${membership.id}`,
              type: "membership",
              date: membership.createdAt,
              title: `Membresía ${typeLabel(membership.type)}`,
              description: `${formatDateShort(membership.startDate)} → ${formatDateShort(membership.endDate)}`,
              status: membershipStatusLabel(membership.status),
            }),
          ),
          ...notes.map(
            (note): CustomerTimelineEvent => ({
              id: `note-${note.id}`,
              type: "note",
              date: note.createdAt,
              title: note.authorName ? `Nota de ${note.authorName}` : "Nota interna",
              description:
                note.content.length > 140
                  ? `${note.content.slice(0, 140)}…`
                  : note.content,
            }),
          ),
        ]
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
          .slice(0, TIMELINE_CAP);

        return {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            active: customer.active,
            createdAt: String(customer.createdAt),
            updatedAt: String(customer.updatedAt),
          },
          payments: serializedPayments,
          paymentsTotal: paymentsTotalAgg.total,
          memberships: serializedMemberships,
          notes,
          timeline,
          metrics: {
            ltv,
            approvedCount,
            avgTicket,
            favoriteMethod,
            lastActivityDate,
            accountStatus,
          },
        };
      },
    },

    /**
     * Notas internas de clientes (Ficha 360°). Creación scoped al tenant;
     * el autor se resuelve con el User autenticado en la Server Action.
     */
    customerNotes: {
      create: (
        data: Omit<
          Parameters<typeof db.orm.public.CustomerNote.create>[0],
          "tenantId"
        >,
      ) =>
        db.orm.public.CustomerNote.create({
          ...data,
          tenantId,
        }),

      /** Últimas notas del cliente, descendente por fecha. */
      listByCustomer: (customerId: string, limit = 100) =>
        listCustomerNotes(tenantId, customerId, limit),
    },

    /* -------------------------------------------------------------- */
    /* Módulo Construcción & APU — banco de insumos                    */
    /* -------------------------------------------------------------- */

    apu: createCatalogDb(tenantId),

    /* -------------------------------------------------------------- */
    /* Módulo Construcción & APU — presupuestos                        */
    /* -------------------------------------------------------------- */

    quotes: createQuotesDb(tenantId),
    projectQuotes: createProjectQuotesDb(tenantId),
    progress: createProgressDb(tenantId),

    projects: createProjectsDb(tenantId),

    projectHeaders: createProjectHeadersDb(tenantId),

    budgets: createBudgetsDb(tenantId),

    lean: createPlanDb(tenantId),

    fieldLog: createFieldLogDb(tenantId),

    reports: createReportsDb(tenantId),

    users: {
      list: () => db.orm.public.User.where({ tenantId }).all(),

      get: (id: string) =>
        db.orm.public.User.where({ id, tenantId }).first(),

      findByClerkUserId: (clerkUserId: string) =>
        db.orm.public.User.where({ clerkUserId, tenantId }).first(),

      create: (data: Omit<Parameters<typeof db.orm.public.User.create>[0], "tenantId">) =>
        db.orm.public.User.create({
          ...data,
          tenantId,
        }),

      update: (id: string, data: Record<string, unknown>) =>
        db.orm.public.User
          .where({ id, tenantId })
          .update(data),

      delete: (id: string) =>
        db.orm.public.User
          .where({ id, tenantId })
          .delete(),
    },

    payments: {
      list: () => db.orm.public.Payment.where({ tenantId }).all(),

      get: (id: string) =>
        db.orm.public.Payment.where({ id, tenantId }).first(),

      create: (data: Omit<Parameters<typeof db.orm.public.Payment.create>[0], "tenantId">) =>
        db.orm.public.Payment.create({
          ...data,
          tenantId,
        }),

      update: (id: string, data: Record<string, unknown>) =>
        db.orm.public.Payment
          .where({ id, tenantId })
          .update(data),

      delete: (id: string) =>
        db.orm.public.Payment
          .where({ id, tenantId })
          .delete(),
    },

    bookings: {
      list: () => db.orm.public.Booking.where({ tenantId }).all(),
      get: (id: string) =>
        db.orm.public.Booking.where({ id, tenantId }).first(),
      create: (data: {
        customerId: string;
        serviceName: string;
        startDate: Temporal.Instant;
        endDate: Temporal.Instant;
        status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
        totalAmount: bigint;
        notes?: string;
        createdAt?: Temporal.Instant;
        updatedAt?: Temporal.Instant;
      }) =>
        db.orm.public.Booking.create({
          ...data,
          tenantId,
        }),
      update: (id: string, data: Record<string, unknown>) =>
        db.orm.public.Booking
          .where({ id, tenantId })
          .update(data),
      delete: (id: string) =>
        db.orm.public.Booking
          .where({ id, tenantId })
          .delete(),
    },

    expenses: {
      list: () => db.orm.public.Expense.where({ tenantId }).all(),

      get: (id: string) =>
        db.orm.public.Expense.where({ id, tenantId }).first(),

      create: (data: Omit<Parameters<typeof db.orm.public.Expense.create>[0], "tenantId">) =>
        db.orm.public.Expense.create({
          ...data,
          tenantId,
        }),

      update: (id: string, data: Record<string, unknown>) =>
        db.orm.public.Expense
          .where({ id, tenantId })
          .update(data),

      delete: (id: string) =>
        db.orm.public.Expense
          .where({ id, tenantId })
          .delete(),
    },

    finance: {
      /**
       * Métricas del mes (horario Bogotá): ingresos aprobados, gastos,
       * balance neto y desglose por método de pago. Todo en el servidor.
       */
      getMetrics: async (options?: { month?: number; year?: number }) => {
        const { month, year } = resolveMonthYear(
          options?.month,
          options?.year,
        );
        const { start, end } = monthRangeBogota(year, month);

        const [incomeAgg, expenseAgg] = await Promise.all([
          db.orm.public.Payment
            .where({ tenantId })
            .where((payment) =>
              and(
                payment.status.eq("APPROVED"),
                payment.createdAt.gte(start),
                payment.createdAt.lt(end),
              ),
            )
            .aggregate((aggregate) => ({ total: aggregate.sum("amount") })),
          db.orm.public.Expense
            .where({ tenantId })
            .where((expense) => expense.voidedAt.isNull())
            .where((expense) =>
              and(expense.date.gte(start), expense.date.lt(end)),
            )
            .aggregate((aggregate) => ({ total: aggregate.sum("amount") })),
        ]);

        const income = toNumber(incomeAgg.total);
        const expenses = toNumber(expenseAgg.total);

        const byMethodAggs = await Promise.all(
          PAYMENT_METHOD_VALUES.map(async (method) => {
            const result = await db.orm.public.Payment
              .where({ tenantId })
              .where((payment) =>
                and(
                  payment.status.eq("APPROVED"),
                  payment.provider.eq(method),
                  payment.createdAt.gte(start),
                  payment.createdAt.lt(end),
                ),
              )
              .aggregate((aggregate) => ({ total: aggregate.sum("amount") }));
            return { method, total: toNumber(result.total) };
          }),
        );

        return {
          income,
          expenses,
          balance: income - expenses,
          byMethod: byMethodAggs,
        } satisfies FinanceMetrics;
      },

      /**
       * Serie diaria (Bogotá) de ingresos aprobados y gastos de los últimos
       * `days` días, más los totales del periodo anterior del mismo largo.
       * Trae solo monto y fecha de la ventana y agrupa en lib/finance-series.
       */
      getSeries: async (days: number = 30, withPrevious = true): Promise<FinanceSeries> => {
        // Sin periodo previo (vistas por semana y mes de la gráfica) la ventana es la mitad: menos filas.
        const since = Temporal.Instant.fromEpochMilliseconds(
          Date.now() - ((withPrevious ? days * 2 : days) + 1) * 86_400_000,
        );
        const [payments, expenses] = await Promise.all([
          db.orm.public.Payment
            .where({ tenantId })
            .where((payment) =>
              and(payment.status.eq("APPROVED"), payment.createdAt.gte(since)),
            )
            .select("amount", "createdAt")
            .all(),
          db.orm.public.Expense
            .where({ tenantId })
            .where((expense) => expense.voidedAt.isNull())
            .where((expense) => expense.date.gte(since))
            .select("amount", "date")
            .all(),
        ]);
        return buildFinanceSeries({
          days,
          payments: payments.map((p) => ({ amount: toNumber(p.amount), at: String(p.createdAt) })),
          expenses: expenses.map((e) => ({ amount: toNumber(e.amount), at: String(e.date) })),
        });
      },

      /**
       * Historial de pagos paginado, con nombre/email del cliente.
       * Aislamiento: `tenantId` siempre en el filtro base.
       */
      listPayments: async ({
        q,
        method,
        status,
        page = 1,
        limit = 10,
      }: PaymentListInput): Promise<{ rows: PaymentRow[]; total: number }> => {
        const text = (q ?? "").trim();
        const pattern = `%${escapeLike(text)}%`;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.Payment.where({ tenantId });
        if (status) {
          filtered = filtered.where((payment) => payment.status.eq(status));
        }
        if (method) {
          filtered = filtered.where((payment) => payment.provider.eq(method));
        }
        if (text) {
          filtered = filtered.where((payment) =>
            or(
              payment.description.ilike(pattern),
              payment.providerRefId.ilike(pattern),
            ),
          );
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((payment) => payment.createdAt.desc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        // Clientes involucrados (join manual; siempre scoped al tenant).
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
            customerId: row.customerId,
            customerName: row.customerId
              ? customerById.get(row.customerId)?.name ?? "Cliente eliminado"
              : null,
            customerEmail: row.customerId
              ? customerById.get(row.customerId)?.email ?? null
              : null,
            amount: toNumber(row.amount),
            provider: row.provider,
            status: row.status,
            providerRefId: row.providerRefId,
            description: row.description,
            createdAt: String(row.createdAt),
            receiptNumber: row.receiptNumber,
            voidReason: row.voidReason,
            notes: row.notes,
            customerPhone: row.customerId ? (customerById.get(row.customerId)?.phone ?? null) : null,
          })),
          total,
        };
      },

      /**
       * Historial de gastos de caja menor, paginado.
       * Aislamiento: `tenantId` siempre en el filtro base.
       */
      listExpenses: async ({
        q,
        category,
        page = 1,
        limit = 10,
      }: ExpenseListInput): Promise<{ rows: ExpenseRow[]; total: number }> => {
        const text = (q ?? "").trim();
        const pattern = `%${escapeLike(text)}%`;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.Expense.where({ tenantId });
        if (category) {
          filtered = filtered.where((expense) => expense.category.eq(category));
        }
        if (text) {
          filtered = filtered.where((expense) =>
            or(expense.description.ilike(pattern), expense.supplier.ilike(pattern)),
          );
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((expense) => expense.date.desc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        return {
          rows: rows.map((row) => ({
            id: row.id,
            description: row.description,
            category: row.category,
            amount: toNumber(row.amount),
            date: String(row.date),
            createdAt: String(row.createdAt),
            supplier: row.supplier,
            paidFrom: row.paidFrom,
            voidReason: row.voidReason,
            voided: !!row.voidedAt,
          })),
          total,
        };
      },

      /**
       * Movimientos para la lista de Finanzas (pagos aprobados + gastos):
       * el pago se titula con el cliente y lleva "concepto · medio"; el gasto
       * se titula con su descripción y lleva "categoría · Caja menor".
       */
      getMovements: async (limit = 30, range?: { start: Date; end: Date }): Promise<MovementRow[]> => {
        const safeLimit = Math.min(60, Math.max(1, Math.trunc(limit)));
        // Con `range` (un día, semana o mes de la gráfica) solo trae lo de ese rango: [start, end).
        const from = range ? Temporal.Instant.fromEpochMilliseconds(range.start.getTime()) : null;
        const until = range ? Temporal.Instant.fromEpochMilliseconds(range.end.getTime()) : null;
        const [payments, expenses] = await Promise.all([
          db.orm.public.Payment
            .where({ tenantId })
            .where((payment) =>
              from && until
                ? and(payment.status.eq("APPROVED"), payment.createdAt.gte(from), payment.createdAt.lt(until))
                : payment.status.eq("APPROVED"),
            )
            .orderBy((payment) => payment.createdAt.desc())
            .limit(safeLimit)
            .all(),
          db.orm.public.Expense
            .where({ tenantId })
            .where((expense) => expense.voidedAt.isNull())
            .where((expense) => (from && until ? and(expense.date.gte(from), expense.date.lt(until)) : expense.voidedAt.isNull()))
            .orderBy((expense) => expense.date.desc())
            .limit(safeLimit)
            .all(),
        ]);
        const customerIds = [
          ...new Set(payments.map((p) => p.customerId).filter((id): id is string => Boolean(id))),
        ];
        const customers =
          customerIds.length === 0
            ? []
            : await db.orm.public.Customer
                .where({ tenantId })
                .where((customer) => customer.id.in(customerIds))
                .all();
        const nameById = new Map(customers.map((c) => [c.id, c.name]));
        const rows: MovementRow[] = [
          ...payments.map((p) => ({
            id: `payment-${p.id}`,
            type: "in" as const,
            title: p.customerId ? (nameById.get(p.customerId) ?? "Cliente eliminado") : "Venta de mostrador",
            subtitle: `${p.description?.trim() || "Pago"} · ${paymentMethodLabel(p.provider as PaymentMethodValue)}`,
            amount: toNumber(p.amount),
            at: String(p.createdAt),
          })),
          ...expenses.map((e) => ({
            id: `expense-${e.id}`,
            type: "out" as const,
            title: e.description,
            subtitle: `${e.category} · Caja menor`,
            amount: toNumber(e.amount),
            at: String(e.date),
          })),
        ];
        rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
        return rows.slice(0, safeLimit);
      },

      /**
       * Últimos movimientos del tenant (pagos aprobados + gastos), ordenados
       * por fecha descendente. Base para la "Actividad reciente" del dashboard.
       */
      getRecentActivity: async (
        limit = 5,
      ): Promise<RecentActivityRow[]> => {
        const safeLimit = Math.min(20, Math.max(1, Math.trunc(limit)));

        const [payments, expenses] = await Promise.all([
          db.orm.public.Payment
            .where({ tenantId })
            .where((payment) => payment.status.eq("APPROVED"))
            .orderBy((payment) => payment.createdAt.desc())
            .limit(safeLimit)
            .all(),
          db.orm.public.Expense
            .where({ tenantId })
            .where((expense) => expense.voidedAt.isNull())
            .orderBy((expense) => expense.date.desc())
            .limit(safeLimit)
            .all(),
        ]);

        const customerIds = [
          ...new Set(
            payments
              .map((payment) => payment.customerId)
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

        const items: RecentActivityRow[] = [
          ...payments.map((payment) => ({
            id: `payment-${payment.id}`,
            type: "payment" as const,
            title: "Pago recibido",
            description:
              (payment.customerId
                ? customerById.get(payment.customerId)?.name ?? "Cliente eliminado"
                : "Cliente libre") ?? "Cliente libre",
            amount: toNumber(payment.amount),
            date: String(payment.createdAt),
          })),
          ...expenses.map((expense) => ({
            id: `expense-${expense.id}`,
            type: "expense" as const,
            title: "Gasto registrado",
            description: expense.description,
            amount: -toNumber(expense.amount),
            date: String(expense.date),
          })),
        ];

        items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
        return items.slice(0, safeLimit);
      },
    },

    memberships: {
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
    },

  };
}
