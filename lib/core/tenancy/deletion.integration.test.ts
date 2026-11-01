import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { deleteTenantCompletely, TENANT_DELETION_TABLES } from "./deletion";

/**
 * Borrado de raíz de un negocio.
 *
 * Comprueba tres cosas:
 *
 * 1. Que NO queda ni un dato del negocio: se crea un negocio con filas en
 *    muchas tablas (clientes, membresías, dinero, asistencia, proyectos,
 *    tickets, leads…) y se comprueba que todo desaparece.
 * 2. Que el borrado es COMPLETO de cara al futuro: la lista de tablas que
 *    cubre el borrado se compara con las que de verdad tienen `tenantId` en el
 *    contrato. Si mañana se agrega una tabla nueva con `tenantId`, esta prueba
 *    falla hasta que se añada al borrado.
 * 3. Que NO se toca lo que es de la plataforma: los roles del panel, el
 *    equipo de NEXUS ni los códigos de acceso.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

/** Tablas del contrato que tienen la columna `tenantId`. */
function tablasConTenantId(): string[] {
  const contract = JSON.parse(readFileSync("prisma/contract.json", "utf8")) as {
    storage: {
      namespaces: {
        public: { entries: { table: Record<string, { columns: Record<string, unknown> }> } };
      };
    };
  };
  const entries = contract.storage.namespaces.public.entries.table;
  return Object.entries(entries)
    .filter(([, model]) => Boolean(model.columns?.tenantId))
    .map(([name]) => name)
    .sort();
}


/**
 * Rellena los campos obligatorios de un modelo a partir del contrato, para
 * que la prueba no se rompa cada vez que el esquema cambia.
 */
// El ORM exige el tipo exacto de cada modelo; aquí se arman los campos
// obligatorios a partir del contrato, así que se pierde la comprobación
// estática (a cambio de que la prueba no se rompa con cada cambio de
// esquema).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fila(model: string, extra: Record<string, unknown> = {}): any {
  const contract = JSON.parse(readFileSync("prisma/contract.json", "utf8")) as {
    storage: {
      namespaces: {
        public: {
          entries: {
            table: Record<
              string,
              {
                columns: Record<
                  string,
                  {
                    codecId: string;
                    nullable?: boolean;
                    default?: unknown;
                    many?: boolean;
                    valueSet?: { entityName: string };
                  }
                >;
              }
            >;
            valueSet: Record<string, { values: string[] }>;
          };
        };
      };
    };
  };
  const ns = contract.storage.namespaces.public.entries;
  const cols = ns.table[model]?.columns ?? {};
  const out: Record<string, unknown> = { ...extra };
  for (const [name, col] of Object.entries(cols)) {
    if (col.nullable !== false) continue;
    if (out[name] !== undefined) continue;
    if (col.default) continue;
    if (name === "id") continue;
    if (col.many) {
      out[name] = [];
      continue;
    }
    // Si la columna es un enum del dominio, lo pone el bloque de enums.
    if (col.valueSet) continue;
    const codec = col.codecId;
    if (codec === "pg/text@1") out[name] = "x";
    else if (codec === "pg/int4@1") out[name] = 1;
    else if (codec === "pg/int8@1") out[name] = 1n;
    else if (codec === "pg/numeric@1") out[name] = "1.00";
    else if (codec === "pg/bool@1") out[name] = true;
    else if (codec.includes("timestamptz")) out[name] = Temporal.Instant.fromEpochMilliseconds(Date.now());
    else if (codec.includes("date")) out[name] = "2026-01-01";
  }
  // Los enums del dominio: la columna apunta a su valueSet (ProjectStatus →
  // "status"); se usa su valor por defecto si lo tiene, y si no, el primero.
  for (const [name, col] of Object.entries(cols)) {
    if (out[name] !== undefined) continue;
    if (col.many) {
      out[name] = [];
      continue;
    }
    const entityName = col.valueSet?.entityName;
    if (!entityName) continue;
    const values = ns.valueSet[entityName]?.values;
    if (!values?.length) continue;
    const def = col.default;
    const valorPorDefecto =
      def && typeof def === "object" && "value" in def ? String((def as { value: unknown }).value) : null;
    out[name] = valorPorDefecto && values.includes(valorPorDefecto) ? valorPorDefecto : values[0];
  }
  return out;
}

