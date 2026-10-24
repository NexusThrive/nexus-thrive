-- ============================================================================
-- PR-14-cartera · Cartera: cuentas por cobrar y por pagar con abonos
-- PR-14 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Receivable nace de un documento comercial a crédito; PaymentApplication aplica pagos
-- (parciales o totales) a una o varias cuentas; Payable hace lo mismo para facturas de
-- proveedores. CollectionReminder deja rastro de cada recordatorio enviado.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."Receivable" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "partyId" text,
  "customerId" text,
  "invoiceId" text NOT NULL,
  "amount" numeric NOT NULL,
  "balance" numeric NOT NULL,
  "dueDate" date NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Receivable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "Receivable_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice" ("id") ON DELETE CASCADE,
  CONSTRAINT "Receivable_check_1" CHECK ("balance" >= 0 AND "balance" <= "amount"),
  CONSTRAINT "Receivable_check_2" CHECK ("status" IN ('OPEN','PARTIAL','PAID','VOID'))
);
CREATE INDEX IF NOT EXISTS "Receivable_tenantId_status_dueDate_idx" ON "public"."Receivable" ("tenantId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "Receivable_tenantId_partyId_idx" ON "public"."Receivable" ("tenantId", "partyId");
CREATE UNIQUE INDEX IF NOT EXISTS "Receivable_invoiceId_key" ON "public"."Receivable" ("invoiceId");
ALTER TABLE "public"."Receivable" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."PaymentApplication" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "receivableId" text NOT NULL,
  "paymentId" text NOT NULL,
  "amount" numeric NOT NULL,
  "appliedAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "PaymentApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentApplication_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "public"."Receivable" ("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentApplication_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment" ("id") ON DELETE RESTRICT,
  CONSTRAINT "PaymentApplication_check_1" CHECK ("amount" > 0)
);
CREATE INDEX IF NOT EXISTS "PaymentApplication_receivableId_idx" ON "public"."PaymentApplication" ("receivableId");
CREATE INDEX IF NOT EXISTS "PaymentApplication_paymentId_idx" ON "public"."PaymentApplication" ("paymentId");
ALTER TABLE "public"."PaymentApplication" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."Payable" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "supplierPartyId" text NOT NULL,
  "supplierInvoiceId" text NOT NULL,
  "amount" numeric NOT NULL,
  "balance" numeric NOT NULL,
  "dueDate" date NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Payable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "Payable_supplierPartyId_fkey" FOREIGN KEY ("supplierPartyId") REFERENCES "public"."Party" ("id") ON DELETE RESTRICT,
  CONSTRAINT "Payable_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "public"."SupplierInvoice" ("id") ON DELETE CASCADE,
  CONSTRAINT "Payable_check_1" CHECK ("balance" >= 0 AND "balance" <= "amount")
);
CREATE INDEX IF NOT EXISTS "Payable_tenantId_status_dueDate_idx" ON "public"."Payable" ("tenantId", "status", "dueDate");
CREATE UNIQUE INDEX IF NOT EXISTS "Payable_supplierInvoiceId_key" ON "public"."Payable" ("supplierInvoiceId");
ALTER TABLE "public"."Payable" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."CollectionReminder" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "receivableId" text NOT NULL,
  "channel" text NOT NULL,
  "status" text DEFAULT 'SENT' NOT NULL,
  "sentAt" timestamptz DEFAULT (now()) NOT NULL,
  "sentById" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "CollectionReminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "CollectionReminder_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "public"."Receivable" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "CollectionReminder_receivableId_sentAt_idx" ON "public"."CollectionReminder" ("receivableId", "sentAt");
ALTER TABLE "public"."CollectionReminder" ENABLE ROW LEVEL SECURITY;

-- Regla: aplicar un pago y bajar el saldo ocurren en UNA transacción dentro de money-service (nunca el saldo se edita a mano). Un trigger de aplicación no es necesario: el servicio bloquea la fila de Receivable.

COMMIT;
