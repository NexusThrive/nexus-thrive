-- ============================================================================
-- PR-24-presencia-v2 · Presencia v2: pilares, fases y tendencia
-- PR-24 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- PresenceSnapshot guarda cada cálculo con el detalle por pilar y señal (no solo el total)
-- y la fase. TenantPresenceState es el estado vigente (caché) que lee la barra del tablero:
-- fase A (visibilidad) y fase B (madurez), y desde cuándo se sostiene.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."PresenceSnapshot" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "phase" text NOT NULL,
  "score" int4 NOT NULL,
  "state" text NOT NULL,
  "pillars" jsonb NOT NULL,
  "signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "source" text DEFAULT 'AUTO' NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PresenceSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "PresenceSnapshot_check_1" CHECK ("score" BETWEEN 0 AND 100),
  CONSTRAINT "PresenceSnapshot_check_2" CHECK ("phase" IN ('VISIBILITY','MATURITY'))
);
CREATE INDEX IF NOT EXISTS "PresenceSnapshot_tenantId_phase_createdAt_idx" ON "public"."PresenceSnapshot" ("tenantId", "phase", "createdAt");
ALTER TABLE "public"."PresenceSnapshot" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."TenantPresenceState" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "phase" text DEFAULT 'VISIBILITY' NOT NULL,
  "visibilityScore" int4 DEFAULT 0 NOT NULL,
  "maturityScore" int4,
  "phaseReachedAt" timestamptz,
  "sustainedSince" timestamptz,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "TenantPresenceState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "TenantPresenceState_check_1" CHECK ("phase" IN ('VISIBILITY','MATURITY'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantPresenceState_tenantId_key" ON "public"."TenantPresenceState" ("tenantId");
ALTER TABLE "public"."TenantPresenceState" ENABLE ROW LEVEL SECURITY;

-- Pasa a MATURITY cuando visibilityScore ≥ 85, los pilares críticos (sitio, catálogo, pago en línea) están verificados y se sostiene 14 días (sustainedSince). Vuelve a VISIBILITY si cae por debajo de 70 (histéresis). Umbrales a calibrar. PresenceScan (existente) sigue guardando los sondeos del sitio.

COMMIT;
