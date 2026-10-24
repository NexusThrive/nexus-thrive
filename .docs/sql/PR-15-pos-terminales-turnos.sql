-- ============================================================================
-- PR-15-pos-terminales-turnos · POS: terminales, turnos por cajero y ventas en espera
-- PR-15 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Terminal de venta (bodega y caja asociadas, configuración de impresora), turno por
-- cajero sobre la sesión de caja existente, y ventas en espera. La venta de varias
-- líneas usa el documento comercial (Invoice) sin tablas nuevas.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."PosTerminal" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "name" text NOT NULL,
  "code" text,
  "warehouseId" text,
  "cashBoxId" text,
  "printerConfig" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PosTerminal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "PosTerminal_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse" ("id") ON DELETE SET NULL,
  CONSTRAINT "PosTerminal_cashBoxId_fkey" FOREIGN KEY ("cashBoxId") REFERENCES "public"."CashBox" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "PosTerminal_tenantId_idx" ON "public"."PosTerminal" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "PosTerminal_tenantId_name_key" ON "public"."PosTerminal" ("tenantId", "name");
ALTER TABLE "public"."PosTerminal" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."PosHeldSale" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "terminalId" text NOT NULL,
  "cashierId" text NOT NULL,
  "label" text,
  "payload" jsonb NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PosHeldSale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "PosHeldSale_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "public"."PosTerminal" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "PosHeldSale_terminalId_createdAt_idx" ON "public"."PosHeldSale" ("terminalId", "createdAt");
ALTER TABLE "public"."PosHeldSale" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."CashSession" ADD COLUMN IF NOT EXISTS "terminalId" text;
ALTER TABLE "public"."CashSession" ADD COLUMN IF NOT EXISTS "cashierId" text;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "terminalId" text;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "cashSessionId" text;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "returnOfId" text;
CREATE INDEX IF NOT EXISTS "Invoice_terminalId_idx" ON "public"."Invoice" ("terminalId");
CREATE INDEX IF NOT EXISTS "Invoice_returnOfId_idx" ON "public"."Invoice" ("returnOfId");

-- Una devolución es una nota crédito (kind CREDIT_NOTE) con returnOfId = la venta; entra el stock con el costo original y se reversa el asiento.

COMMIT;
