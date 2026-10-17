-- Operations Center completo (fases A → E) en UNA transacción.
-- Ejecutar en el SQL Editor de Supabase ANTES de publicar el código en main.
-- Aditivo: no borra ni modifica datos existentes. Mantiene RLS activo.
BEGIN;

-- ===================== Fase A =====================

CREATE TABLE "public"."StaffMember" (
  "active" bool DEFAULT true NOT NULL,
  "clerkUserId" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "email" text NOT NULL,
  "id" text NOT NULL,
  "invitedById" text,
  "joinedAt" timestamptz,
  "lastSeenAt" timestamptz,
  "name" text,
  "roleId" text NOT NULL,
  "title" text,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."StaffRole" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "description" text,
  "id" text NOT NULL,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "permissions" text[] NOT NULL,
  "system" bool DEFAULT false NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "StaffRole_permissions_elem_not_null_318e2952" CHECK (array_position("permissions", NULL) IS NULL)
);

CREATE TABLE "public"."TenantContact" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "email" text,
  "hours" text,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "notes" text,
  "phone" text,
  "preferredChannel" text,
  "purpose" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "whatsapp" text,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."Tenant" ADD COLUMN "accountManagerId" text;

ALTER TABLE "public"."Tenant" ADD COLUMN "accountStage" text DEFAULT 'ACTIVE' NOT NULL;

ALTER TABLE "public"."StaffMember" ADD CONSTRAINT "StaffMember_clerkUserId_key" UNIQUE ("clerkUserId");

ALTER TABLE "public"."StaffMember" ADD CONSTRAINT "StaffMember_email_key" UNIQUE ("email");

ALTER TABLE "public"."StaffRole" ADD CONSTRAINT "StaffRole_key_key" UNIQUE ("key");

ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_accountStage_check_8f6f0190" CHECK ("accountStage" IN ('ONBOARDING', 'ACTIVE', 'CANCELLED', 'ARCHIVED'));

CREATE INDEX "StaffMember_roleId_idx_ffccc9a4" ON "public"."StaffMember" ("roleId");

CREATE INDEX "TenantContact_tenantId_idx_c93ed4f1" ON "public"."TenantContact" ("tenantId");

ALTER TABLE "public"."StaffMember"
ADD CONSTRAINT "StaffMember_roleId_fkey"
FOREIGN KEY ("roleId")
REFERENCES "public"."StaffRole" ("id");

ALTER TABLE "public"."StaffMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StaffRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TenantContact" ENABLE ROW LEVEL SECURITY;

-- ===================== Fase B =====================

