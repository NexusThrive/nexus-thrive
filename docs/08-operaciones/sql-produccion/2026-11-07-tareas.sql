-- ============================================================================
-- 2026-11-07 · Tareas con fecha y responsable
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0151_tareas
--
--  1. «Task»: un paso concreto con fecha y responsable, ligado a un contacto o a una
--     oportunidad. Es el único modelo de tareas de Business.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."Task" (
  "assigneeId" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "customerId" text,
  "doneAt" timestamptz,
  "doneById" text,
  "dueDay" text,
  "id" text NOT NULL,
  "notes" text,
  "opportunityId" text,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "tenantId" text NOT NULL,
  "title" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Task_tenantId_assigneeId_status_idx_580462e1" ON "public"."Task" ("tenantId", "assigneeId", "status");
CREATE INDEX IF NOT EXISTS "Task_tenantId_customerId_idx_302ad259" ON "public"."Task" ("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "Task_tenantId_idx_c93ed4f1" ON "public"."Task" ("tenantId");
CREATE INDEX IF NOT EXISTS "Task_tenantId_status_dueDay_idx_d302ca36" ON "public"."Task" ("tenantId", "status", "dueDay");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_tenantId_fkey') THEN
    ALTER TABLE "public"."Task"
    ADD CONSTRAINT "Task_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."Task" ENABLE ROW LEVEL SECURITY;

COMMIT;
