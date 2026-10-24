import { and, or } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import {
  formatCurrency,
  formatDateShort,
  formatRelativeTime,
  toNumber,
} from "@/lib/format";
import {
  paymentStatusLabel,
  type PaymentMethodValue,
} from "@/lib/finance";
import {
  MODULES,
  sortModules,
  type ModuleValue,
  type VerticalValue,
} from "@/lib/admin/catalogs";
import type { OnboardingTenantType } from "@/lib/onboarding/types";

/** Vigencia de la invitación al dueño de un negocio creado desde el panel. */
const OWNER_INVITE_DAYS = 14;

/**
 * Capa de datos GLOBAL de la plataforma (capa /admin).
 *
 * A diferencia de `lib/tenant/db.ts`, estas consultas NO están scoped a un
 * tenant: operan sobre todos los negocios. Se mantiene deliberadamente
 * separado para no romper el aislamiento conceptual Platform ↔ Tenant.
 *
 * Regla de oro (spec CEO): nada de mocks ni métricas inventadas. Cada número
 * sale de la base de datos real; lo que no existe (suscripciones/MRR, trials,
 * último login, estado DNS) se marca explícitamente como no disponible.
 */

/** Ventana de "actividad reciente" para el pulso de la plataforma. */
export const ACTIVITY_WINDOW_DAYS = 7;
/** Ventana del sparkline de altas y del volumen transaccionado. */
export const TREND_WINDOW_DAYS = 30;
/** Onboarding sin completar tras N días = "detenido" (alerta del CEO). */
export const STALLED_ONBOARDING_DAYS = 7;
/** Tope de filas que se pueden exportar/leer de una sola vez. */
const MAX_EXPORT_ROWS = 5000;

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Helpers de fecha (Temporal.Instant es el codec del driver Postgres)
// ---------------------------------------------------------------------------

function instantFromMs(ms: number): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(ms);
}

/** Normaliza Temporal.Instant / Date / string ISO a un Date de JS. */
function toJsDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  // JS Date solo acepta 3 fracciones (ms); Temporal imprime nanos.
  const iso = String(value).replace(/\.(\d{3})\d*(Z|[+-])/, ".$1$2");
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

const bogotaDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Clave de día calendario en America/Bogota (YYYY-MM-DD). */
function bogotaDayKey(value: unknown): string {
  return bogotaDayFormatter.format(toJsDate(value));
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ExecutiveKpis = {
  /**
   * Volumen transaccionado por los negocios (pagos APPROVED). NO es MRR de
   * Nexus: no existe modelo de suscripciones, así que no se inventa.
   */
  revenue: {
    total: number;
    previous: number;
    changePct: number | null;
    windowDays: number;
  };
  /** Altas de negocios: semana, mes y serie diaria para el sparkline. */
  newTenants: {
    week: number;
    month: number;
    series: { date: string; count: number }[];
  };
  /** Estado del wizard de configuración de los negocios. */
  onboarding: { pending: number; stalled: number; completed: number };
  /** Negocios con actividad real en la ventana reciente. */
  realActivity: { activeTenants: number; windowDays: number };
  /** Señales que requieren acción del CEO. */
  alerts: {
    total: number;
    failedPayments: number;
    stalledOnboarding: number;
    suspendedTenants: number;
  };
};

export type TenantSortKey =
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc"
  | "activity_desc"
  | "activity_asc";

export type TenantListInput = {
  /** Host de la request actual: base para las URLs de acceso directo. */
  host: string;
  /** Texto libre contra name, slug o customDomain. */
  q?: string;
  vertical?: VerticalValue;
  activeStatus?: "active" | "inactive" | "all";
  /** Solo negocios que requieren atención (onboarding pendiente o suspendido). */
  attentionOnly?: boolean;
  sort?: TenantSortKey;
  page?: number;
  limit?: number;
};

/** Fila serializable de tenant (fechas → string, métricas derivadas reales). */
export type TenantListRow = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  vertical: VerticalValue;
  /** Perfil adaptativo del onboarding (Empresa / Persona individual). */
  tenantType: OnboardingTenantType;
  legalName: string | null;
  taxId: string | null;
  teamSize: string | null;
  address: string | null;
  active: boolean;
  /** Motivo de la última suspensión administrativa (historial). */
  suspendedReason: string | null;
  /** Ciudad declarada en el onboarding (Paso 1). */
  city: string | null;
  /** Wizard de onboarding (false = aún no configuró el negocio). */
  onboardingCompleted: boolean;
  /** Progreso real de configuración derivado de los campos del onboarding. */
  onboardingProgress: number;
  /** Canales del ecosistema digital (Paso 3; null = sin dato). */
  ecosystem: {
    whatsappNumber: string | null;
    instagramHandle: string | null;
    websiteUrl: string | null;
    googleBusinessUrl: string | null;
  };
  /** ISO para orden/export; la UI formatea. */
  createdAtIso: string;
  createdAt: string;
  updatedAtIso: string;
  /** Última actividad real del negocio (última modificación de la fila). */
  lastActivityLabel: string;
  /** Usuarios registrados del negocio. */
  usersCount: number;
  /** Módulos activos, en orden del catálogo. */
  modules: ModuleValue[];
  /**
   * Plan de suscripción: siempre `null` mientras no exista un modelo de
   * planes/ingresos recurrentes. La UI lo muestra como "—".
   */
  plan: null;
  /** URL de acceso directo al negocio (calculada con el host actual). */
  url: string;
};