CREATE TABLE "public"."CustomerTierSetting" (
  "id" text NOT NULL,
  "label" text NOT NULL,
  "maxCustomers" int4,
  "order" int4 NOT NULL,
  "priceUsdCents" int4 NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."ModuleSetting" (
  "description" text NOT NULL,
  "included" bool NOT NULL,
  "label" text NOT NULL,
  "module" text NOT NULL,
  "order" int4 NOT NULL,
  "priceUsdCents" int4 NOT NULL,
  "status" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("module")
);

CREATE TABLE "public"."PlanSetting" (
  "active" bool DEFAULT true NOT NULL,
  "annualDiscountPct" int4 NOT NULL,
  "basePriceUsdCents" int4 NOT NULL,
  "chargesModules" bool NOT NULL,
  "features" text[] NOT NULL,
  "includesAllModules" bool NOT NULL,
  "key" text NOT NULL,
  "moduleDiscountPct" int4 NOT NULL,
  "name" text NOT NULL,
  "order" int4 NOT NULL,
  "recommended" bool DEFAULT false NOT NULL,
  "tagline" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("key"),
  CONSTRAINT "PlanSetting_features_elem_not_null_1a661718" CHECK (array_position("features", NULL) IS NULL)
);

CREATE TABLE "public"."VerticalSetting" (
  "dashboardTemplate" text,
  "label" text NOT NULL,
  "modules" text[] NOT NULL,
  "order" int4 NOT NULL,
  "priceFactorPct" int4 NOT NULL,
  "recommended" text[] NOT NULL,
  "signupEnabled" bool NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "vertical" text NOT NULL,
  PRIMARY KEY ("vertical"),
  CONSTRAINT "VerticalSetting_modules_elem_not_null_749d77ec" CHECK (array_position("modules", NULL) IS NULL),
  CONSTRAINT "VerticalSetting_recommended_elem_not_null_226dce52" CHECK (array_position("recommended", NULL) IS NULL)
);

ALTER TABLE "public"."Tenant" ADD COLUMN "contractedModules" text[];

ALTER TABLE "public"."Tenant" ADD COLUMN "customerTierId" text;

ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_contractedModules_elem_not_null_6b619961" CHECK (array_position("contractedModules", NULL) IS NULL);

ALTER TABLE "public"."CustomerTierSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ModuleSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PlanSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."VerticalSetting" ENABLE ROW LEVEL SECURITY;

-- ===================== Fase C =====================

CREATE TABLE "public"."Lead" (
  "city" text,
  "company" text NOT NULL,
  "contactName" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "email" text,
  "id" text NOT NULL,
  "lostReason" text,
  "nextStep" text,
  "nextStepAt" timestamptz,
  "notes" text,
  "ownerId" text,
  "phone" text,
  "plan" text,
  "source" text NOT NULL,
  "stage" text DEFAULT 'NEW' NOT NULL,
  "stageChangedAt" timestamptz DEFAULT (now()) NOT NULL,
  "tenantId" text,
  "updatedAt" timestamptz NOT NULL,
  "valueUsdCents" int4 DEFAULT 0 NOT NULL,
  "vertical" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "Lead_stage_check_ded1c79a" CHECK ("stage" IN ('NEW', 'CONTACTED', 'QUALIFIED', 'DEMO', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'))
);

CREATE TABLE "public"."LeadActivity" (
  "body" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "leadId" text NOT NULL,
  "staffId" text,
  "staffName" text,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."SupportTicket" (
  "assigneeId" text,
  "category" text NOT NULL,
  "channel" text NOT NULL,
  "closedAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "description" text NOT NULL,
  "firstResponseAt" timestamptz,
  "id" text NOT NULL,
  "priority" text DEFAULT 'NORMAL' NOT NULL,
  "requesterContact" text,
  "requesterName" text,
  "resolvedAt" timestamptz,
  "seq" int4 NOT NULL,
  "solution" text,
  "status" text DEFAULT 'NEW' NOT NULL,
  "subject" text NOT NULL,
  "tenantId" text,
  "updatedAt" timestamptz NOT NULL,
  "year" int4 NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "SupportTicket_priority_check_72dbae57" CHECK ("priority" IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  CONSTRAINT "SupportTicket_status_check_ab8fd9bd" CHECK ("status" IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED'))
);

CREATE TABLE "public"."TicketMessage" (
  "authorName" text NOT NULL,
  "authorStaffId" text,
  "body" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "internal" bool DEFAULT false NOT NULL,
  "ticketId" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."SupportTicket" ADD CONSTRAINT "SupportTicket_year_seq_key" UNIQUE ("year", "seq");

CREATE INDEX "Lead_ownerId_idx_e2d0c1ef" ON "public"."Lead" ("ownerId");

CREATE INDEX "Lead_stage_idx_51755035" ON "public"."Lead" ("stage");

CREATE INDEX "LeadActivity_leadId_idx_9113844c" ON "public"."LeadActivity" ("leadId");

CREATE INDEX "SupportTicket_status_idx_e98638ab" ON "public"."SupportTicket" ("status");

CREATE INDEX "SupportTicket_tenantId_idx_c93ed4f1" ON "public"."SupportTicket" ("tenantId");

CREATE INDEX "TicketMessage_ticketId_idx_2fe526c3" ON "public"."TicketMessage" ("ticketId");

ALTER TABLE "public"."LeadActivity"
ADD CONSTRAINT "LeadActivity_leadId_fkey"
FOREIGN KEY ("leadId")
REFERENCES "public"."Lead" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."TicketMessage"
ADD CONSTRAINT "TicketMessage_ticketId_fkey"
FOREIGN KEY ("ticketId")
REFERENCES "public"."SupportTicket" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LeadActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TicketMessage" ENABLE ROW LEVEL SECURITY;

-- ===================== Fase D =====================

CREATE TABLE "public"."BillingPolicy" (
  "graceDays" int4 NOT NULL,
  "id" text NOT NULL,
  "noticeDays" int4 NOT NULL,
  "reminderDays" int4[] NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "BillingPolicy_reminderDays_elem_not_null_5bb4f22d" CHECK (array_position("reminderDays", NULL) IS NULL)
);

CREATE TABLE "public"."Charge" (
  "amountUsdCents" int4 NOT NULL,
  "confirmedAt" timestamptz,
  "confirmedById" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "dueAt" timestamptz NOT NULL,
  "id" text NOT NULL,
  "method" text,
  "notes" text,
  "noticeSentAt" timestamptz,
  "paidAt" timestamptz,
  "periodEnd" timestamptz NOT NULL,
  "periodStart" timestamptz NOT NULL,
  "recordedById" text,
  "reference" text,
  "refundReason" text,
  "refundedAt" timestamptz,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "subscriptionId" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "voidReason" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "Charge_status_check_4344c7d5" CHECK ("status" IN ('PENDING', 'PAID', 'VOID', 'REFUNDED'))
);

CREATE TABLE "public"."ChargeEvidence" (
  "byteSize" int4 NOT NULL,
  "chargeId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "data" bytea NOT NULL,
  "fileName" text NOT NULL,
  "id" text NOT NULL,
  "mimeType" text NOT NULL,
  "sha256" text NOT NULL,
  "uploadedById" text,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."Subscription" (
  "billingCycle" text NOT NULL,
  "cancelReason" text,
  "cancelledAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "currentPeriodEnd" timestamptz NOT NULL,
  "currentPeriodStart" timestamptz NOT NULL,
  "id" text NOT NULL,
  "notes" text,
  "plan" text NOT NULL,
  "priceUsdCents" int4 NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_status_check_fc886289" CHECK ("status" IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'))
);

ALTER TABLE "public"."Charge" ADD CONSTRAINT "Charge_subscriptionId_periodStart_key" UNIQUE ("subscriptionId", "periodStart");

ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_tenantId_key" UNIQUE ("tenantId");

CREATE INDEX "Charge_status_idx_e98638ab" ON "public"."Charge" ("status");

CREATE INDEX "Charge_subscriptionId_idx_edbe96bf" ON "public"."Charge" ("subscriptionId");

CREATE INDEX "Charge_tenantId_idx_c93ed4f1" ON "public"."Charge" ("tenantId");

CREATE INDEX "ChargeEvidence_chargeId_idx_3fcf5f1d" ON "public"."ChargeEvidence" ("chargeId");

ALTER TABLE "public"."Charge"
ADD CONSTRAINT "Charge_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId")
REFERENCES "public"."Subscription" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."ChargeEvidence"
ADD CONSTRAINT "ChargeEvidence_chargeId_fkey"
FOREIGN KEY ("chargeId")
REFERENCES "public"."Charge" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."BillingPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Charge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ChargeEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Subscription" ENABLE ROW LEVEL SECURITY;

-- ===================== Fase E =====================

CREATE TABLE "public"."InboxConversation" (
  "assigneeId" text,
  "channel" text NOT NULL,
  "contactHandle" text NOT NULL,
  "contactName" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "lastInboundAt" timestamptz,
  "lastMessageAt" timestamptz DEFAULT (now()) NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "subject" text,
  "tenantId" text,
  "ticketId" text,
  "unread" int4 DEFAULT 0 NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "InboxConversation_channel_check_a1390589" CHECK ("channel" IN ('WHATSAPP', 'EMAIL')),
  CONSTRAINT "InboxConversation_status_check_403d7b80" CHECK ("status" IN ('OPEN', 'PENDING', 'CLOSED'))
);

CREATE TABLE "public"."InboxMessage" (
  "authorName" text,
  "authorStaffId" text,
  "body" text NOT NULL,
  "conversationId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "delivery" text NOT NULL,
  "direction" text NOT NULL,
  "error" text,
  "externalId" text,
  "id" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."SatisfactionSurvey" (
  "answeredAt" timestamptz,
  "assigneeId" text,
  "comment" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "nps" int4,
  "score" int4,
  "sentAt" timestamptz DEFAULT (now()) NOT NULL,
  "tenantId" text,
  "ticketId" text NOT NULL,
  "token" text NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."InboxConversation" ADD CONSTRAINT "InboxConversation_channel_contactHandle_key" UNIQUE ("channel", "contactHandle");

ALTER TABLE "public"."InboxMessage" ADD CONSTRAINT "InboxMessage_externalId_key" UNIQUE ("externalId");

ALTER TABLE "public"."SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_ticketId_key" UNIQUE ("ticketId");

ALTER TABLE "public"."SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_token_key" UNIQUE ("token");

CREATE INDEX "InboxConversation_status_idx_e98638ab" ON "public"."InboxConversation" ("status");

CREATE INDEX "InboxConversation_tenantId_idx_c93ed4f1" ON "public"."InboxConversation" ("tenantId");

CREATE INDEX "InboxMessage_conversationId_idx_669215a6" ON "public"."InboxMessage" ("conversationId");

CREATE INDEX "SatisfactionSurvey_tenantId_idx_c93ed4f1" ON "public"."SatisfactionSurvey" ("tenantId");

ALTER TABLE "public"."InboxMessage"
ADD CONSTRAINT "InboxMessage_conversationId_fkey"
FOREIGN KEY ("conversationId")
REFERENCES "public"."InboxConversation" ("id")
ON DELETE CASCADE;

ALTER TABLE "public"."InboxConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InboxMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SatisfactionSurvey" ENABLE ROW LEVEL SECURITY;
COMMIT;
