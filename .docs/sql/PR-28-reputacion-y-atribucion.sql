-- ============================================================================
-- PR-28-reputacion-y-atribucion · Reputación y atribución
-- PR-28 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Encuestas tras la compra, reseñas (propias y de Google) y atribución de ventas por
-- enlace corto, QR o campaña.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."SurveyResponse" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "partyId" text,
  "invoiceId" text,
  "channel" text NOT NULL,
  "score" int4,
  "comment" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "SurveyResponse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "SurveyResponse_check_1" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 10)
);
CREATE INDEX IF NOT EXISTS "SurveyResponse_tenantId_createdAt_idx" ON "public"."SurveyResponse" ("tenantId", "createdAt");
ALTER TABLE "public"."SurveyResponse" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."Review" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "source" text NOT NULL,
  "externalId" text,
  "rating" int4 NOT NULL,
  "author" text,
  "body" text,
  "reply" text,
  "repliedAt" timestamptz,
  "publishedAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Review_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "Review_check_1" CHECK ("rating" BETWEEN 1 AND 5)
);
CREATE INDEX IF NOT EXISTS "Review_tenantId_publishedAt_idx" ON "public"."Review" ("tenantId", "publishedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Review_ext_key" ON "public"."Review" ("tenantId", "source", "externalId") WHERE "externalId" IS NOT NULL;
ALTER TABLE "public"."Review" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."ShortLink" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "code" text NOT NULL,
  "targetUrl" text NOT NULL,
  "campaign" text,
  "source" text,
  "clicks" int4 DEFAULT 0 NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "ShortLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ShortLink_tenantId_idx" ON "public"."ShortLink" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "ShortLink_code_key" ON "public"."ShortLink" ("code");
ALTER TABLE "public"."ShortLink" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."AttributionTouch" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "sessionToken" text NOT NULL,
  "source" text,
  "medium" text,
  "campaign" text,
  "shortLinkId" text,
  "cartId" text,
  "invoiceId" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "AttributionTouch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "AttributionTouch_shortLinkId_fkey" FOREIGN KEY ("shortLinkId") REFERENCES "public"."ShortLink" ("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "AttributionTouch_tenantId_createdAt_idx" ON "public"."AttributionTouch" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AttributionTouch_invoiceId_idx" ON "public"."AttributionTouch" ("invoiceId");
ALTER TABLE "public"."AttributionTouch" ENABLE ROW LEVEL SECURITY;

-- La atribución guarda solo lo necesario (sin datos personales); la venta se enlaza por el pedido. Consentimiento y retención según X.03.

COMMIT;