export type TenantDetailMetrics = {
  customersCount: number;
  quotesCount: number;
  quotesTotal: number;
  paymentsCount: number;
  paymentsApprovedCount: number;
  paymentsApprovedTotal: number;
  membershipsActive: number;
};

export type TenantDetailUser = {
  id: string;
  name: string | null;
  email: string;
  role: "SUPERADMIN" | "OWNER" | "STAFF" | "ADMIN" | "RECEPTION" | "ADVISOR";
  roleLabel: string;
  createdAt: string;
};

export type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  vertical: VerticalValue;
  /** Perfil adaptativo del onboarding (Empresa / Persona individual). */
  tenantType: OnboardingTenantType;
  legalName: string | null;
  taxId: string | null;
  teamSize: string | null;
  address: string | null;
  active: boolean;
  suspendedReason: string | null;
  suspendedAt: string | null;
  onboardingCompleted: boolean;
  onboardingProgress: number;
  city: string | null;
  whatsappNumber: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  googleBusinessUrl: string | null;
  paymentMethods: PaymentMethodValue[];
  createdAtIso: string;
  createdAt: string;
  updatedAtIso: string;
  lastActivityLabel: string;
  /** Los 11 módulos del catálogo con su estado (los ausentes = inactivos). */
  modules: { moduleName: ModuleValue; active: boolean }[];
  users: TenantDetailUser[];
  metrics: TenantDetailMetrics;
};

/** Eventos reales de plataforma (unión de las tablas de actividad). */
export type ActivityKind =
  | "tenant_created"
  | "payment_approved"
  | "payment_declined"
  | "payment_pending"
  | "quote_created"
  | "quote_approved"
  | "customer_created"
  | "membership_created"
  | "user_created"
  | "tenant_suspended"
  | "tenant_activated"
  | "module_toggled"
  | "audit";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string | null;
  tenantId: string | null;
  tenantName: string | null;
  /** ISO (la UI formatea relativo/absoluto). */
  at: string;
  atLabel: string;
};

/** Acciones auditables del panel CEO (string controlado, no enum). */
export type AuditAction =
  | "CREATE_TENANT"
  | "SUSPEND_TENANT"
  | "ACTIVATE_TENANT"
  | "TOGGLE_MODULE"
  | "EXPORT_TENANTS"
  | "IMPERSONATE"
  // Operations Center (equipo, cuentas, catálogo, comercial, soporte, cobros)
  | "STAFF_INVITE"
  | "STAFF_ROLE_CHANGE"
  | "STAFF_DEACTIVATE"
  | "STAFF_REACTIVATE"
  | "ROLE_CREATE"
  | "ROLE_UPDATE"
  | "ROLE_DELETE"
  | "ACCOUNT_UPDATE"
  | "CONTACT_SAVE"
  | "CONTACT_DELETE"
  | "CATALOG_UPDATE"
  | "LEAD_SAVE"
  | "LEAD_STAGE"
  | "LEAD_CONVERT"
  | "TICKET_SAVE"
  | "TICKET_STATUS"
  | "SUBSCRIPTION_SAVE"
  | "CHARGE_RECORD"
  | "CHARGE_CONFIRM"
  | "CHARGE_REFUND"
  | "BENEFIT_CREATE"
  | "BENEFIT_UPDATE"
  | "BENEFIT_REDEEM"
  | "TENANT_DELETE"
  // Dentro de un negocio (lib/tenant/audit.ts)
  | "BIZ_PAYMENT_VOID"
  | "BIZ_EXPENSE_VOID"
  | "BIZ_INVOICE_VOID"
  | "BIZ_TICKETS_VOID"
  | "BIZ_CUSTOMER_ARCHIVE"
  | "BIZ_CUSTOMER_RESTORE"
  | "BIZ_CUSTOMERS_DELETE"
  | "BIZ_MEMBER_INVITE"
  | "BIZ_INVITE_REVOKE"
  | "BIZ_MEMBER_ROLE"
  | "BIZ_MEMBER_ACTIVE"
  | "BIZ_MODULE_TOGGLE"
  | "BIZ_API_KEY_CREATE"
  | "BIZ_API_KEY_REVOKE"
  | "BIZ_TENANT_DELETE";

