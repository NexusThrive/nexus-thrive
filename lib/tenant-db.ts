import { or } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";

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
  };
}