describe.skipIf(!enabled)("borrado de raíz de un negocio (integración)", () => {
  const suffix = Date.now().toString(36);
  let tenantId = "";
  let benefitCodeId = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }
  });

  afterAll(async () => {
    if (tenantId) {
      await db.orm.public.Tenant.where({ id: tenantId }).delete().catch(() => undefined);
    }
    if (benefitCodeId) {
      await db.orm.public.BenefitCode.where({ id: benefitCodeId }).delete().catch(() => undefined);
    }
    await db.close();
  });

  test("el borrado cubre TODAS las tablas con tenantId", () => {
    const tablas = tablasConTenantId();
    expect(tablas.length).toBeGreaterThan(40);
    const sinCubrir = tablas.filter((t) => !TENANT_DELETION_TABLES.includes(t));
    expect(sinCubrir).toEqual([]);
  });

  test("se borra el negocio con todos sus datos y no se toca la plataforma", async () => {
    const clerkUserId = `user_borrado_${suffix}`;

    // --- Se monta un negocio con datos en muchas tablas ---
    const tenant = await db.orm.public.Tenant.create(
      fila("Tenant", {
        name: "Negocio Para Borrar",
        slug: `borrar-${suffix}`,
        vertical: "gym",
        onboardingCompleted: true,
      }),
    );
    tenantId = tenant.id;

    const customer = await db.orm.public.Customer.create(
      fila("Customer", { tenantId, name: "Cliente Test", documentId: `doc-${suffix}` }),
    );
    await db.orm.public.User.create(
      fila("User", {
        tenantId,
        clerkUserId,
        email: `dueno-${suffix}@ejemplo.com`,
        name: "Dueño Test",
        role: "OWNER",
      }),
    );
    await db.orm.public.Membership.create(
      fila("Membership", {
        tenantId,
        customerId: customer.id,
        startDate: Temporal.Instant.fromEpochMilliseconds(Date.now() - 86_400_000),
        endDate: Temporal.Instant.fromEpochMilliseconds(Date.now() + 86_400_000),
        price: "100000.00",
      }),
    );
    await db.orm.public.Attendance.create(
      fila("Attendance", { tenantId, customerId: customer.id, allowed: true }),
    );
    await db.orm.public.Booking.create(
      fila("Booking", {
        tenantId,
        customerId: customer.id,
        serviceName: "Servicio test",
        startDate: Temporal.Instant.fromEpochMilliseconds(Date.now()),
        endDate: Temporal.Instant.fromEpochMilliseconds(Date.now() + 3_600_000),
        totalAmount: 100000n,
      }),
    );
    await db.orm.public.TenantModule.create(
      fila("TenantModule", { tenantId, moduleName: "dashboard", active: true }),
    );
    await db.orm.public.Expense.create(
      fila("Expense", {
        tenantId,
        description: "Gasto test",
        amount: "50000.00",
        date: Temporal.Instant.fromEpochMilliseconds(Date.now()),
      }),
    );
    await db.orm.public.InboxConversation.create(
      fila("InboxConversation", {
        tenantId,
        contactName: "Test",
        contactHandle: `test-${suffix}@ejemplo.com`,
        subject: "Hola",
      }),
    );
    await db.orm.public.Lead.create(
      fila("Lead", {
        contactName: "Lead Test",
        company: "Empresa Test",
        valueUsdCents: 100000,
      }),
    );
    await db.orm.public.SupportTicket.create(
      fila("SupportTicket", {
        tenantId,
        subject: "Ticket test",
        status: "NEW",
        year: 2026,
        seq: (parseInt(suffix.slice(-5), 36) % 9000) + 100,
      }),
    );
    await db.orm.public.Project.create(
      fila("Project", { tenantId, name: "Obra test", code: `OB-${suffix}`, customerId: customer.id }),
    );
    await db.orm.public.PresenceRequest.create(
      fila("PresenceRequest", {
        tenantId,
        businessName: "Negocio Test",
      }),
    );

    // Un código de acceso de la plataforma: NO se debe borrar.
    const code = await db.orm.public.BenefitCode.create(
      fila("BenefitCode", {
        code: `BORR${suffix.slice(-6).toUpperCase()}`,
        label: "Código de prueba (no se borra)",
        plan: "ELITE",
        durationDays: 30,
        active: true,
      }),
    );
    benefitCodeId = code.id;

    const rolesAntes = (await db.orm.public.StaffRole.all()).length;
    const staffAntes = (await db.orm.public.StaffMember.all()).length;

    // --- Se borra ---
    const r = await deleteTenantCompletely(tenantId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // El negocio ya no está.
    expect(await db.orm.public.Tenant.where({ id: tenantId }).first()).toBeNull();
    // Las cuentas de Clerk quedan libres (se devuelven para avisar).
    expect(r.clerkUsers).toContain(clerkUserId);

    // No queda ni una fila de sus datos (en todas las tablas con tenantId).
    const orm = db.orm.public as unknown as Record<
      string,
      { where: (w: Record<string, unknown>) => { aggregate: (fn: (a: { count: () => unknown }) => unknown) => Promise<{ total: number }> } }
    >;
    for (const tabla of tablasConTenantId()) {
      const collection = orm[tabla];
      if (!collection) continue;
      const { total } = await collection.where({ tenantId }).aggregate((a) => ({ total: a.count() }));
      expect({ tabla, filas: total }).toEqual({ tabla, filas: 0 });
    }

    // Lo de la plataforma sigue ahí.
    expect(await db.orm.public.BenefitCode.where({ id: benefitCodeId }).first()).not.toBeNull();
    expect((await db.orm.public.StaffRole.all()).length).toBe(rolesAntes);
    expect((await db.orm.public.StaffMember.all()).length).toBe(staffAntes);
  });
});
