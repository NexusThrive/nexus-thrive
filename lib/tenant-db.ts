import { and, or } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import {
  DEFAULT_MODULES_BY_VERTICAL,
  type VerticalValue,
} from "@/lib/admin-catalogs";
import type {
  PaymentMethodValue,
  PaymentStatusValue,
} from "@/lib/finance";
import {
  EXPIRING_WINDOW_DAYS,
  computeMembershipStatus,
  plusDays,
} from "@/lib/memberships";
import type {
  MembershipPaymentEntry,
  MembershipStatusValue,
  MembershipTypeValue,
} from "@/lib/memberships";

/** Escapa los comodines de LIKE para que la búsqueda sea literal. */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export type CustomerSearchInput = {
  /** Texto libre (nombre, email o teléfono). */
  q?: string;
  /** `active` = clientes vigentes; `archived` = dados de baja. */
  status?: "active" | "archived";
  sort?: "recent" | "name_asc" | "name_desc";
  page?: number;
  pageSize?: number;
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
};

/** Detalle de membresía con historial de cobros (Json). */
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

      /** Cantidad de clientes activos (para el dashboard). */
      countActive: () =>
        db.orm.public.Customer
          .where({ tenantId })
          .where((customer) => customer.active.eq(true))
          .aggregate((aggregate) => ({ total: aggregate.count() }))
          .then(({ total }) => total),
    },

    users: {
      list: () => db.orm.public.User.where({ tenantId }).all(),

      get: (id: string) =>
        db.orm.public.User.where({ id, tenantId }).first(),

      findByClerkUserId: (clerkUserId: string) =>
        db.orm.public.User.where({ clerkUserId, tenantId }).first(),

      /** Primer usuario registrado en este tenant, o null si el tenant aún no tiene miembros. */
      findFirst: () => db.orm.public.User.where({ tenantId }).first(),

      create: (data: Omit<Parameters<typeof db.orm.public.User.create>[0], "tenantId">) =>
        db.orm.public.User.create({
          ...data,
          tenantId,
        }),

      /**
       * Crea la membresía del usuario en este tenant de forma idempotente.
       * Si (clerkUserId, tenantId) ya existe, devuelve la fila existente sin
       * modificarla — así dos requests concurrentes no estrellan la clave única.
       */
      upsertByClerkUserId: (
        data: Omit<
          Parameters<typeof db.orm.public.User.upsert>[0]["create"],
          "tenantId"
        >
      ) =>
        db.orm.public.User.upsert({
          create: { ...data, tenantId },
          update: {},
          conflictOn: { clerkUserId: data.clerkUserId, tenantId },
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
            expense.description.ilike(pattern),
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
          })),
          total,
        };
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
          })),
          total,
        };
      },

      /**
       * Detalle de una membresía (incluye historial de cobros Json).
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

        const payments: MembershipPaymentEntry[] = Array.isArray(membership.payments)
          ? (membership.payments as unknown as MembershipPaymentEntry[])
          : [];

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

    /**
     * Wizard de onboarding del tenant (progresivo, idempotente).
     *
     * Todas las escrituras van POR `tenantId` (nunca se confía en un id o
     * slug enviado por el navegador para resolver la fila) y el gates de la
     * ruta ya validó membresía antes de que llegara una action.
     */
    onboarding: {
      /**
       * Activa los módulos por defecto de la vertical seleccionada.
       * Idempotente: el upsert sobre `[tenantId, moduleName]` nunca crea
       * duplicados aunque se re-ejecute (paso 2, finalización, reintentos).
       */
      activateModules: async (vertical: VerticalValue) => {
        const modules = DEFAULT_MODULES_BY_VERTICAL[vertical];
        await Promise.all(
          modules.map((moduleName) =>
            db.orm.public.TenantModule.upsert({
              create: { tenantId, moduleName },
              update: {},
              conflictOn: { tenantId, moduleName },
            }),
          ),
        );
        return [...modules];
      },

      /** Paso 1: identidad y ubicación (el slug NO se toca desde aquí). */
      saveIdentity: (data: {
        name: string;
        city: string;
        whatsappNumber: string;
      }) => db.orm.public.Tenant.where({ id: tenantId }).update(data),

      /** Paso 2: vertical del negocio. */
      setVertical: (vertical: VerticalValue) =>
        db.orm.public.Tenant.where({ id: tenantId }).update({ vertical }),

      /** Paso 3: ecosistema digital. */
      saveEcosystem: (data: {
        websiteUrl: string;
        instagramHandle: string;
        googleBusinessUrl: string;
      }) => db.orm.public.Tenant.where({ id: tenantId }).update(data),

      /** Paso 4: métodos de pago aceptados (catálogo de la plataforma). */
      setPaymentMethods: (methods: readonly PaymentMethodValue[]) =>
        db.orm.public.Tenant.where({ id: tenantId }).update({
          paymentMethods: [...methods],
        }),

      /**
       * Finalización del wizard: re-activa los módulos de la vertical,
       * crea los clientes iniciales opcionales (dedupe) y marca
       * `onboardingCompleted = true` — TODO en una transacción. Si algo
       * falla, nada queda a medias y el tenant sigue en onboarding.
       */
      complete: async (input: {
        customers: { name: string; phone: string; email: string }[];
      }) =>
        db.transaction(async (tx) => {
          const tenant = await tx.orm.public.Tenant
            .where({ id: tenantId })
            .first();
          if (!tenant) {
            throw new Error("Tenant no encontrado para completar onboarding.");
          }

          // Módulos según la vertical persistida (nunca la del navegador).
          for (const moduleName of DEFAULT_MODULES_BY_VERTICAL[tenant.vertical]) {
            await tx.orm.public.TenantModule.upsert({
              create: { tenantId, moduleName },
              update: {},
              conflictOn: { tenantId, moduleName },
            });
          }

          // Clientes iniciales opcionales: solo se crean si no existe ya
          // una fila con el mismo teléfono (o correo) en ESTE tenant.
          let created = 0;
          for (const row of input.customers) {
            let byCustomer = tx.orm.public.Customer.where({ tenantId });
            byCustomer = row.email
              ? byCustomer.where((customer) =>
                  or(customer.phone.eq(row.phone), customer.email.eq(row.email)),
                )
              : byCustomer.where((customer) => customer.phone.eq(row.phone));

            const existing = await byCustomer.first();
            if (!existing) {
              await tx.orm.public.Customer.create({
                name: row.name,
                phone: row.phone,
                email: row.email,
                tenantId,
              });
              created += 1;
            }
          }

          await tx.orm.public.Tenant.where({ id: tenantId }).update({
            onboardingCompleted: true,
          });

          return { createdCustomers: created, vertical: tenant.vertical };
        }),
    },
  };
}
