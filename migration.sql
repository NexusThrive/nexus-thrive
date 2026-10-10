CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "public"."ApuActivity" (
  "code" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "description" text,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  "unit" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."ApuActivityComposition" (
  "activityId" text NOT NULL,
  "consumption" numeric NOT NULL,
  "id" text NOT NULL,
  "itemId" text NOT NULL,
  "wastePercent" numeric NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."ApuItem" (
  "category" text NOT NULL,
  "code" text,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  "unit" text NOT NULL,
  "unitPrice" numeric NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "ApuItem_category_check_cb615411" CHECK ("category" IN ('MATERIAL', 'MANO_DE_OBRA', 'EQUIPO', 'TRANSPORTE'))
);

CREATE TABLE "public"."AuditLog" (
  "action" text NOT NULL,
  "actorEmail" text,
  "actorId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "ipAddress" text,
  "metadata" json,
  "targetTenantId" text,
  "targetTenantName" text,
  "userAgent" text,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."Booking" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text NOT NULL,
  "endDate" timestamptz NOT NULL,
  "id" text NOT NULL,
  "notes" text,
  "serviceName" text NOT NULL,
  "startDate" timestamptz NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "tenantId" text NOT NULL,
  "totalAmount" int8 DEFAULT '0'::int8 NOT NULL,
  "updatedAt" timestamptz DEFAULT (now()) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Booking_status_check_7d2ee7b5" CHECK ("status" IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'))
);

CREATE TABLE "public"."Customer" (
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "email" text,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."CustomerNote" (
  "content" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdBy" text,
  "customerId" text NOT NULL,
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."Expense" (
  "amount" numeric NOT NULL,
  "category" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "date" timestamptz DEFAULT (now()) NOT NULL,
  "description" text NOT NULL,
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."Membership" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text NOT NULL,
  "endDate" timestamptz NOT NULL,
  "id" text NOT NULL,
  "payments" json,
  "price" numeric NOT NULL,
  "startDate" timestamptz NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "tenantId" text NOT NULL,
  "type" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Membership_status_check_105845ed" CHECK ("status" IN ('active', 'expiring', 'expired')),
  CONSTRAINT "Membership_type_check_2115602f" CHECK ("type" IN ('mensual', 'trimestral', 'anual'))
);

CREATE TABLE "public"."Payment" (
  "amount" numeric NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text,
  "description" text,
  "id" text NOT NULL,
  "membershipId" text,
  "provider" text DEFAULT 'CASH' NOT NULL,
  "providerRefId" text,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Payment_provider_check_86b69e55" CHECK ("provider" IN ('WOMPI', 'NEQUI', 'CASH', 'TRANSFER')),
  CONSTRAINT "Payment_status_check_6198e80f" CHECK ("status" IN ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED'))
);

CREATE TABLE "public"."Quote" (
  "adminPercent" numeric DEFAULT '15'::numeric NOT NULL,
  "code" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text,
  "directCost" numeric NOT NULL,
  "id" text NOT NULL,
  "imprevPercent" numeric DEFAULT '5'::numeric NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "taxPercent" numeric DEFAULT '19'::numeric NOT NULL,
  "tenantId" text NOT NULL,
  "title" text NOT NULL,
  "totalAmount" numeric NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "utilPercent" numeric DEFAULT '10'::numeric NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Quote_status_check_58e78406" CHECK ("status" IN ('DRAFT', 'SENT', 'APPROVED', 'REJECTED'))
);

CREATE TABLE "public"."QuoteItem" (
  "activityId" text,
  "apuSnapshot" json,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "quantity" numeric NOT NULL,
  "quoteId" text NOT NULL,
  "totalCost" numeric NOT NULL,
  "unit" text NOT NULL,
  "unitCost" numeric NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."Tenant" (
  "active" bool DEFAULT true NOT NULL,
  "address" text,
  "city" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customDomain" text,
  "googleBusinessUrl" text,
  "id" text NOT NULL,
  "instagramHandle" text,
  "legalName" text,
  "name" text NOT NULL,
  "onboardingCompleted" bool DEFAULT false NOT NULL,
  "paymentMethods" text[],
  "slug" text NOT NULL,
  "suspendedAt" timestamptz,
  "suspendedReason" text,
  "taxId" text,
  "teamSize" text,
  "tenantType" text DEFAULT 'COMPANY' NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "vertical" text NOT NULL,
  "websiteUrl" text,
  "whatsappNumber" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "Tenant_paymentMethods_check_08fe4dd4" CHECK ("paymentMethods"::text[] <@ ARRAY['WOMPI', 'NEQUI', 'CASH', 'TRANSFER']::text[]),
  CONSTRAINT "Tenant_paymentMethods_elem_not_null_7b2f47d4" CHECK (array_position("paymentMethods", NULL) IS NULL),
  CONSTRAINT "Tenant_tenantType_check_0d8e073f" CHECK ("tenantType" IN ('INDIVIDUAL', 'COMPANY')),
  CONSTRAINT "Tenant_vertical_check_739779ca" CHECK ("vertical" IN ('gym', 'tourism_agency', 'hospitality', 'construction', 'carpentry', 'restaurant', 'retail', 'beauty', 'healthcare', 'mechanic', 'education', 'real_estate', 'hardware_store', 'nautical_transport', 'tour_guides', 'events'))
);

CREATE TABLE "public"."TenantModule" (
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "moduleName" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "TenantModule_moduleName_check_e283a8b3" CHECK ("moduleName" IN ('crm', 'dashboard', 'bookings', 'payments', 'billing', 'inventory', 'finance', 'whatsapp', 'memberships', 'orders', 'quotes'))
);

CREATE TABLE "public"."User" (
  "clerkUserId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "email" text NOT NULL,
  "id" text NOT NULL,
  "name" text,
  "role" text DEFAULT 'STAFF' NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "User_role_check_40dd20e3" CHECK ("role" IN ('SUPERADMIN', 'OWNER', 'STAFF'))
);

ALTER TABLE "public"."ApuActivity" ADD CONSTRAINT "ApuActivity_tenantId_code_key" UNIQUE ("tenantId", "code");

ALTER TABLE "public"."ApuActivityComposition" ADD CONSTRAINT "ApuActivityComposition_activityId_itemId_key" UNIQUE ("activityId", "itemId");

ALTER TABLE "public"."ApuItem" ADD CONSTRAINT "ApuItem_tenantId_code_key" UNIQUE ("tenantId", "code");

ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_providerRefId_key" UNIQUE ("providerRefId");

ALTER TABLE "public"."Quote" ADD CONSTRAINT "Quote_tenantId_code_key" UNIQUE ("tenantId", "code");

ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_slug_key" UNIQUE ("slug");

ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_customDomain_key" UNIQUE ("customDomain");

ALTER TABLE "public"."TenantModule" ADD CONSTRAINT "TenantModule_tenantId_moduleName_key" UNIQUE ("tenantId", "moduleName");

ALTER TABLE "public"."User" ADD CONSTRAINT "User_clerkUserId_tenantId_key" UNIQUE ("clerkUserId", "tenantId");

CREATE INDEX "ApuActivity_tenantId_idx_c93ed4f1" ON "public"."ApuActivity" ("tenantId");

CREATE INDEX "ApuActivityComposition_activityId_idx_bf2a659e" ON "public"."ApuActivityComposition" ("activityId");

CREATE INDEX "ApuActivityComposition_itemId_idx_41357140" ON "public"."ApuActivityComposition" ("itemId");

CREATE INDEX "ApuItem_tenantId_idx_c93ed4f1" ON "public"."ApuItem" ("tenantId");

CREATE INDEX "AuditLog_actorId_idx_a58f6b4b" ON "public"."AuditLog" ("actorId");

CREATE INDEX "AuditLog_createdAt_idx_9575dbd7" ON "public"."AuditLog" ("createdAt");

CREATE INDEX "AuditLog_targetTenantId_idx_9ecf2d83" ON "public"."AuditLog" ("targetTenantId");

CREATE INDEX "Booking_customerId_idx_b2a8a46c" ON "public"."Booking" ("customerId");

CREATE INDEX "Booking_tenantId_idx_c93ed4f1" ON "public"."Booking" ("tenantId");

CREATE INDEX "Customer_tenantId_idx_c93ed4f1" ON "public"."Customer" ("tenantId");

CREATE INDEX "CustomerNote_createdBy_idx_ba0f792f" ON "public"."CustomerNote" ("createdBy");

CREATE INDEX "CustomerNote_customerId_idx_b2a8a46c" ON "public"."CustomerNote" ("customerId");

CREATE INDEX "CustomerNote_tenantId_idx_c93ed4f1" ON "public"."CustomerNote" ("tenantId");

CREATE INDEX "Expense_tenantId_idx_c93ed4f1" ON "public"."Expense" ("tenantId");

CREATE INDEX "Membership_customerId_idx_b2a8a46c" ON "public"."Membership" ("customerId");

CREATE INDEX "Membership_tenantId_endDate_idx_49363571" ON "public"."Membership" ("tenantId", "endDate");

CREATE INDEX "Membership_tenantId_idx_c93ed4f1" ON "public"."Membership" ("tenantId");

CREATE INDEX "Payment_customerId_idx_b2a8a46c" ON "public"."Payment" ("customerId");

CREATE INDEX "Payment_membershipId_idx_fdcfb7b5" ON "public"."Payment" ("membershipId");

CREATE INDEX "Payment_providerRefId_idx_0d521fc8" ON "public"."Payment" ("providerRefId");

CREATE INDEX "Payment_tenantId_idx_c93ed4f1" ON "public"."Payment" ("tenantId");

CREATE INDEX "Quote_customerId_idx_b2a8a46c" ON "public"."Quote" ("customerId");

CREATE INDEX "Quote_tenantId_idx_c93ed4f1" ON "public"."Quote" ("tenantId");

CREATE INDEX "Quote_tenantId_status_idx_d3d04256" ON "public"."Quote" ("tenantId", "status");

CREATE INDEX "QuoteItem_activityId_idx_bf2a659e" ON "public"."QuoteItem" ("activityId");

CREATE INDEX "QuoteItem_quoteId_idx_a7628ce5" ON "public"."QuoteItem" ("quoteId");

CREATE INDEX "Tenant_slug_idx_73b7f5ce" ON "public"."Tenant" ("slug");

CREATE INDEX "TenantModule_tenantId_idx_c93ed4f1" ON "public"."TenantModule" ("tenantId");

CREATE INDEX "User_tenantId_idx_c93ed4f1" ON "public"."User" ("tenantId");

ALTER TABLE "public"."ApuActivity"
ADD CONSTRAINT "ApuActivity_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ApuActivityComposition"
ADD CONSTRAINT "ApuActivityComposition_activityId_fkey"
FOREIGN KEY ("activityId")
REFERENCES "public"."ApuActivity" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ApuActivityComposition"
ADD CONSTRAINT "ApuActivityComposition_itemId_fkey"
FOREIGN KEY ("itemId")
REFERENCES "public"."ApuItem" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ApuItem"
ADD CONSTRAINT "ApuItem_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Customer"
ADD CONSTRAINT "Customer_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."CustomerNote"
ADD CONSTRAINT "CustomerNote_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."CustomerNote"
ADD CONSTRAINT "CustomerNote_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "public"."Customer" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."CustomerNote"
ADD CONSTRAINT "CustomerNote_createdBy_fkey"
FOREIGN KEY ("createdBy")
REFERENCES "public"."User" ("id")
ON DELETE SET NULL;

ALTER TABLE "public"."Expense"
ADD CONSTRAINT "Expense_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Membership"
ADD CONSTRAINT "Membership_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Membership"
ADD CONSTRAINT "Membership_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "public"."Customer" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Payment"
ADD CONSTRAINT "Payment_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Payment"
ADD CONSTRAINT "Payment_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "public"."Customer" ("id")
ON DELETE SET NULL;

ALTER TABLE "public"."Payment"
ADD CONSTRAINT "Payment_membershipId_fkey"
FOREIGN KEY ("membershipId")
REFERENCES "public"."Membership" ("id")
ON DELETE SET NULL;

ALTER TABLE "public"."Quote"
ADD CONSTRAINT "Quote_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Quote"
ADD CONSTRAINT "Quote_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "public"."Customer" ("id")
ON DELETE SET NULL;

ALTER TABLE "public"."QuoteItem"
ADD CONSTRAINT "QuoteItem_quoteId_fkey"
FOREIGN KEY ("quoteId")
REFERENCES "public"."Quote" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."QuoteItem"
ADD CONSTRAINT "QuoteItem_activityId_fkey"
FOREIGN KEY ("activityId")
REFERENCES "public"."ApuActivity" ("id")
ON DELETE SET NULL;

ALTER TABLE "public"."TenantModule"
ADD CONSTRAINT "TenantModule_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."User"
ADD CONSTRAINT "User_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

