-- ============================================================================
-- PR-22-contabilidad-asientos · Contabilidad II: asientos y partida doble
-- PR-22 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Asientos generados por las reglas (o manuales con permiso), siempre cuadrados, con
-- trazabilidad al documento de origen. Un asiento publicado no se edita: se reversa.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."JournalEntry" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "number" int4 NOT NULL,
  "date" date NOT NULL,
  "periodId" text NOT NULL,
  "description" text NOT NULL,
  "sourceType" text,
  "sourceId" text,
  "status" text DEFAULT 'POSTED' NOT NULL,
  "reversalOfId" text,
  "actorType" text DEFAULT 'SYSTEM' NOT NULL,
  "createdById" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "JournalEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "JournalEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "public"."AccountingPeriod" ("id") ON DELETE RESTRICT,
  CONSTRAINT "JournalEntry_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "public"."JournalEntry" ("id") ON DELETE SET NULL,
  CONSTRAINT "JournalEntry_check_1" CHECK ("status" IN ('POSTED','REVERSED'))
);
CREATE INDEX IF NOT EXISTS "JournalEntry_tenantId_date_idx" ON "public"."JournalEntry" ("tenantId", "date");
CREATE INDEX IF NOT EXISTS "JournalEntry_sourceType_sourceId_idx" ON "public"."JournalEntry" ("sourceType", "sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "JournalEntry_tenantId_number_key" ON "public"."JournalEntry" ("tenantId", "number");
ALTER TABLE "public"."JournalEntry" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."JournalLine" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "entryId" text NOT NULL,
  "accountId" text NOT NULL,
  "partyId" text,
  "costCenterId" text,
  "debit" numeric DEFAULT 0 NOT NULL,
  "credit" numeric DEFAULT 0 NOT NULL,
  "description" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "JournalLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "JournalLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "public"."JournalEntry" ("id") ON DELETE CASCADE,
  CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account" ("id") ON DELETE RESTRICT,
  CONSTRAINT "JournalLine_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "public"."Party" ("id") ON DELETE SET NULL,
  CONSTRAINT "JournalLine_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "public"."CostCenter" ("id") ON DELETE SET NULL,
  CONSTRAINT "JournalLine_check_1" CHECK ("debit" >= 0 AND "credit" >= 0),
  CONSTRAINT "JournalLine_check_2" CHECK (("debit" = 0) <> ("credit" = 0))
);
CREATE INDEX IF NOT EXISTS "JournalLine_entryId_idx" ON "public"."JournalLine" ("entryId");
CREATE INDEX IF NOT EXISTS "JournalLine_tenantId_accountId_idx" ON "public"."JournalLine" ("tenantId", "accountId");
CREATE INDEX IF NOT EXISTS "JournalLine_tenantId_partyId_idx" ON "public"."JournalLine" ("tenantId", "partyId");
ALTER TABLE "public"."JournalLine" ENABLE ROW LEVEL SECURITY;

-- Partida doble garantizada por la base: al cerrar la transacción, débitos = créditos.
CREATE OR REPLACE FUNCTION "public"."check_journal_entry_balanced"() RETURNS trigger AS $$
DECLARE diff numeric;
BEGIN
  SELECT COALESCE(SUM("debit" - "credit"), 0) INTO diff FROM "public"."JournalLine" WHERE "entryId" = COALESCE(NEW."entryId", OLD."entryId");
  IF diff <> 0 THEN
    RAISE EXCEPTION 'El asiento % no cuadra (diferencia %)', COALESCE(NEW."entryId", OLD."entryId"), diff;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "JournalLine_balanced" ON "public"."JournalLine";
CREATE CONSTRAINT TRIGGER "JournalLine_balanced"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."JournalLine"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "public"."check_journal_entry_balanced"();

-- Reversar = crear otro asiento con las líneas invertidas y marcar el original REVERSED. Un período CLOSED rechaza asientos nuevos (validado en el servicio y con la fecha del asiento).

COMMIT;