export type AuditLogInput = {
  actorId: string;
  actorEmail?: string | null;
  action: AuditAction;
  targetTenantId?: string | null;
  targetTenantName?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditLogRow = {
  id: string;
  actorId: string;
  actorEmail: string | null;
  action: string;
  targetTenantId: string | null;
  targetTenantName: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type TenantRowSource = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  vertical: VerticalValue;
  tenantType: OnboardingTenantType;
  legalName: string | null;
  taxId: string | null;
  teamSize: string | null;
  address: string | null;
  active: boolean;
  onboardingCompleted: boolean;
  city: string | null;
  whatsappNumber: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  googleBusinessUrl: string | null;
  paymentMethods: readonly string[] | null;
  suspendedReason: string | null;
  createdAt: unknown;
  updatedAt: unknown;
  modules: { moduleName: ModuleValue; active: boolean }[];
};

const ROLE_LABELS: Record<"SUPERADMIN" | "OWNER" | "STAFF" | "ADMIN" | "RECEPTION" | "ADVISOR", string> = {
  SUPERADMIN: "SuperAdmin",
  OWNER: "Propietario",
  STAFF: "Equipo",
  ADMIN: "Administración",
  RECEPTION: "Recepción",
  ADVISOR: "Asesor",
};

import { AUDIT_ACTION_LABELS } from "./audit-labels";
export { AUDIT_ACTION_LABELS };

/** Escapa los comodines de LIKE para que la búsqueda sea literal. */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * URL de acceso directo a un negocio.
 * - En dev (host `*.lvh.me` / `*.localhost`): subdominio
 *   `slug.<mismo host>` — sin hardcodear dominios de producción.
 * - En cualquier otro host: ruta interna multi-tenant `/{slug}`
 *   (siempre operativa vía proxy).
 */
export function tenantAccessUrl(slug: string, host: string): string {
  const [hostname = "", port] = host.split(":");
  const portSuffix = port ? `:${port}` : "";
  if (hostname.endsWith(".lvh.me")) {
    return `http://${slug}.lvh.me${portSuffix}/`;
  }
  if (hostname.endsWith(".localhost")) {
    return `http://${slug}.localhost${portSuffix}/`;
  }
  return `/${slug}`;
}

/** Progreso real de configuración (0–100) derivado del onboarding. */
function computeOnboardingProgress(row: {
  onboardingCompleted: boolean;
  city: string | null;
  whatsappNumber: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  googleBusinessUrl: string | null;
  paymentMethods: readonly string[] | null;
}): number {
  if (row.onboardingCompleted) {
    return 100;
  }
  const signals = [
    row.city,
    row.whatsappNumber,
    row.websiteUrl,
    row.instagramHandle,
    row.googleBusinessUrl,
  ];
  const filled =
    signals.filter((value) => Boolean(value && String(value).trim())).length +
    (row.paymentMethods && row.paymentMethods.length > 0 ? 1 : 0);
  return Math.round((filled / 6) * 100);
}

function buildTenantRow(
  row: TenantRowSource,
  host: string,
  usersCount: number,
): TenantListRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    customDomain: row.customDomain ?? null,
    vertical: row.vertical,
    tenantType: row.tenantType,
    legalName: row.legalName ?? null,
    taxId: row.taxId ?? null,
    teamSize: row.teamSize ?? null,
    address: row.address ?? null,
    active: row.active,
    suspendedReason: row.suspendedReason ?? null,
    city: row.city ?? null,
    onboardingCompleted: row.onboardingCompleted,
    onboardingProgress: computeOnboardingProgress(row),
    ecosystem: {
      whatsappNumber: row.whatsappNumber ?? null,
      instagramHandle: row.instagramHandle ?? null,
      websiteUrl: row.websiteUrl ?? null,
      googleBusinessUrl: row.googleBusinessUrl ?? null,
    },
    createdAtIso: toJsDate(row.createdAt).toISOString(),
    createdAt: formatDateShort(String(row.createdAt)),
    updatedAtIso: toJsDate(row.updatedAt).toISOString(),
    lastActivityLabel: formatRelativeTime(row.updatedAt),
    usersCount,
    modules: sortModules(
      row.modules.filter((module) => module.active).map((m) => m.moduleName),
    ),
    plan: null,
    url: tenantAccessUrl(row.slug, host),
  };
}

/** Conteo de usuarios por tenant, scoped a las filas de la página actual. */
async function countUsersByTenant(
  tenantIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (tenantIds.length === 0) {
    return map;
  }
  const rows = await db.orm.public.User
    .where((user) => user.tenantId.in(tenantIds))
    .select("tenantId")
    .all();
  for (const row of rows) {
    map.set(row.tenantId, (map.get(row.tenantId) ?? 0) + 1);
  }
  return map;
}

