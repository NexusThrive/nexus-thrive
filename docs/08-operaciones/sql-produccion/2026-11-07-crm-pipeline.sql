-- 2026-11-07 · Pipeline del CRM: etapas, motivos de pérdida, etiquetas, equipos, historial de la oportunidad y actividades.
-- Aditivo e idempotente. Migración: migrations/app/20261107T2342_crm_pipeline
BEGIN;
CREATE TABLE IF NOT EXISTS "public"."CrmLostReason" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "position" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "public"."CrmStage" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "isWon" bool DEFAULT false NOT NULL,
  "name" text NOT NULL,
  "position" int4 NOT NULL,
  "probability" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "public"."CrmTag" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "public"."CrmTeam" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "memberIds" text[] DEFAULT '{}' NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "CrmTeam_memberIds_elem_not_null_2683b194" CHECK (array_position("memberIds", NULL) IS NULL)
);
CREATE TABLE IF NOT EXISTS "public"."OpportunityEvent" (
  "authorId" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "data" json,
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "opportunityId" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);
ALTER TABLE "public"."Opportunity" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."Opportunity" ADD COLUMN IF NOT EXISTS "expectedClose" text;
ALTER TABLE "public"."Opportunity" ADD COLUMN IF NOT EXISTS "position" float8;
ALTER TABLE "public"."Opportunity" ADD COLUMN IF NOT EXISTS "priority" int4 DEFAULT 0 NOT NULL;
ALTER TABLE "public"."Opportunity" ADD COLUMN IF NOT EXISTS "probability" int4;
ALTER TABLE "public"."Opportunity" ADD COLUMN IF NOT EXISTS "stageId" text;
ALTER TABLE "public"."Opportunity" ADD COLUMN IF NOT EXISTS "stageSince" timestamptz;
ALTER TABLE "public"."Opportunity" ADD COLUMN IF NOT EXISTS "tags" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "public"."Opportunity" ADD COLUMN IF NOT EXISTS "teamId" text;
ALTER TABLE "public"."Task" ADD COLUMN IF NOT EXISTS "dueAt" timestamptz;
ALTER TABLE "public"."Task" ADD COLUMN IF NOT EXISTS "kind" text;
DO $$ BEGIN
  ALTER TABLE "public"."CrmTag" ADD CONSTRAINT "CrmTag_tenantId_name_key" UNIQUE ("tenantId", "name");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_tags_elem_not_null_aecbe9e2" CHECK (array_position("tags", NULL) IS NULL);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "CrmLostReason_tenantId_idx_c93ed4f1" ON "public"."CrmLostReason" ("tenantId");
CREATE INDEX IF NOT EXISTS "CrmStage_tenantId_idx_c93ed4f1" ON "public"."CrmStage" ("tenantId");
CREATE INDEX IF NOT EXISTS "CrmStage_tenantId_position_idx_2c85c5ec" ON "public"."CrmStage" ("tenantId", "position");
CREATE INDEX IF NOT EXISTS "CrmTag_tenantId_idx_c93ed4f1" ON "public"."CrmTag" ("tenantId");
CREATE INDEX IF NOT EXISTS "CrmTeam_tenantId_idx_c93ed4f1" ON "public"."CrmTeam" ("tenantId");
CREATE INDEX IF NOT EXISTS "OpportunityEvent_tenantId_idx_c93ed4f1" ON "public"."OpportunityEvent" ("tenantId");
CREATE INDEX IF NOT EXISTS "OpportunityEvent_tenantId_opportunityId_createdAt_idx_ba6e9aa1" ON "public"."OpportunityEvent" ("tenantId", "opportunityId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "public"."CrmLostReason"
ADD CONSTRAINT "CrmLostReason_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "public"."CrmStage"
ADD CONSTRAINT "CrmStage_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "public"."CrmTag"
ADD CONSTRAINT "CrmTag_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "public"."CrmTeam"
ADD CONSTRAINT "CrmTeam_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "public"."OpportunityEvent"
ADD CONSTRAINT "OpportunityEvent_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
ALTER TABLE "public"."CrmLostReason" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CrmStage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CrmTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CrmTeam" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OpportunityEvent" ENABLE ROW LEVEL SECURITY;
COMMIT;
-- Migración: migrations/app/20261107T2346_oportunidad_cliente_opcional (la creación rápida solo exige el nombre, como en Odoo).
ALTER TABLE "public"."Opportunity" ALTER COLUMN "customerId" DROP NOT NULL;
