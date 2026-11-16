-- V1 "Negocio completo" (Finanzas, Clientes/Equipo, Agenda, Rubros, Taquilla y Presencia Thrive)
-- en UNA transacción.
-- Ejecutar en el SQL Editor de Supabase ANTES de publicar el código en main.
-- Parte del esquema de ops-center (A → E) ya aplicado.
-- Aditivo salvo los DROP de constraints/checks reemplazados y de la tabla WebsiteRequest
-- (creada y luego reemplazada por PresenceRequest en la misma transacción).
-- Se omiten los "DISABLE ROW LEVEL SECURITY": RLS sigue activo en las tablas nuevas.
BEGIN;

-- ===================== v1 Finanzas (caja, facturación, inventario) =====================

CREATE TABLE "public"."Attachment" (
  "byteSize" int4 NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "data" bytea NOT NULL,
  "fileName" text NOT NULL,
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "mimeType" text NOT NULL,
  "ownerId" text NOT NULL,
  "sha256" text NOT NULL,
  "tenantId" text NOT NULL,
  "uploadedById" text,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."CashBox" (
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "fundAmount" numeric DEFAULT '0'::numeric NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "responsibleUserId" text,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."CashMovement" (
  "amount" numeric NOT NULL,
  "beneficiary" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "description" text NOT NULL,
  "expenseId" text,
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "paymentId" text,
  "sessionId" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "CashMovement_kind_check_a2f7cbee" CHECK ("kind" IN ('OPENING', 'INCOME', 'EXPENSE', 'VOUCHER', 'REPLENISH', 'ADJUST'))
);

CREATE TABLE "public"."CashSession" (
  "boxId" text NOT NULL,
  "closedAt" timestamptz,
  "closedById" text,
  "closingNotes" text,
  "countedAmount" numeric,
  "difference" numeric,
  "expectedAmount" numeric,
  "id" text NOT NULL,
  "openedAt" timestamptz DEFAULT (now()) NOT NULL,
  "openedById" text NOT NULL,
  "openingAmount" numeric NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."Invoice" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "customerDoc" text,
  "customerId" text,
  "customerName" text NOT NULL,
  "dueDate" timestamptz,
  "id" text NOT NULL,
  "issueDate" timestamptz NOT NULL,
  "kind" text NOT NULL,
  "notes" text,
  "number" int4 NOT NULL,
  "status" text DEFAULT 'ISSUED' NOT NULL,
  "tenantId" text NOT NULL,
  "total" numeric NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "voidReason" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "Invoice_status_check_e10bd6e9" CHECK ("status" IN ('ISSUED', 'PAID', 'VOID'))
);

CREATE TABLE "public"."InvoiceLine" (
  "description" text NOT NULL,
  "id" text NOT NULL,
  "invoiceId" text NOT NULL,
  "productId" text,
  "quantity" numeric NOT NULL,
  "total" numeric NOT NULL,
  "unitPrice" numeric NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."Product" (
  "active" bool DEFAULT true NOT NULL,
  "capacity" int4,
  "category" text,
  "cost" numeric,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "description" text,
  "durationDays" int4,
  "durationMinutes" int4,
  "id" text NOT NULL,
  "kind" text DEFAULT 'PRODUCT' NOT NULL,
  "minStock" int4 DEFAULT 0 NOT NULL,
  "name" text NOT NULL,
  "price" numeric NOT NULL,
  "sku" text,
  "stock" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  "trackStock" bool DEFAULT false NOT NULL,
  "unit" text,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Product_kind_check_63510ff3" CHECK ("kind" IN ('PRODUCT', 'SERVICE', 'PLAN', 'TICKET', 'TOUR'))
);

CREATE TABLE "public"."StockMovement" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "note" text,
  "paymentId" text,
  "productId" text NOT NULL,
  "quantity" int4 NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Expense" ADD COLUMN "cashSessionId" text;

ALTER TABLE "public"."Expense" ADD COLUMN "createdById" text;

ALTER TABLE "public"."Expense" ADD COLUMN "paidFrom" text DEFAULT 'BANK' NOT NULL;

ALTER TABLE "public"."Expense" ADD COLUMN "projectId" text;

ALTER TABLE "public"."Expense" ADD COLUMN "supplier" text;

ALTER TABLE "public"."Expense" ADD COLUMN "voidReason" text;

ALTER TABLE "public"."Expense" ADD COLUMN "voidedAt" timestamptz;

ALTER TABLE "public"."Payment" ADD COLUMN "cashSessionId" text;

ALTER TABLE "public"."Payment" ADD COLUMN "invoiceId" text;

ALTER TABLE "public"."Payment" ADD COLUMN "notes" text;

ALTER TABLE "public"."Payment" ADD COLUMN "receiptNumber" int4;

ALTER TABLE "public"."Payment" ADD COLUMN "sourceId" text;

ALTER TABLE "public"."Payment" ADD COLUMN "sourceType" text;

ALTER TABLE "public"."Payment" ADD COLUMN "voidReason" text;

ALTER TABLE "public"."Payment" ADD COLUMN "voidedAt" timestamptz;

ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_tenantId_kind_number_key" UNIQUE ("tenantId", "kind", "number");

ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_tenantId_receiptNumber_key" UNIQUE ("tenantId", "receiptNumber");

CREATE INDEX "Attachment_tenantId_kind_ownerId_idx_b6da39dc" ON "public"."Attachment" ("tenantId", "kind", "ownerId");

CREATE INDEX "CashBox_tenantId_idx_c93ed4f1" ON "public"."CashBox" ("tenantId");

CREATE INDEX "CashMovement_sessionId_idx_29f415d4" ON "public"."CashMovement" ("sessionId");

CREATE INDEX "CashSession_boxId_idx_63a016fa" ON "public"."CashSession" ("boxId");

CREATE INDEX "CashSession_tenantId_boxId_idx_9abd5c49" ON "public"."CashSession" ("tenantId", "boxId");

CREATE INDEX "Invoice_tenantId_idx_c93ed4f1" ON "public"."Invoice" ("tenantId");

CREATE INDEX "InvoiceLine_invoiceId_idx_d5c4f70e" ON "public"."InvoiceLine" ("invoiceId");

CREATE INDEX "Product_tenantId_kind_idx_1e76dd5c" ON "public"."Product" ("tenantId", "kind");

CREATE INDEX "StockMovement_productId_idx_5858600a" ON "public"."StockMovement" ("productId");

ALTER TABLE "public"."CashMovement"
ADD CONSTRAINT "CashMovement_sessionId_fkey"
FOREIGN KEY ("sessionId")
REFERENCES "public"."CashSession" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."CashSession"
ADD CONSTRAINT "CashSession_boxId_fkey"
FOREIGN KEY ("boxId")
REFERENCES "public"."CashBox" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."InvoiceLine"
ADD CONSTRAINT "InvoiceLine_invoiceId_fkey"
FOREIGN KEY ("invoiceId")
REFERENCES "public"."Invoice" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."StockMovement"
ADD CONSTRAINT "StockMovement_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "public"."Product" ("id")
ON DELETE CASCADE;

-- ===================== v1 Clientes y Equipo =====================

ALTER TABLE "public"."User" DROP CONSTRAINT "User_role_check_40dd20e3";

CREATE TABLE "public"."DismissedNotification" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "key" text NOT NULL,
  "userId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."TenantInvite" (
  "acceptedAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "email" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "id" text NOT NULL,
  "invitedById" text,
  "name" text,
  "revokedAt" timestamptz,
  "role" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "TenantInvite_role_check_972a86d0" CHECK ("role" IN ('SUPERADMIN', 'OWNER', 'STAFF', 'ADMIN', 'RECEPTION', 'ADVISOR'))
);

ALTER TABLE "public"."Customer" ADD COLUMN "birthDate" timestamptz;

ALTER TABLE "public"."Customer" ADD COLUMN "city" text;

ALTER TABLE "public"."Customer" ADD COLUMN "documentId" text;

ALTER TABLE "public"."Customer" ADD COLUMN "photoId" text;

ALTER TABLE "public"."Customer" ADD COLUMN "profile" json;

ALTER TABLE "public"."Customer" ADD COLUMN "tags" text[];

ALTER TABLE "public"."PlanSetting" ADD COLUMN "maxUsers" int4;

ALTER TABLE "public"."User" ADD COLUMN "active" bool DEFAULT true NOT NULL;

ALTER TABLE "public"."User" ADD COLUMN "phone" text;

ALTER TABLE "public"."User" ADD COLUMN "removedAt" timestamptz;

ALTER TABLE "public"."User" ADD COLUMN "theme" text;

ALTER TABLE "public"."User" ADD COLUMN "title" text;

ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_tags_elem_not_null_aecbe9e2" CHECK (array_position("tags", NULL) IS NULL);

ALTER TABLE "public"."DismissedNotification" ADD CONSTRAINT "DismissedNotification_userId_key_key" UNIQUE ("userId", "key");

ALTER TABLE "public"."User" ADD CONSTRAINT "User_role_check_972a86d0" CHECK ("role" IN ('SUPERADMIN', 'OWNER', 'STAFF', 'ADMIN', 'RECEPTION', 'ADVISOR'));

CREATE INDEX "TenantInvite_email_idx_46df9cad" ON "public"."TenantInvite" ("email");

CREATE INDEX "TenantInvite_tenantId_idx_c93ed4f1" ON "public"."TenantInvite" ("tenantId");

-- ===================== v1 Agenda (turnos, reservas) =====================

ALTER TABLE "public"."Booking" ADD COLUMN "kind" text DEFAULT 'APPOINTMENT' NOT NULL;

ALTER TABLE "public"."Booking" ADD COLUMN "partySize" int4 DEFAULT 1 NOT NULL;

ALTER TABLE "public"."Booking" ADD COLUMN "productId" text;

ALTER TABLE "public"."Booking" ADD COLUMN "reminderSentAt" timestamptz;

ALTER TABLE "public"."Booking" ADD COLUMN "staffUserId" text;

-- ===================== v1 Rubros (gimnasio, taquilla, tour, membresías) =====================

ALTER TABLE "public"."Tenant" DROP CONSTRAINT "Tenant_vertical_check_739779ca";

CREATE TABLE "public"."Attendance" (
  "allowed" bool NOT NULL,
  "at" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "customerId" text NOT NULL,
  "id" text NOT NULL,
  "membershipId" text,
  "method" text NOT NULL,
  "reason" text,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."Departure" (
  "capacity" int4 NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "date" timestamptz NOT NULL,
  "guide" text,
  "id" text NOT NULL,
  "meetingPoint" text,
  "notes" text,
  "productId" text NOT NULL,
  "status" text DEFAULT 'SCHEDULED' NOT NULL,
  "tenantId" text NOT NULL,
  "time" text,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."TicketSale" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "customerId" text,
  "groupName" text,
  "id" text NOT NULL,
  "kind" text DEFAULT 'TAQUILLA' NOT NULL,
  "lines" json NOT NULL,
  "number" int4 NOT NULL,
  "paymentId" text,
  "slot" text NOT NULL,
  "status" text DEFAULT 'PAID' NOT NULL,
  "tenantId" text NOT NULL,
  "total" numeric NOT NULL,
  "visitDate" timestamptz NOT NULL,
  "visitors" int4 NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."TourBooking" (
  "code" text NOT NULL,
  "commissionPct" int4,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text NOT NULL,
  "departureId" text NOT NULL,
  "id" text NOT NULL,
  "notes" text,
  "passengers" json NOT NULL,
  "seats" int4 NOT NULL,
  "sellerUserId" text,
  "status" text DEFAULT 'RESERVED' NOT NULL,
  "tenantId" text NOT NULL,
  "total" numeric NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Customer" ADD COLUMN "accessCode" text;

ALTER TABLE "public"."Customer" ADD COLUMN "nfcUid" text;

ALTER TABLE "public"."Invoice" ADD COLUMN "projectId" text;

ALTER TABLE "public"."Membership" ADD COLUMN "cancelReason" text;

ALTER TABLE "public"."Membership" ADD COLUMN "cancelledAt" timestamptz;

ALTER TABLE "public"."Membership" ADD COLUMN "frozenFrom" timestamptz;

ALTER TABLE "public"."Membership" ADD COLUMN "frozenUntil" timestamptz;

ALTER TABLE "public"."Membership" ADD COLUMN "productId" text;

ALTER TABLE "public"."Tenant" ADD COLUMN "settings" json;

ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_vertical_check_7ca0b77e" CHECK ("vertical" IN ('gym', 'tourism_agency', 'hospitality', 'construction', 'carpentry', 'restaurant', 'retail', 'beauty', 'healthcare', 'mechanic', 'education', 'real_estate', 'hardware_store', 'nautical_transport', 'tour_guides', 'events', 'museum'));

ALTER TABLE "public"."TicketSale" ADD CONSTRAINT "TicketSale_tenantId_number_key" UNIQUE ("tenantId", "number");

ALTER TABLE "public"."TourBooking" ADD CONSTRAINT "TourBooking_tenantId_code_key" UNIQUE ("tenantId", "code");

CREATE INDEX "Attendance_customerId_idx_b2a8a46c" ON "public"."Attendance" ("customerId");

CREATE INDEX "Attendance_tenantId_at_idx_21a9eddd" ON "public"."Attendance" ("tenantId", "at");

CREATE INDEX "Departure_tenantId_date_idx_3ef944c7" ON "public"."Departure" ("tenantId", "date");

CREATE INDEX "TicketSale_tenantId_visitDate_idx_d723b863" ON "public"."TicketSale" ("tenantId", "visitDate");

CREATE INDEX "TourBooking_departureId_idx_24d39b35" ON "public"."TourBooking" ("departureId");

-- ===================== v1 Taquilla y solicitudes web =====================

CREATE TABLE "public"."WebsiteRequest" (
  "businessName" text NOT NULL,
  "colors" text,
  "contactEmail" text,
  "contactName" text NOT NULL,
  "contactPhone" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "domain" text,
  "id" text NOT NULL,
  "notes" text,
  "paidAt" timestamptz,
  "paymentMethod" text,
  "paymentRef" text,
  "priceCop" int4,
  "publishedUrl" text,
  "requestedById" text,
  "slogan" text,
  "staffNotes" text,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."TicketSale" ADD COLUMN "bookingId" text;

CREATE INDEX "WebsiteRequest_status_idx_e98638ab" ON "public"."WebsiteRequest" ("status");

CREATE INDEX "WebsiteRequest_tenantId_idx_c93ed4f1" ON "public"."WebsiteRequest" ("tenantId");

-- ===================== Ubicación del negocio (lat/lng/placeId) =====================

ALTER TABLE "public"."Tenant" ADD COLUMN "latitude" float8;

ALTER TABLE "public"."Tenant" ADD COLUMN "longitude" float8;

ALTER TABLE "public"."Tenant" ADD COLUMN "placeId" text;

-- ===================== Presencia Thrive (reemplaza WebsiteRequest) =====================

DROP TABLE "public"."WebsiteRequest";

CREATE TABLE "public"."PresenceRequest" (
  "businessName" text NOT NULL,
  "colors" text,
  "contactEmail" text,
  "contactName" text NOT NULL,
  "contactPhone" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "domain" text,
  "id" text NOT NULL,
  "notes" text,
  "paidAt" timestamptz,
  "paymentMethod" text,
  "paymentRef" text,
  "priceCop" int4,
  "publishedUrl" text,
  "requestedById" text,
  "services" text[],
  "slogan" text,
  "staffNotes" text,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "PresenceRequest_services_elem_not_null_4d2c6c0f" CHECK (array_position("services", NULL) IS NULL)
);

CREATE TABLE "public"."PresenceScan" (
  "breakdown" json NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "score" int4 NOT NULL,
  "source" text DEFAULT 'MANUAL' NOT NULL,
  "state" text NOT NULL,
  "tenantId" text NOT NULL,
  "website" json,
  PRIMARY KEY ("id")
);

CREATE INDEX "PresenceRequest_status_idx_e98638ab" ON "public"."PresenceRequest" ("status");

CREATE INDEX "PresenceRequest_tenantId_idx_c93ed4f1" ON "public"."PresenceRequest" ("tenantId");

CREATE INDEX "PresenceScan_tenantId_createdAt_idx_88162366" ON "public"."PresenceScan" ("tenantId", "createdAt");

CREATE INDEX "PresenceScan_tenantId_idx_c93ed4f1" ON "public"."PresenceScan" ("tenantId");

ALTER TABLE "public"."PresenceScan"
ADD CONSTRAINT "PresenceScan_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- ===================== Row Level Security =====================

ALTER TABLE "public"."Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CashBox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CashMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CashSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InvoiceLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."DismissedNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TenantInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Departure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TicketSale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TourBooking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PresenceRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PresenceScan" ENABLE ROW LEVEL SECURITY;
COMMIT;
