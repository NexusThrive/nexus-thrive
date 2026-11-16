-- ============================================================================
-- 2026-10-23 · Restricciones del negocio y RLS (DATA-04, SEC-07, DATA-02)
--
-- Equivale a la migración migrations/app/20261023T0552_restricciones_negocio_y_rls
-- (mismos nombres de llaves e índices). Idempotente: se puede correr dos veces.
--
-- Qué hace:
--   1. Borra filas huérfanas (tenantId que ya no existe) en las 22 tablas que
--      no tenían llave foránea a "Tenant", y les crea esa llave (ON DELETE CASCADE).
--   2. Índices por tenantId donde faltaban.
--   3. Código de acceso y tarjeta NFC únicos por negocio. Si hay repetidos,
--      se conserva el del socio más antiguo y a los demás se les quita.
--   4. Activa RLS en todas las tablas, SIN políticas: cierra la API REST de
--      Supabase (anon/authenticated). La app entra con el rol dueño de las
--      tablas, que no está sujeto a RLS, así que no cambia nada para ella.
--   5. Quita la columna JSON "Membership"."payments" (el historial vive en
--      "Payment" desde DATA-02).
--
-- Correr en el SQL Editor de Supabase ANTES de desplegar la versión que lo trae.
-- ============================================================================

BEGIN;

-- 1. Huérfanos y llaves foráneas a "Tenant"

DELETE FROM "public"."Attachment" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attachment_tenantId_fkey') THEN
    ALTER TABLE "public"."Attachment"
    ADD CONSTRAINT "Attachment_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."Attendance" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Attendance_tenantId_fkey') THEN
    ALTER TABLE "public"."Attendance"
    ADD CONSTRAINT "Attendance_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."BenefitRedemption" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BenefitRedemption_tenantId_fkey') THEN
    ALTER TABLE "public"."BenefitRedemption"
    ADD CONSTRAINT "BenefitRedemption_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."Booking" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_tenantId_fkey') THEN
    ALTER TABLE "public"."Booking"
    ADD CONSTRAINT "Booking_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."CashBox" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CashBox_tenantId_fkey') THEN
    ALTER TABLE "public"."CashBox"
    ADD CONSTRAINT "CashBox_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."CashMovement" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CashMovement_tenantId_fkey') THEN
    ALTER TABLE "public"."CashMovement"
    ADD CONSTRAINT "CashMovement_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."CashSession" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CashSession_tenantId_fkey') THEN
    ALTER TABLE "public"."CashSession"
    ADD CONSTRAINT "CashSession_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."Charge" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Charge_tenantId_fkey') THEN
    ALTER TABLE "public"."Charge"
    ADD CONSTRAINT "Charge_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."Departure" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Departure_tenantId_fkey') THEN
    ALTER TABLE "public"."Departure"
    ADD CONSTRAINT "Departure_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."InboxConversation" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxConversation_tenantId_fkey') THEN
    ALTER TABLE "public"."InboxConversation"
    ADD CONSTRAINT "InboxConversation_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."Invoice" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_tenantId_fkey') THEN
    ALTER TABLE "public"."Invoice"
    ADD CONSTRAINT "Invoice_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."Lead" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lead_tenantId_fkey') THEN
    ALTER TABLE "public"."Lead"
    ADD CONSTRAINT "Lead_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."PresenceRequest" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PresenceRequest_tenantId_fkey') THEN
    ALTER TABLE "public"."PresenceRequest"
    ADD CONSTRAINT "PresenceRequest_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."Product" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_tenantId_fkey') THEN
    ALTER TABLE "public"."Product"
    ADD CONSTRAINT "Product_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."SatisfactionSurvey" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SatisfactionSurvey_tenantId_fkey') THEN
    ALTER TABLE "public"."SatisfactionSurvey"
    ADD CONSTRAINT "SatisfactionSurvey_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."StockMovement" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockMovement_tenantId_fkey') THEN
    ALTER TABLE "public"."StockMovement"
    ADD CONSTRAINT "StockMovement_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."Subscription" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_tenantId_fkey') THEN
    ALTER TABLE "public"."Subscription"
    ADD CONSTRAINT "Subscription_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."SupportTicket" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupportTicket_tenantId_fkey') THEN
    ALTER TABLE "public"."SupportTicket"
    ADD CONSTRAINT "SupportTicket_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."TenantContact" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantContact_tenantId_fkey') THEN
    ALTER TABLE "public"."TenantContact"
    ADD CONSTRAINT "TenantContact_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."TenantInvite" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TenantInvite_tenantId_fkey') THEN
    ALTER TABLE "public"."TenantInvite"
    ADD CONSTRAINT "TenantInvite_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."TicketSale" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TicketSale_tenantId_fkey') THEN
    ALTER TABLE "public"."TicketSale"
    ADD CONSTRAINT "TicketSale_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM "public"."TourBooking" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "public"."Tenant");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TourBooking_tenantId_fkey') THEN
    ALTER TABLE "public"."TourBooking"
    ADD CONSTRAINT "TourBooking_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "public"."Tenant" ("id")
    ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Repetidos antes de los índices únicos
