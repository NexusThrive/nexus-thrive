-- Fase B · Operations Center: catálogo de planes, módulos, rubros y tramos de clientes.
-- Aditivo. Producción no tiene el registro de migraciones de Prisma (prisma_contract):
-- se aplica con psql -1 (una transacción) o en el SQL Editor de Supabase.
-- Generado con `prisma db update --dry-run` contra una copia del esquema de producción
-- (con la fase A ya aplicada). Se omiten los "DISABLE ROW LEVEL SECURITY": RLS sigue activo.
-- Las filas del catálogo se crean solas al abrir el onboarding o Planes y módulos.

CREATE TABLE "public"."CustomerTierSetting" (
  "id" text NOT NULL,
  "label" text NOT NULL,
  "maxCustomers" int4,
  "order" int4 NOT NULL,
  "priceUsdCents" int4 NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."ModuleSetting" (
  "description" text NOT NULL,
  "included" bool NOT NULL,
  "label" text NOT NULL,
  "module" text NOT NULL,
  "order" int4 NOT NULL,
  "priceUsdCents" int4 NOT NULL,
  "status" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("module")
);

CREATE TABLE "public"."PlanSetting" (
  "active" bool DEFAULT true NOT NULL,
  "annualDiscountPct" int4 NOT NULL,
  "basePriceUsdCents" int4 NOT NULL,
  "chargesModules" bool NOT NULL,
  "features" text[] NOT NULL,
  "includesAllModules" bool NOT NULL,
  "key" text NOT NULL,
  "moduleDiscountPct" int4 NOT NULL,
  "name" text NOT NULL,
  "order" int4 NOT NULL,
  "recommended" bool DEFAULT false NOT NULL,
  "tagline" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("key"),
  CONSTRAINT "PlanSetting_features_elem_not_null_1a661718" CHECK (array_position("features", NULL) IS NULL)
);

CREATE TABLE "public"."VerticalSetting" (
  "dashboardTemplate" text,
  "label" text NOT NULL,
  "modules" text[] NOT NULL,
  "order" int4 NOT NULL,
  "priceFactorPct" int4 NOT NULL,
  "recommended" text[] NOT NULL,
  "signupEnabled" bool NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "vertical" text NOT NULL,
  PRIMARY KEY ("vertical"),
  CONSTRAINT "VerticalSetting_modules_elem_not_null_749d77ec" CHECK (array_position("modules", NULL) IS NULL),
  CONSTRAINT "VerticalSetting_recommended_elem_not_null_226dce52" CHECK (array_position("recommended", NULL) IS NULL)
);

ALTER TABLE "public"."Tenant" ADD COLUMN "contractedModules" text[];

ALTER TABLE "public"."Tenant" ADD COLUMN "customerTierId" text;

ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_contractedModules_elem_not_null_6b619961" CHECK (array_position("contractedModules", NULL) IS NULL);

-- Las tablas nuevas quedan con RLS activo, como el resto (el servidor usa el rol propietario).
ALTER TABLE "public"."CustomerTierSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ModuleSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PlanSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."VerticalSetting" ENABLE ROW LEVEL SECURITY;
