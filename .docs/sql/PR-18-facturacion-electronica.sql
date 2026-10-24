-- ============================================================================
-- PR-18-facturacion-electronica · Facturación electrónica: documentos fiscales, intentos y eventos RADIAN
-- PR-18 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- EInvoiceDocument es el documento fiscal normalizado (snapshot de lo que se envía),
-- con su estado y el resultado del proveedor. EInvoiceAttempt guarda cada intento de
-- envío; EInvoiceEvent, los eventos RADIAN y otros que llegan del proveedor.
-- Sin proveedor, los documentos quedan en PENDING_PROVIDER y se envían al conectarlo.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."EInvoiceDocument" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "invoiceId" text NOT NULL,
  "docType" text NOT NULL,
  "fullNumber" text,
  "status" text DEFAULT 'PENDING_PROVIDER' NOT NULL,
  "providerKey" text,
  "providerRef" text,
  "cufe" text,
  "payload" jsonb NOT NULL,
  "xmlAttachmentId" text,
  "pdfAttachmentId" text,
  "qrData" text,
  "rejectionCode" text,
  "rejectionMessage" text,
  "submittedAt" timestamptz,
  "acceptedAt" timestamptz,
  "nextAttemptAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "EInvoiceDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "EInvoiceDocument_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice" ("id") ON DELETE RESTRICT,
  CONSTRAINT "EInvoiceDocument_check_1" CHECK ("docType" IN ('INVOICE','POS','CREDIT_NOTE','DEBIT_NOTE','SUPPORT_DOCUMENT')),
  CONSTRAINT "EInvoiceDocument_check_2" CHECK ("status" IN ('DRAFT','PENDING_PROVIDER','SUBMITTED','ACCEPTED','REJECTED','ERROR'))
);
CREATE INDEX IF NOT EXISTS "EInvoiceDocument_tenantId_status_nextAttemptAt_idx" ON "public"."EInvoiceDocument" ("tenantId", "status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "EInvoiceDocument_cufe_idx" ON "public"."EInvoiceDocument" ("cufe");
CREATE UNIQUE INDEX IF NOT EXISTS "EInvoiceDocument_tenantId_invoiceId_docType_key" ON "public"."EInvoiceDocument" ("tenantId", "invoiceId", "docType");
ALTER TABLE "public"."EInvoiceDocument" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."EInvoiceAttempt" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "documentId" text NOT NULL,
  "attempt" int4 NOT NULL,
  "status" text NOT NULL,
  "requestExcerpt" text,
  "responseExcerpt" text,
  "error" text,
  "durationMs" int4,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "EInvoiceAttempt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "EInvoiceAttempt_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."EInvoiceDocument" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "EInvoiceAttempt_documentId_attempt_key" ON "public"."EInvoiceAttempt" ("documentId", "attempt");
ALTER TABLE "public"."EInvoiceAttempt" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."EInvoiceEvent" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "documentId" text,
  "kind" text NOT NULL,
  "providerRef" text,
  "payload" jsonb NOT NULL,
  "receivedAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "EInvoiceEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "EInvoiceEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."EInvoiceDocument" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "EInvoiceEvent_tenantId_receivedAt_idx" ON "public"."EInvoiceEvent" ("tenantId", "receivedAt");
CREATE INDEX IF NOT EXISTS "EInvoiceEvent_documentId_idx" ON "public"."EInvoiceEvent" ("documentId");
ALTER TABLE "public"."EInvoiceEvent" ENABLE ROW LEVEL SECURITY;

-- Los XML y PDF se guardan como Attachment (ya existe). La numeración sale de DocumentSequence (PR-13) y se reserva al emitir. Retención de soportes: el plazo legal vigente (confirmar con el contador/DIAN).

COMMIT;
