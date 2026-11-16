-- ============================================================================
-- 2026-11-07 · Aplicación de pagos (un pago puede cubrir varias obligaciones)
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0014_aplicacion_de_pagos
--
--  1. «PaymentAllocation»: reparte un pago entre lo que cubre (cuenta de cobro, pedido,
--     membresía). El dinero se mueve una sola vez en «Payment».
--  2. Los pagos aprobados que ya pagaban una cuenta de cobro migran como UNA aplicación
--     cada uno. «Payment».«invoiceId» se conserva (los reportes siguen leyéndolo).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."PaymentAllocation" (
  "amount" numeric NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "paymentId" text NOT NULL,
  "targetId" text NOT NULL,
  "targetType" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentAllocation_tenantId_idx_c93ed4f1" ON "public"."PaymentAllocation" ("tenantId");
CREATE INDEX IF NOT EXISTS "PaymentAllocation_tenantId_paymentId_idx_5dee2bd2" ON "public"."PaymentAllocation" ("tenantId", "paymentId");
CREATE INDEX IF NOT EXISTS "PaymentAllocation_tenantId_targetType_targetId_idx_aa5024a9" ON "public"."PaymentAllocation" ("tenantId", "targetType", "targetId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentAllocation_tenantId_fkey') THEN
    ALTER TABLE "public"."PaymentAllocation"
    ADD CONSTRAINT "PaymentAllocation_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "public"."PaymentAllocation" ENABLE ROW LEVEL SECURITY;

-- Migración de lo existente: cada pago aprobado de una cuenta de cobro, una aplicación por el monto completo.
INSERT INTO "public"."PaymentAllocation" ("id", "tenantId", "paymentId", "targetType", "targetId", "amount", "createdAt")
SELECT gen_random_uuid()::text, p."tenantId", p."id", 'INVOICE', p."invoiceId", p."amount", p."createdAt"
FROM "public"."Payment" p
WHERE p."invoiceId" IS NOT NULL
  AND p."status" = 'APPROVED'
  AND NOT EXISTS (SELECT 1 FROM "public"."PaymentAllocation" a WHERE a."paymentId" = p."id");

COMMIT;