UPDATE "public"."Customer" SET "accessCode" = NULL
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (PARTITION BY "tenantId", "accessCode" ORDER BY "createdAt", "id") AS n
    FROM "public"."Customer" WHERE "accessCode" IS NOT NULL
  ) dup WHERE dup.n > 1
);
UPDATE "public"."Customer" SET "nfcUid" = NULL
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (PARTITION BY "tenantId", "nfcUid" ORDER BY "createdAt", "id") AS n
    FROM "public"."Customer" WHERE "nfcUid" IS NOT NULL
  ) dup WHERE dup.n > 1
);

-- 2 y 3. Índices
CREATE INDEX IF NOT EXISTS "Attachment_tenantId_idx_c93ed4f1" ON "public"."Attachment" ("tenantId");
CREATE INDEX IF NOT EXISTS "Attendance_tenantId_idx_c93ed4f1" ON "public"."Attendance" ("tenantId");
CREATE INDEX IF NOT EXISTS "CashMovement_tenantId_idx_c93ed4f1" ON "public"."CashMovement" ("tenantId");
CREATE INDEX IF NOT EXISTS "CashSession_tenantId_idx_c93ed4f1" ON "public"."CashSession" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_tenantId_accessCode_key_ef9862d0" ON "public"."Customer" ("tenantId", "accessCode") WHERE ("accessCode" IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_tenantId_nfcUid_key_4a0896f1" ON "public"."Customer" ("tenantId", "nfcUid") WHERE ("nfcUid" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "Departure_tenantId_idx_c93ed4f1" ON "public"."Departure" ("tenantId");
CREATE INDEX IF NOT EXISTS "Lead_tenantId_idx_c93ed4f1" ON "public"."Lead" ("tenantId");
CREATE INDEX IF NOT EXISTS "Product_tenantId_idx_c93ed4f1" ON "public"."Product" ("tenantId");
CREATE INDEX IF NOT EXISTS "StockMovement_tenantId_idx_c93ed4f1" ON "public"."StockMovement" ("tenantId");
CREATE INDEX IF NOT EXISTS "TicketSale_tenantId_idx_c93ed4f1" ON "public"."TicketSale" ("tenantId");
CREATE INDEX IF NOT EXISTS "TourBooking_tenantId_idx_c93ed4f1" ON "public"."TourBooking" ("tenantId");

-- 4. RLS sin políticas en todas las tablas
ALTER TABLE "public"."ApuActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ApuActivityComposition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ApuChapter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ApuImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ApuImportRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ApuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ApuItemPriceHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BenefitCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BenefitRedemption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BillingPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BudgetBaseline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BudgetChapter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BudgetItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BudgetItemProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BudgetItemResource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BudgetLockEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CashBox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CashMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CashSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Charge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ChargeEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CustomerNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CustomerTierSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Departure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."DismissedNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FieldLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FieldLogEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InboxConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InboxMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InvoiceLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LeadActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LookaheadTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ModuleSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PlanSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PresenceRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PresenceScan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProjectBudget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProjectFollowUp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProjectHeader" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProjectPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."QuoteItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SatisfactionSurvey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StaffInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StaffMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StaffRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TenantContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TenantInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TenantModule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TicketMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TicketSale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TourBooking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."VerticalSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WeeklyCommitment" ENABLE ROW LEVEL SECURITY;

-- 5. Columna JSON retirada
ALTER TABLE "public"."Membership" DROP COLUMN IF EXISTS "payments";

COMMIT;

-- Comprobación (debe dar 0 y 51):
-- SELECT count(*) FILTER (WHERE NOT rowsecurity) FROM pg_tables WHERE schemaname = 'public';
-- SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND confrelid = '"public"."Tenant"'::regclass;
