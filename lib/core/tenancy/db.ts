/**
 * Acceso a datos del negocio (Core): `createTenantDb(tenantId)` devuelve el repositorio con las consultas y escrituras
 * de clientes, gastos, ficha 360° y demás datos del negocio, siempre acotadas por `tenantId`. Es el archivo más grande
 * de `lib/` y está pendiente de dividirse por dominio.
 */
import { bogotaDayKey, buildFinanceSeries, cumulativeByDay, lastBogotaDays, type FinanceSeries } from "@/lib/foundation/kernel/finance-series";
import {
  and,
  or,
} from "@prisma/orm-postgres/orm-client";
import {
  db,
} from "@/prisma/db";
import { toNumber } from "@/lib/foundation/format";
import { type VerticalValue } from "@/lib/core/sectors/verticals";
import { DEFAULT_MODULES_BY_VERTICAL } from "@/lib/core/sectors/catalog";
import {
  paymentMethodLabel,
  paymentStatusLabel,
  type PaymentMethodValue,
  type PaymentStatusValue,
} from "@/lib/foundation/kernel/payment-vocabulary";
import { monthRangeBogota, resolveMonthYear } from "@/lib/foundation/dates/bogota-month";
import { escapeLike } from "@/lib/foundation/db/sql-like";


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

/**
 * Todo lo que necesita la vista 360° (serializable, scoped al tenant). Las
 * membresías y demás datos de un rubro no van aquí: llegan como aportes
 * (`Customer360Contribution`) y la pantalla los reúne.
 */
export type Customer360Details = {
  customer: Customer360Profile;
  /** Últimos 200 pagos, descendente por fecha. */
  payments: Customer360Payment[];
  paymentsTotal: number;
  /** Últimas 100 notas, descendente por fecha. */
  notes: Customer360Note[];
  timeline: CustomerTimelineEvent[];
  metrics: Customer360Metrics;
};

/**
 * Contrato de aportes a la ficha 360° (G1).
 *
 * Una capacidad o industria (hoy, el gimnasio con sus membresías) aporta a la
 * ficha sin que Core la conozca: entrega sus eventos de línea de tiempo, su
 * actividad más reciente y una señal para el estado de cuenta. La pantalla
 * reúne los aportes y llama a `buildCustomer360`.
 */
export type Customer360Contribution = {
  /** Eventos propios para la línea de tiempo unificada. */
  events: CustomerTimelineEvent[];
  /** Actividad propia más reciente (ISO) o `null`. */
  lastActivityDate: string | null;
  /** ¿El cliente tiene registros propios? (distingue «sin actividad»). */
  hasRecords: boolean;
  /**
   * Señal para el estado de cuenta: `overdue` = algo vencido (la cuenta queda
   * «vencido»), `current` = al día, `null` = sin señal.
   */
  accountSignal: "overdue" | "current" | null;
};

/** Datos de Core de la ficha 360°, antes de sumar los aportes. */
export type Customer360Base = {
  customer: Customer360Profile;
  payments: Customer360Payment[];
  paymentsTotal: number;
  notes: Customer360Note[];
  /** Eventos de pagos y de notas, ya con su título y descripción. */
  paymentEvents: CustomerTimelineEvent[];
  noteEvents: CustomerTimelineEvent[];
  ltv: number;
  approvedCount: number;
  pendingCount: number;
  favoriteMethod: PaymentMethodValue | null;
  /** Actividad más reciente entre pagos y notas. */
  lastActivityDate: string | null;
};

const CUSTOMER_TIMELINE_CAP = 30;

/**
 * Une la ficha de Core con los aportes de otras capacidades. Función pura.
 *
 * Reglas del estado de cuenta (nunca inventado):
 * 1. sin pagos, notas ni registros de ningún aporte → sin actividad
 * 2. algún aporte vencido → vencido
 * 3. pagos pendientes → pendiente
 * 4. algún aporte vigente o pagos aprobados → al día
 * 5. (solo notas o pagos no aprobados) → sin datos
 */
