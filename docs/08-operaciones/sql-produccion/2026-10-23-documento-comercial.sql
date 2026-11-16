-- ============================================================================
-- 2026-10-23 · Documento comercial unificado (Bloque B, paso 2)
--
-- Equivale a la migración migrations/app/20261023T1545_documento_comercial.
-- Aditivo e idempotente. Requiere los dos archivos anteriores del mismo día.
--
-- Qué hace:
--   "Invoice" pasa a ser el documento comercial de toda la cadena
--   (cotización, pedido, cuenta de cobro, recibo, venta al cobrar, nota
--   crédito): totales por concepto, enlace al documento de origen, al cobro y
--   a lo que lo originó. "InvoiceLine": descuento e impuesto por línea.
--   Rellena el subtotal de los documentos que ya existían (= total).
--
-- Correr en el SQL Editor de Supabase ANTES de desplegar la versión que lo trae.
-- ============================================================================

ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "subtotal" numeric DEFAULT 0 NOT NULL;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "discountTotal" numeric DEFAULT 0 NOT NULL;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "taxTotal" numeric DEFAULT 0 NOT NULL;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "sourceDocumentId" text;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "originType" text;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "originId" text;
ALTER TABLE "public"."Invoice" ADD COLUMN IF NOT EXISTS "paymentId" text;
ALTER TABLE "public"."InvoiceLine" ADD COLUMN IF NOT EXISTS "discountPct" numeric DEFAULT 0 NOT NULL;
ALTER TABLE "public"."InvoiceLine" ADD COLUMN IF NOT EXISTS "taxRatePct" numeric DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS "Invoice_sourceDocumentId_idx_bd8eb82f" ON "public"."Invoice" ("sourceDocumentId");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_issueDate_idx_33d250ce" ON "public"."Invoice" ("tenantId", "issueDate");

-- Documentos de antes: sin descuentos ni impuestos, su base es el total.
UPDATE "public"."Invoice" SET "subtotal" = "total"
 WHERE "subtotal" = 0 AND "discountTotal" = 0 AND "taxTotal" = 0 AND "total" <> 0;

-- Comprobación: debe devolver 0.
SELECT count(*) AS descuadrados FROM "public"."Invoice" WHERE "subtotal" - "discountTotal" + "taxTotal" <> "total";
