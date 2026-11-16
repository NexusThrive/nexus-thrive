-- ============================================================================
-- 2026-11-07 · Contacto único (etapa, origen, responsable, consentimiento, teléfono canónico)
--
-- Aditivo e idempotente. Migración de origen:
-- migrations/app/20261107T0121_contacto_unico
--
--  1. «Customer»: etapa (PROSPECT | CUSTOMER | RECURRING; los existentes son CUSTOMER), origen,
--     responsable, consentimiento y teléfono canónico («phoneNorm») con su índice.
--  2. «StoreOrder».«customerId»: la ficha del cliente que hizo el pedido.
--  3. Relleno: «phoneNorm» de los clientes que ya tienen teléfono, con la misma regla que el
--     código (57 + 10 dígitos para un móvil colombiano; el resto, solo los dígitos).
-- ============================================================================

BEGIN;

ALTER TABLE "public"."Customer" ADD COLUMN IF NOT EXISTS "consentAt" timestamptz;
ALTER TABLE "public"."Customer" ADD COLUMN IF NOT EXISTS "ownerId" text;
ALTER TABLE "public"."Customer" ADD COLUMN IF NOT EXISTS "phoneNorm" text;
ALTER TABLE "public"."Customer" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "public"."Customer" ADD COLUMN IF NOT EXISTS "stage" text NOT NULL DEFAULT 'CUSTOMER';
ALTER TABLE "public"."StoreOrder" ADD COLUMN IF NOT EXISTS "customerId" text;

CREATE INDEX IF NOT EXISTS "Customer_tenantId_phoneNorm_idx_8e50ed71" ON "public"."Customer" ("tenantId", "phoneNorm");

-- Relleno del teléfono canónico (idempotente: solo donde aún no está).
UPDATE "public"."Customer" c
SET "phoneNorm" = CASE
    WHEN d ~ '^57[0-9]{10}$' THEN d
    WHEN d ~ '^3[0-9]{9}$' THEN '57' || d
    WHEN d ~ '^03[0-9]{9}$' THEN '57' || substr(d, 2)
    WHEN d ~ '^0{1,2}57[0-9]{10}$' THEN regexp_replace(d, '^0{1,2}', '')
    ELSE d
  END
FROM (SELECT id, regexp_replace(coalesce(phone, ''), '\D', '', 'g') AS d FROM "public"."Customer") x
WHERE c.id = x.id AND c."phoneNorm" IS NULL AND x.d <> '';

COMMIT;