export function buildCustomer360(
  base: Customer360Base,
  contributions: readonly Customer360Contribution[] = [],
): Customer360Details {
  let lastActivityDate = base.lastActivityDate;
  for (const contribution of contributions) {
    lastActivityDate = maxIso(lastActivityDate, contribution.lastActivityDate);
  }

  const hasRecords =
    base.payments.length > 0 ||
    base.notes.length > 0 ||
    contributions.some((contribution) => contribution.hasRecords);

  let accountStatus: CustomerAccountStatus;
  if (!hasRecords) {
    accountStatus = "sin_actividad";
  } else if (contributions.some((contribution) => contribution.accountSignal === "overdue")) {
    accountStatus = "vencido";
  } else if (base.pendingCount > 0) {
    accountStatus = "pendiente";
  } else if (
    contributions.some((contribution) => contribution.accountSignal !== null) ||
    base.approvedCount > 0
  ) {
    accountStatus = "al_dia";
  } else {
    accountStatus = "sin_datos";
  }

  // Orden: pagos, aportes, notas (el desempate entre fechas iguales lo conserva).
  const timeline = [
    ...base.paymentEvents,
    ...contributions.flatMap((contribution) => contribution.events),
    ...base.noteEvents,
  ]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, CUSTOMER_TIMELINE_CAP);

  return {
    customer: base.customer,
    payments: base.payments,
    paymentsTotal: base.paymentsTotal,
    notes: base.notes,
    timeline,
    metrics: {
      ltv: base.ltv,
      approvedCount: base.approvedCount,
      avgTicket: base.approvedCount > 0 ? base.ltv / base.approvedCount : 0,
      favoriteMethod: base.favoriteMethod,
      lastActivityDate,
      accountStatus,
    },
  };
}

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

/**
 * Carga la base de la ficha 360° del cliente. Siempre scoped por `tenantId`:
 * devuelve `null` si el cliente no pertenece a este negocio.
 */
async function load360Base(tenantId: string, customerId: string): Promise<Customer360Base | null> {
  const customer = await db.orm.public.Customer
    .select("id", "name", "email", "phone", "active", "createdAt", "updatedAt")
    .where({ id: customerId, tenantId })
    .first();
  if (!customer) {
    return null;
  }

  const PAYMENTS_CAP = 200;

  const [payments, paymentsTotalAgg, approvedAgg, pendingCountAgg] = await Promise.all([
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

  // --- Métricas -------------------------------------------------------
  const ltv = toNumber(approvedAgg.total);
  const approvedCount = approvedAgg.count;

  // Método más frecuente entre pagos aprobados (lista desc: ante empate,
  // gana el más reciente).
  const methodFrequency = new Map<PaymentMethodValue, number>();
  for (const payment of payments) {
    if (payment.status !== "APPROVED") {
      continue;
    }
    methodFrequency.set(payment.provider, (methodFrequency.get(payment.provider) ?? 0) + 1);
  }
  let favoriteMethod: PaymentMethodValue | null = null;
  let favoriteCount = 0;
  for (const [method, count] of methodFrequency) {
    if (count > favoriteCount) {
      favoriteCount = count;
      favoriteMethod = method;
    }
  }

  // Última actividad entre pagos y notas (vienen desc: basta el primero).
  let lastActivityDate: string | null = null;
  if (payments.length > 0) {
    lastActivityDate = String(payments[0].createdAt);
  }
  if (notes.length > 0) {
    lastActivityDate = maxIso(lastActivityDate, notes[0].createdAt);
  }

  // --- Eventos del timeline de Core ----------------------------------
  const paymentEvents = serializedPayments.map(
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
  );
  const noteEvents = notes.map(
    (note): CustomerTimelineEvent => ({
      id: `note-${note.id}`,
      type: "note",
      date: note.createdAt,
      title: note.authorName ? `Nota de ${note.authorName}` : "Nota interna",
      description: note.content.length > 140 ? `${note.content.slice(0, 140)}…` : note.content,
    }),
  );

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
    notes,
    paymentEvents,
    noteEvents,
    ltv,
    approvedCount,
    pendingCount: pendingCountAgg.total,
    favoriteMethod,
    lastActivityDate,
  };
}



/**
 * Crea el repositorio de datos de un negocio. Exige un `tenantId` no vacío; todas las consultas que devuelve quedan acotadas a ese negocio.
 */
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
      /**
       * Datos de Core de la ficha 360° (cliente, pagos y notas), sin los aportes
       * de ninguna capacidad ni rubro. Devuelve `null` si el cliente no existe o
       * es de otro tenant. La pantalla suma los aportes con `buildCustomer360`.
       */
      get360Base: (customerId: string): Promise<Customer360Base | null> =>
        load360Base(tenantId, customerId),

      /**
       * Ficha 360° completa: la base de Core más los aportes recibidos. Sin
       * aportes es la ficha general (pagos y notas).
       */
      get360Details: async (
        customerId: string,
        contributions: readonly Customer360Contribution[] = [],
      ): Promise<Customer360Details | null> => {
        const base = await load360Base(tenantId, customerId);
        return base ? buildCustomer360(base, contributions) : null;
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
       * Trae solo monto y fecha de la ventana y agrupa en lib/foundation/kernel/finance-series.
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

  };
}
