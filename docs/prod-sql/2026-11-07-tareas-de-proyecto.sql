-- 2026-11-07 · Tareas de proyecto (Task.projectId). Aditivo e idempotente. Migración: migrations/app/20261107T0537_tareas_de_proyecto
BEGIN;
ALTER TABLE "public"."Task" ADD COLUMN IF NOT EXISTS "projectId" text;
CREATE INDEX IF NOT EXISTS "Task_tenantId_projectId_status_idx_68cd0149" ON "public"."Task" ("tenantId", "projectId", "status");
COMMIT;
