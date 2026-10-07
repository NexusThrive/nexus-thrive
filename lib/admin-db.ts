import { or } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import { formatDateShort } from "@/lib/format";
import {
  MODULES,
  VERTICALS,
  sortModules,
  type ModuleValue,
  type VerticalValue,
} from "@/lib/admin-catalogs";

/**
 * Capa de datos GLOBAL de la plataforma (capa /admin).
 *
 * A diferencia de `lib/tenant-db.ts`, estas consultas NO están scoped a un
 * tenant: operan sobre todos los negocios. Se mantiene deliberadamente
 * separado para no romper el aislamiento conceptual Platform ↔ Tenant.
 */

export type PlatformMetrics = {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  totalUsers: number;
  /** Conteo de tenants por cada vertical del catálogo (incluye 0). */
  tenantsByVertical: { vertical: VerticalValue; count: number }[];
};

export type TenantListInput = {
  /** Host de la request actual: base para las URLs de acceso directo. */
  host: string;
  /** Texto libre contra name, slug o customDomain. */
  q?: string;
  vertical?: VerticalValue;
  activeStatus?: "active" | "inactive" | "all";
  page?: number;
  limit?: number;
};

/** Fila serializable de tenant (fechas → string, módulos activos). */
export type TenantListRow = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  vertical: VerticalValue;
  active: boolean;
  /** Fecha ya formateada en el servidor (hidratación estable). */
  createdAt: string;
  /** Módulos con `active: true`, en orden del catálogo. */
  modules: ModuleValue[];
  /** URL de acceso directo al negocio (calculada con el host actual). */
  url: string;
};

/** Detalle de módulos de un tenant (los 5 del catálogo con su estado). */
export type TenantModulesDetail = {
  tenantId: string;
  name: string;
  slug: string;
  active: boolean;
  modules: { moduleName: ModuleValue; active: boolean }[];
};

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

    /** Métricas globales de la plataforma (todas las queries en DB). */
    getPlatformMetrics: async (): Promise<PlatformMetrics> => {
      const count = async (filter?: {
        active?: boolean;
        vertical?: VerticalValue;
      }) => {
        let query = db.orm.public.Tenant.where({});
        if (filter?.active !== undefined) {
          query = query.where({ active: filter.active });
        }
        if (filter?.vertical) {
          query = query.where({ vertical: filter.vertical });
        }
        const { total } = await query.aggregate((aggregate) => ({
          total: aggregate.count(),
        }));
        return total;
      };

      const [totalTenants, activeTenants, inactiveTenants, totalUsers, byVertical] =
        await Promise.all([
          count(),
          count({ active: true }),
          count({ active: false }),
          db.orm.public.User.aggregate((aggregate) => ({
            total: aggregate.count(),
          })).then((result) => result.total),
          Promise.all(
            VERTICALS.map(async (vertical) => ({
              vertical,
              count: await count({ vertical }),
            })),
          ),
        ]);

      return {
        totalTenants,
        activeTenants,
        inactiveTenants,
        totalUsers,
        tenantsByVertical: byVertical,
      };
    },

    /**
     * Listado paginado de tenants con búsqueda (name/slug/customDomain),
     * filtro por vertical y estado. Todo se resuelve en servidor.
     */
    listTenants: async ({
      host,
      q,
      vertical,
      activeStatus = "all",
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

      const [rows, { total }] = await Promise.all([
        filtered
          .orderBy((tenant) => tenant.createdAt.desc())
          .include("modules", (module) => module.select("moduleName", "active"))
          .limit(safeLimit)
          .offset((safePage - 1) * safeLimit)
          .all(),
        filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
      ]);

      return {
        rows: rows.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          customDomain: row.customDomain ?? null,
          vertical: row.vertical,
          active: row.active,
          createdAt: formatDateShort(String(row.createdAt)),
          modules: sortModules(
            row.modules
              .filter((module) => module.active)
              .map((module) => module.moduleName),
          ),
          url: tenantAccessUrl(row.slug, host),
        })),
        total,
      };
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
    }) =>
      db.transaction(async (tx) => {
        const tenant = await tx.orm.public.Tenant.create({
          name: data.name,
          slug: data.slug,
          vertical: data.vertical,
        });

        for (const moduleName of data.modules) {
          await tx.orm.public.TenantModule.create({
            tenantId: tenant.id,
            moduleName,
          });
        }

        return tenant;
      }),

    /** Activa o suspende un tenant. Devuelve `null` si no existe. */
    setTenantActive: (id: string, active: boolean) =>
      db.orm.public.Tenant.where({ id }).update({ active }),

    /**
     * Detalle de módulos de un tenant: los 5 del catálogo con su estado
     * (los no registrados cuentan como inactivos).
     */
    getTenantModules: async (
      tenantId: string,
    ): Promise<TenantModulesDetail | null> => {
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
  };
}