export function createAdminDb() {
  return {
    /**
     * Autorización global: el usuario es SuperAdmin si existe una fila
     * `User` con su `clerkUserId` y `role = SUPERADMIN`. El rol se asigna
     * por operación de plataforma (no existe UI de auto-asignación).
     */
    isSuperAdmin: async (clerkUserId: string): Promise<boolean> => {
      if (!clerkUserId) {
        return false;
      }
      const user = await db.orm.public.User
        .where({ clerkUserId, role: "SUPERADMIN" })
        .first();
      return user !== null;
    },

    /**
     * KPIs ejecutivos del CEO, 100% derivados de datos reales.
     *
     * Notas de honestidad (no se inventa nada):
     * - `revenue` es el volumen transaccionado por los negocios (pagos
     *   APPROVED), NO MRR: no existe modelo de suscripciones.
     * - No hay trials ni último login; se sustituyen por onboarding real.
     */
    getExecutiveMetrics: async (): Promise<ExecutiveKpis> => {
      const nowMs = Date.now();
      const since7 = instantFromMs(nowMs - 7 * DAY_MS);
      const since30 = instantFromMs(nowMs - 30 * DAY_MS);
      const since60 = instantFromMs(nowMs - 60 * DAY_MS);
      const stalledBefore = instantFromMs(
        nowMs - STALLED_ONBOARDING_DAYS * DAY_MS,
      );

      const [
        revenue30,
        revenuePrev,
        pendingOnboarding,
        completedOnboarding,
        stalledOnboarding,
        suspendedTenants,
        failedPayments,
        newThisWeek,
        recentTenants,
        activePayments,
        activeQuotes,
        activeCustomers,
        activeMemberships,
        activeUsers,
        activeNewTenants,
      ] = await Promise.all([
        db.orm.public.Payment
          .where((payment) =>
            and(
              payment.status.eq("APPROVED"),
              payment.createdAt.gte(since30),
            ),
          )
          .aggregate((aggregate) => ({ total: aggregate.sum("amount") })),
        db.orm.public.Payment
          .where((payment) =>
            and(
              payment.status.eq("APPROVED"),
              payment.createdAt.gte(since60),
              payment.createdAt.lt(since30),
            ),
          )
          .aggregate((aggregate) => ({ total: aggregate.sum("amount") })),
        db.orm.public.Tenant
          .where({ onboardingCompleted: false })
          .aggregate((aggregate) => ({ total: aggregate.count() })),
        db.orm.public.Tenant
          .where({ onboardingCompleted: true })
          .aggregate((aggregate) => ({ total: aggregate.count() })),
        db.orm.public.Tenant
          .where((tenant) =>
            and(
              tenant.onboardingCompleted.eq(false),
              tenant.createdAt.lt(stalledBefore),
            ),
          )
          .aggregate((aggregate) => ({ total: aggregate.count() })),
        db.orm.public.Tenant
          .where({ active: false })
          .aggregate((aggregate) => ({ total: aggregate.count() })),
        db.orm.public.Payment
          .where({ status: "DECLINED" })
          .aggregate((aggregate) => ({ total: aggregate.count() })),
        db.orm.public.Tenant
          .where((tenant) => tenant.createdAt.gte(since7))
          .aggregate((aggregate) => ({ total: aggregate.count() })),
        db.orm.public.Tenant
          .where((tenant) => tenant.createdAt.gte(since30))
          .select("createdAt")
          .all(),
        db.orm.public.Payment
          .where((payment) => payment.createdAt.gte(since7))
          .select("tenantId")
          .all(),
        db.orm.public.Quote
          .where((quote) => quote.createdAt.gte(since7))
          .select("tenantId")
          .all(),
        db.orm.public.Customer
          .where((customer) => customer.createdAt.gte(since7))
          .select("tenantId")
          .all(),
        db.orm.public.Membership
          .where((membership) => membership.createdAt.gte(since7))
          .select("tenantId")
          .all(),
        db.orm.public.User
          .where((user) => user.createdAt.gte(since7))
          .select("tenantId")
          .all(),
        db.orm.public.Tenant
          .where((tenant) => tenant.createdAt.gte(since7))
          .select("id")
          .all(),
      ]);

      const total = toNumber(revenue30.total);
      const previous = toNumber(revenuePrev.total);
      const changePct =
        previous > 0 ? Math.round(((total - previous) / previous) * 100) : null;

      const countsByDay = new Map<string, number>();
      for (const row of recentTenants) {
        const key = bogotaDayKey(row.createdAt);
        countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
      }
      const series: { date: string; count: number }[] = [];
      for (let i = TREND_WINDOW_DAYS - 1; i >= 0; i -= 1) {
        const key = bogotaDayKey(instantFromMs(nowMs - i * DAY_MS));
        series.push({ date: key, count: countsByDay.get(key) ?? 0 });
      }

      const activeTenantIds = new Set<string>();
      for (const row of activePayments) activeTenantIds.add(row.tenantId);
      for (const row of activeQuotes) activeTenantIds.add(row.tenantId);
      for (const row of activeCustomers) activeTenantIds.add(row.tenantId);
      for (const row of activeMemberships) activeTenantIds.add(row.tenantId);
      for (const row of activeUsers) activeTenantIds.add(row.tenantId);
      for (const row of activeNewTenants) activeTenantIds.add(row.id);

      const stalled = stalledOnboarding.total;
      const failed = failedPayments.total;
      const suspended = suspendedTenants.total;

      return {
        revenue: {
          total,
          previous,
          changePct,
          windowDays: TREND_WINDOW_DAYS,
        },
        newTenants: {
          week: newThisWeek.total,
          month: recentTenants.length,
          series,
        },
        onboarding: {
          pending: pendingOnboarding.total,
          stalled,
          completed: completedOnboarding.total,
        },
        realActivity: {
          activeTenants: activeTenantIds.size,
          windowDays: ACTIVITY_WINDOW_DAYS,
        },
        alerts: {
          total: failed + stalled + suspended,
          failedPayments: failed,
          stalledOnboarding: stalled,
          suspendedTenants: suspended,
        },
      };
    },

    /**
     * Listado paginado de tenants con búsqueda (name/slug/customDomain),
     * filtro por vertical/estado y orden. Todo se resuelve en servidor.
     */
    listTenants: async ({
      host,
      q,
      vertical,
      activeStatus = "all",
      attentionOnly = false,
      sort = "created_desc",
      page = 1,
      limit = 10,
    }: TenantListInput): Promise<{ rows: TenantListRow[]; total: number }> => {
      const text = (q ?? "").trim();
      const pattern = `%${escapeLike(text)}%`;
      const safePage = Math.max(1, Math.trunc(page));
      const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

      let filtered = db.orm.public.Tenant.where({});
      if (activeStatus === "active") {
        filtered = filtered.where({ active: true });
      } else if (activeStatus === "inactive") {
        filtered = filtered.where({ active: false });
      }
      if (attentionOnly) {
        filtered = filtered.where((tenant) =>
          or(
            tenant.onboardingCompleted.eq(false),
            tenant.active.eq(false),
          ),
        );
      }
      if (vertical) {
        filtered = filtered.where({ vertical });
      }
      if (text) {
        filtered = filtered.where((tenant) =>
          or(
            tenant.name.ilike(pattern),
            tenant.slug.ilike(pattern),
            tenant.customDomain.ilike(pattern),
          ),
        );
      }

      let ordered = filtered;
      switch (sort) {
        case "name_asc":
          ordered = filtered.orderBy((tenant) => tenant.name.asc());
          break;
        case "name_desc":
          ordered = filtered.orderBy((tenant) => tenant.name.desc());
          break;
        case "created_asc":
          ordered = filtered.orderBy((tenant) => tenant.createdAt.asc());
          break;
        case "activity_desc":
          ordered = filtered.orderBy((tenant) => tenant.updatedAt.desc());
          break;
        case "activity_asc":
          ordered = filtered.orderBy((tenant) => tenant.updatedAt.asc());
          break;
        case "created_desc":
        default:
          ordered = filtered.orderBy((tenant) => tenant.createdAt.desc());
          break;
      }

      const [rows, { total }] = await Promise.all([
        ordered
          .include("modules", (module) => module.select("moduleName", "active"))
          .limit(safeLimit)
          .offset((safePage - 1) * safeLimit)
          .all(),
        filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
      ]);

      const usersByTenant = await countUsersByTenant(rows.map((row) => row.id));

      return {
        rows: rows.map((row) =>
          buildTenantRow(
            row as unknown as TenantRowSource,
            host,
            usersByTenant.get(row.id) ?? 0,
          ),
        ),
        total,
      };
    },

    /**
     * Igual que `listTenants` pero sin paginación (tope de seguridad), para
     * la exportación CSV. Aplica los mismos filtros.
     */
    listTenantsForExport: async (
      input: Omit<TenantListInput, "page" | "limit">,
    ): Promise<TenantListRow[]> => {
      const { rows } = await createAdminDb().listTenants({
        ...input,
        page: 1,
        limit: MAX_EXPORT_ROWS,
      });
      return rows;
    },

    /** Disponibilidad de un slug (para el check en vivo del form). */
    slugExists: async (slug: string): Promise<boolean> => {
      const tenant = await db.orm.public.Tenant.where({ slug }).first();
      return tenant !== null;
    },

    /**
     * Alta de tenant + módulos iniciales en UNA transacción: si falla la
     * creación de los módulos (o el insert por slug duplicado), se
     * revierte todo — nunca quedan tenants parcialmente configurados.
     */
    createTenant: (data: {
      name: string;
      slug: string;
      vertical: VerticalValue;
      modules: ModuleValue[];
      tenantType: OnboardingTenantType;
      legalName?: string | null;
      taxId?: string | null;
      teamSize?: string | null;
      address?: string | null;
      /** Dueño invitado: el negocio nace sin miembros y con esta invitación OWNER. */
      ownerEmail: string;
    }) =>
      db.transaction(async (tx) => {
        const tenant = await tx.orm.public.Tenant.create({
          name: data.name,
          slug: data.slug,
          vertical: data.vertical,
          tenantType: data.tenantType,
          legalName: data.legalName?.trim() ? data.legalName.trim() : null,
          taxId: data.taxId?.trim() ? data.taxId.trim() : null,
          teamSize: data.teamSize?.trim() ? data.teamSize.trim() : null,
          address: data.address?.trim() ? data.address.trim() : null,
        });

        for (const moduleName of data.modules) {
          await tx.orm.public.TenantModule.create({
            tenantId: tenant.id,
            moduleName,
          });
        }

        // El dueño entra aceptando esta invitación con su correo verificado
        // (acceptInvitesFor). Sin ella, nadie puede reclamar el negocio.
        await tx.orm.public.TenantInvite.create({
          tenantId: tenant.id,
          email: data.ownerEmail,
          name: null,
          role: "OWNER",
          invitedById: null,
          expiresAt: instantFromMs(Date.now() + OWNER_INVITE_DAYS * 86_400_000),
        });

        return tenant;
      }),

    /**
     * Suspende un negocio (panel CEO): guarda motivo + timestamp. El motivo
     * es obligatorio a nivel de acción; aquí solo se persiste.
     */
    suspendTenant: (id: string, reason: string) =>
      db.orm.public.Tenant.where({ id }).update({
        active: false,
        suspendedReason: reason,
        suspendedAt: instantFromMs(Date.now()),
      }),

    /** Reactiva un negocio (conserva el historial de suspensión). */
    activateTenant: (id: string) =>
      db.orm.public.Tenant.where({ id }).update({ active: true }),

    /**
     * Detalle completo de un negocio para el drawer: identidad, onboarding,
     * módulos, usuarios y métricas reales. `null` si no existe.
     */
    getTenantDetail: async (tenantId: string): Promise<TenantDetail | null> => {
      const tenant = await db.orm.public.Tenant
        .where({ id: tenantId })
        .include("modules", (module) =>
          module.select("moduleName", "active"),
        )
        .include("users", (user) =>
          user.select("id", "name", "email", "role", "createdAt"),
        )
        .first();

      if (!tenant) {
        return null;
      }

      const now = instantFromMs(Date.now());
      const [
        customersAgg,
        quotesAgg,
        paymentsApprovedAgg,
        paymentsAllAgg,
        membershipsAgg,
      ] = await Promise.all([
        db.orm.public.Customer
          .where({ tenantId })
          .aggregate((aggregate) => ({ count: aggregate.count() })),
        db.orm.public.Quote
          .where({ tenantId })
          .aggregate((aggregate) => ({
            count: aggregate.count(),
            total: aggregate.sum("totalAmount"),
          })),
        db.orm.public.Payment
          .where({ tenantId })
          .where((payment) => payment.status.eq("APPROVED"))
          .aggregate((aggregate) => ({
            count: aggregate.count(),
            total: aggregate.sum("amount"),
          })),
        db.orm.public.Payment
          .where({ tenantId })
          .aggregate((aggregate) => ({ count: aggregate.count() })),
        db.orm.public.Membership
          .where({ tenantId })
          .where((membership) => membership.endDate.gt(now))
          .aggregate((aggregate) => ({ count: aggregate.count() })),
      ]);

      const activeByName = new Map(
        tenant.modules.map((module) => [module.moduleName, module.active]),
      );

      const users: TenantDetailUser[] = [...tenant.users]
        .sort((a, b) => {
          const roleOrder = { OWNER: 0, SUPERADMIN: 1, ADMIN: 2, RECEPTION: 3, ADVISOR: 4, STAFF: 5 } as const;
          const diff = roleOrder[a.role] - roleOrder[b.role];
          return diff !== 0
            ? diff
            : toJsDate(a.createdAt).getTime() - toJsDate(b.createdAt).getTime();
        })
        .map((user) => ({
          id: user.id,
          name: user.name ?? null,
          email: user.email,
          role: user.role,
          roleLabel: ROLE_LABELS[user.role],
          createdAt: formatDateShort(String(user.createdAt)),
        }));

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        customDomain: tenant.customDomain ?? null,
        vertical: tenant.vertical,
        tenantType: tenant.tenantType,
        legalName: tenant.legalName ?? null,
        taxId: tenant.taxId ?? null,
        teamSize: tenant.teamSize ?? null,
        address: tenant.address ?? null,
        active: tenant.active,
        suspendedReason: tenant.suspendedReason ?? null,
        suspendedAt: tenant.suspendedAt
          ? toJsDate(tenant.suspendedAt).toISOString()
          : null,
        onboardingCompleted: tenant.onboardingCompleted,
        onboardingProgress: computeOnboardingProgress(
          tenant as unknown as TenantRowSource,
        ),
        city: tenant.city ?? null,
        whatsappNumber: tenant.whatsappNumber ?? null,
        websiteUrl: tenant.websiteUrl ?? null,
        instagramHandle: tenant.instagramHandle ?? null,
        googleBusinessUrl: tenant.googleBusinessUrl ?? null,
        paymentMethods: (tenant.paymentMethods ??
          []) as PaymentMethodValue[],
        createdAtIso: toJsDate(tenant.createdAt).toISOString(),
        createdAt: formatDateShort(String(tenant.createdAt)),
        updatedAtIso: toJsDate(tenant.updatedAt).toISOString(),
        lastActivityLabel: formatRelativeTime(tenant.updatedAt),
        modules: MODULES.map((moduleName) => ({
          moduleName,
          active: activeByName.get(moduleName) ?? false,
        })),
        users,
        metrics: {
          customersCount: customersAgg.count,
          quotesCount: quotesAgg.count,
          quotesTotal: toNumber(quotesAgg.total),
          paymentsCount: paymentsAllAgg.count,
          paymentsApprovedCount: paymentsApprovedAgg.count,
          paymentsApprovedTotal: toNumber(paymentsApprovedAgg.total),
          membershipsActive: membershipsAgg.count,
        },
      };
    },

    /**
     * Resuelve el `clerkUserId` de un usuario interno (para impersonación).
     * Vive solo en el servidor: la UI nunca recibe el id de Clerk.
     */
    getUserClerkId: async (userId: string): Promise<string | null> => {
      const user = await db.orm.public.User
        .where({ id: userId })
        .select("clerkUserId")
        .first();
      return user?.clerkUserId ?? null;
    },

    /**
     * Detalle de módulos de un tenant: los 11 del catálogo con su estado
     * (los no registrados cuentan como inactivos).
     */
    getTenantModules: async (tenantId: string) => {
      const tenant = await db.orm.public.Tenant
        .where({ id: tenantId })
        .include("modules", (module) => module.select("moduleName", "active"))
        .first();

      if (!tenant) {
        return null;
      }

      const activeByName = new Map(
        tenant.modules.map((module) => [module.moduleName, module.active]),
      );

      return {
        tenantId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        active: tenant.active,
        vertical: tenant.vertical,
        modules: MODULES.map((moduleName) => ({
          moduleName,
          active: activeByName.get(moduleName) ?? false,
        })),
      };
    },

    /**
     * Crea o actualiza el estado de un módulo del tenant (upsert sobre la
     * clave única `[tenantId, moduleName]`).
     */
    toggleModule: (
      tenantId: string,
      moduleName: ModuleValue,
      active: boolean,
    ) =>
      db.orm.public.TenantModule.upsert({
        create: { tenantId, moduleName, active },
        update: { active },
        conflictOn: { tenantId, moduleName },
      }),

    /**
     * Feed de actividad real de la plataforma: une pagos, presupuestos,
     * clientes, membresías, usuarios, altas de negocios y auditoría.
     * Opcionalmente scoped a un tenant (drawer).
     */
    getActivityFeed: async (
      options: { limit?: number; tenantId?: string } = {},
    ): Promise<ActivityItem[]> => {
      const safeLimit = Math.min(50, Math.max(1, Math.trunc(options.limit ?? 12)));
      const perSource = Math.max(safeLimit, 10);
      const tenantId = options.tenantId;

      const [payments, quotes, customers, memberships, users, newTenants, audits] =
        await Promise.all([
          db.orm.public.Payment
            .where({})
            .where(tenantId ? { tenantId } : {})
            .select("id", "tenantId", "amount", "status", "createdAt")
            .orderBy((payment) => payment.createdAt.desc())
            .limit(perSource)
            .all(),
          db.orm.public.Quote
            .where({})
            .where(tenantId ? { tenantId } : {})
            .select(
              "id",
              "tenantId",
              "code",
              "title",
              "status",
              "totalAmount",
              "createdAt",
            )
            .orderBy((quote) => quote.createdAt.desc())
            .limit(perSource)
            .all(),
          db.orm.public.Customer
            .where({})
            .where(tenantId ? { tenantId } : {})
            .select("id", "tenantId", "name", "createdAt")
            .orderBy((customer) => customer.createdAt.desc())
            .limit(perSource)
            .all(),
          db.orm.public.Membership
            .where({})
            .where(tenantId ? { tenantId } : {})
            .select("id", "tenantId", "type", "createdAt")
            .orderBy((membership) => membership.createdAt.desc())
            .limit(perSource)
            .all(),
          db.orm.public.User
            .where({})
            .where(tenantId ? { tenantId } : {})
            .select("id", "tenantId", "name", "email", "role", "createdAt")
            .orderBy((user) => user.createdAt.desc())
            .limit(perSource)
            .all(),
          db.orm.public.Tenant
            .where({})
            .where(tenantId ? { id: tenantId } : {})
            .select("id", "name", "active", "createdAt")
            .orderBy((tenant) => tenant.createdAt.desc())
            .limit(perSource)
            .all(),
          db.orm.public.AuditLog
            .where({})
            .where(tenantId ? { targetTenantId: tenantId } : {})
            .select(
              "id",
              "action",
              "targetTenantId",
              "targetTenantName",
              "createdAt",
            )
            .orderBy((entry) => entry.createdAt.desc())
            .limit(perSource)
            .all(),
        ]);

      const tenantIds = new Set<string>();
      for (const row of payments) tenantIds.add(row.tenantId);
      for (const row of quotes) tenantIds.add(row.tenantId);
      for (const row of customers) tenantIds.add(row.tenantId);
      for (const row of memberships) tenantIds.add(row.tenantId);
      for (const row of users) tenantIds.add(row.tenantId);
      if (tenantId) tenantIds.add(tenantId);
      for (const row of newTenants) tenantIds.add(row.id);

      const nameById = new Map<string, string>();
      if (tenantIds.size > 0) {
        const tenantRows = await db.orm.public.Tenant
          .where((tenant) => tenant.id.in([...tenantIds]))
          .select("id", "name")
          .all();
        for (const row of tenantRows) {
          nameById.set(row.id, row.name);
        }
      }
      for (const row of newTenants) {
        nameById.set(row.id, row.name);
      }

      const items: ActivityItem[] = [];

      for (const row of payments) {
        const status = row.status;
        items.push({
          id: `payment:${row.id}`,
          kind:
            status === "APPROVED"
              ? "payment_approved"
              : status === "DECLINED"
                ? "payment_declined"
                : "payment_pending",
          title: `${formatCurrency(toNumber(row.amount))} · ${paymentStatusLabel(status)}`,
          description: "Pago registrado",
          tenantId: row.tenantId,
          tenantName: nameById.get(row.tenantId) ?? null,
          at: toJsDate(row.createdAt).toISOString(),
          atLabel: formatRelativeTime(row.createdAt),
        });
      }

      for (const row of quotes) {
        items.push({
          id: `quote:${row.id}`,
          kind: row.status === "APPROVED" ? "quote_approved" : "quote_created",
          title: `${row.code} · ${row.title}`,
          description: `${formatCurrency(toNumber(row.totalAmount))} · presupuesto`,
          tenantId: row.tenantId,
          tenantName: nameById.get(row.tenantId) ?? null,
          at: toJsDate(row.createdAt).toISOString(),
          atLabel: formatRelativeTime(row.createdAt),
        });
      }

      for (const row of customers) {
        items.push({
          id: `customer:${row.id}`,
          kind: "customer_created",
          title: row.name,
          description: "Cliente nuevo",
          tenantId: row.tenantId,
          tenantName: nameById.get(row.tenantId) ?? null,
          at: toJsDate(row.createdAt).toISOString(),
          atLabel: formatRelativeTime(row.createdAt),
        });
      }

      for (const row of memberships) {
        items.push({
          id: `membership:${row.id}`,
          kind: "membership_created",
          title: `Membresía ${row.type}`,
          description: "Membresía registrada",
          tenantId: row.tenantId,
          tenantName: nameById.get(row.tenantId) ?? null,
          at: toJsDate(row.createdAt).toISOString(),
          atLabel: formatRelativeTime(row.createdAt),
        });
      }

      for (const row of users) {
        items.push({
          id: `user:${row.id}`,
          kind: "user_created",
          title: row.name ?? row.email,
          description: `Usuario ${ROLE_LABELS[row.role]}`,
          tenantId: row.tenantId,
          tenantName: nameById.get(row.tenantId) ?? null,
          at: toJsDate(row.createdAt).toISOString(),
          atLabel: formatRelativeTime(row.createdAt),
        });
      }

      for (const row of newTenants) {
        items.push({
          id: `tenant:${row.id}`,
          kind: "tenant_created",
          title: row.name,
          description: "Negocio creado",
          tenantId: row.id,
          tenantName: row.name,
          at: toJsDate(row.createdAt).toISOString(),
          atLabel: formatRelativeTime(row.createdAt),
        });
      }

      for (const row of audits) {
        items.push({
          id: `audit:${row.id}`,
          kind: "audit",
          title: AUDIT_ACTION_LABELS[row.action] ?? row.action,
          description: row.targetTenantName ?? null,
          tenantId: row.targetTenantId ?? null,
          tenantName: row.targetTenantName ?? null,
          at: toJsDate(row.createdAt).toISOString(),
          atLabel: formatRelativeTime(row.createdAt),
        });
      }

      return items
        .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
        .slice(0, safeLimit);
    },

    /** Registra una acción del CEO en la bitácora de auditoría. */
    logAudit: async (input: AuditLogInput): Promise<void> => {
      await db.orm.public.AuditLog.create({
        actorId: input.actorId,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        targetTenantId: input.targetTenantId ?? null,
        targetTenantName: input.targetTenantName ?? null,
        metadata: (input.metadata ?? null) as never,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
    },

    /** Últimas entradas de la bitácora de auditoría (más recientes primero). */
    listAuditLogs: async (
      limit = 20,
      filter: { tenantId?: string; action?: string; actorEmail?: string; offset?: number } = {},
    ): Promise<AuditLogRow[]> => {
      const safeLimit = Math.min(200, Math.max(1, Math.trunc(limit)));
      let query = db.orm.public.AuditLog.where({});
      if (filter.tenantId) query = query.where({ targetTenantId: filter.tenantId });
      if (filter.action) query = query.where({ action: filter.action });
      if (filter.actorEmail) query = query.where({ actorEmail: filter.actorEmail });
      const rows = await query
        .orderBy((entry) => entry.createdAt.desc())
        .limit(safeLimit)
        .offset(Math.max(0, filter.offset ?? 0))
        .all();
      return rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        actorEmail: row.actorEmail ?? null,
        action: row.action,
        targetTenantId: row.targetTenantId ?? null,
        targetTenantName: row.targetTenantName ?? null,
        metadata: row.metadata ?? null,
        ipAddress: row.ipAddress ?? null,
        userAgent: row.userAgent ?? null,
        createdAt: toJsDate(row.createdAt).toISOString(),
      }));
    },
  };
}
