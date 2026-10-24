-- ============================================================================
-- PR-26-tienda-carrito-y-envios · Tienda en línea: carrito y envíos
-- PR-26 de .docs/hoja-de-ruta-implementacion.md
--
-- BORRADOR DE DISEÑO PARA REVISAR, no para correr. La migración real sale de
-- editar prisma/contract.prisma y ejecutar `prisma migration plan` (ver la
-- hoja de ruta, «Cómo se migra»). Este archivo fija las tablas, las columnas, las
-- llaves y los índices que esa edición debe producir. Aditivo e idempotente.
--
-- Carrito anónimo por token (sin cuenta), líneas con precio e impuesto congelados y tarifas
-- de envío. El PEDIDO es un documento comercial (Invoice kind ORDER, originType STORE) y el
-- cobro usa PaymentIntent (PR-17).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."Cart" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "storefrontId" text NOT NULL,
  "token" text NOT NULL,
  "partyId" text,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "currency" text DEFAULT 'COP' NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Cart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "Cart_storefrontId_fkey" FOREIGN KEY ("storefrontId") REFERENCES "public"."Storefront" ("id") ON DELETE CASCADE,
  CONSTRAINT "Cart_check_1" CHECK ("status" IN ('OPEN','CHECKED_OUT','ABANDONED'))
);
CREATE INDEX IF NOT EXISTS "Cart_tenantId_status_expiresAt_idx" ON "public"."Cart" ("tenantId", "status", "expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Cart_token_key" ON "public"."Cart" ("token");
ALTER TABLE "public"."Cart" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."CartLine" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "cartId" text NOT NULL,
  "productId" text NOT NULL,
  "variantId" text,
  "quantity" numeric NOT NULL,
  "unitPrice" numeric NOT NULL,
  "taxRatePct" numeric DEFAULT 0 NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "CartLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "CartLine_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart" ("id") ON DELETE CASCADE,
  CONSTRAINT "CartLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product" ("id") ON DELETE CASCADE,
  CONSTRAINT "CartLine_check_1" CHECK ("quantity" > 0)
);
CREATE INDEX IF NOT EXISTS "CartLine_cartId_idx" ON "public"."CartLine" ("cartId");
ALTER TABLE "public"."CartLine" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."ShippingRate" (
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "name" text NOT NULL,
  "zone" text,
  "price" numeric NOT NULL,
  "freeOver" numeric,
  "active" bool DEFAULT true NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "ShippingRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ShippingRate_tenantId_active_idx" ON "public"."ShippingRate" ("tenantId", "active");
ALTER TABLE "public"."ShippingRate" ENABLE ROW LEVEL SECURITY;

-- Al hacer checkout se reserva stock (StockLevel.reserved) con vencimiento; si el pago no se confirma, la reserva se libera. Carritos abandonados: evento cart.abandoned para n8n.

COMMIT;
