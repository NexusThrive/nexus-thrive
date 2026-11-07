-- 2026-11-07 · Entregables con aprobación del cliente. Aditivo e idempotente. Migración: migrations/app/20261107T0550_entregables
BEGIN;
CREATE TABLE IF NOT EXISTS "public"."Deliverable" (
  "clientComment" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "customerId" text,
  "decidedAt" timestamptz,
  "decidedByName" text,
  "description" text,
  "id" text NOT NULL,
  "projectId" text,
  "reviewTokenExpiresAt" timestamptz,
  "reviewTokenHash" text,
  "sentAt" timestamptz,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "taskId" text,
  "tenantId" text NOT NULL,
  "title" text NOT NULL,
  PRIMARY KEY ("id")
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Deliverable_reviewTokenHash_key') THEN
    ALTER TABLE "public"."Deliverable" ADD CONSTRAINT "Deliverable_reviewTokenHash_key" UNIQUE ("reviewTokenHash");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Deliverable_tenantId_fkey') THEN
    ALTER TABLE "public"."Deliverable" ADD CONSTRAINT "Deliverable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Deliverable_tenantId_idx_c93ed4f1" ON "public"."Deliverable" ("tenantId");
CREATE INDEX IF NOT EXISTS "Deliverable_tenantId_projectId_idx_e88197e4" ON "public"."Deliverable" ("tenantId", "projectId");
CREATE INDEX IF NOT EXISTS "Deliverable_tenantId_status_idx_d3d04256" ON "public"."Deliverable" ("tenantId", "status");
ALTER TABLE "public"."Deliverable" ENABLE ROW LEVEL SECURITY;
COMMIT;
