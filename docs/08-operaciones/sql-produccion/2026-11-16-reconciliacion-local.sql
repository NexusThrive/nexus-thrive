-- LOCAL RECOVERY ONLY: reviewed against the local schema on 2026-11-16.
-- Source: Prisma db update --dry-run, current emitted contract.
-- All nine destructive operations were excluded; existing extra fields and tables are preserved.
-- Do not run against production or reapply blindly. Inspect drift and take a backup first.
-- Four proven legacy-orphan foreign keys use NOT VALID; data remediation remains pending.
-- This repairs existing schema definitions; it is not a new product migration.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

-- table.BankStatementLine
CREATE TABLE "public"."BankStatementLine" (
  "amount" numeric NOT NULL,
  "batch" text NOT NULL,
  "confirmedAt" timestamptz,
  "confirmedById" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "day" text NOT NULL,
  "description" text NOT NULL,
  "fingerprint" text NOT NULL,
  "id" text NOT NULL,
  "matchConfidence" text,
  "matchId" text,
  "matchType" text,
  "reference" text,
  "status" text DEFAULT 'UNMATCHED' NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.BusinessConversation
CREATE TABLE "public"."BusinessConversation" (
  "channel" text DEFAULT 'WHATSAPP' NOT NULL,
  "connectionId" text NOT NULL,
  "contactHandle" text NOT NULL,
  "contactName" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text,
  "id" text NOT NULL,
  "lastInboundAt" timestamptz,
  "lastMessageAt" timestamptz DEFAULT (now()) NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "tenantId" text NOT NULL,
  "unread" int4 DEFAULT 0 NOT NULL,
  PRIMARY KEY ("id")
);

-- table.BusinessMessage
CREATE TABLE "public"."BusinessMessage" (
  "body" text NOT NULL,
  "conversationId" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "direction" text NOT NULL,
  "error" text,
  "externalId" text,
  "id" text NOT NULL,
  "status" text DEFAULT 'RECEIVED' NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.CrmLostReason
CREATE TABLE "public"."CrmLostReason" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "position" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.CrmStage
CREATE TABLE "public"."CrmStage" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "isWon" bool DEFAULT false NOT NULL,
  "name" text NOT NULL,
  "position" int4 NOT NULL,
  "probability" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.CrmTag
CREATE TABLE "public"."CrmTag" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.CrmTeam
CREATE TABLE "public"."CrmTeam" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "memberIds" text[] DEFAULT '{}' NOT NULL,
  "name" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "CrmTeam_memberIds_elem_not_null_2683b194" CHECK (array_position("memberIds", NULL) IS NULL)
);

-- table.CustomerGroup
CREATE TABLE "public"."CustomerGroup" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "icon" text DEFAULT 'users' NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "priceListId" text,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.CustomerGroupMember
CREATE TABLE "public"."CustomerGroupMember" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text NOT NULL,
  "groupId" text NOT NULL,
  "id" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.Deliverable
CREATE TABLE "public"."Deliverable" (
  "clientComment" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "customerId" text,
  "decidedAt" timestamptz,
  "decidedByName" text,
  "description" text,
  "id" text NOT NULL,
  "projectId" text,
  "reviewTokenExpiresAt" timestamptz,
  "reviewTokenHash" text,
  "sentAt" timestamptz,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "taskId" text,
  "tenantId" text NOT NULL,
  "title" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.Delivery
CREATE TABLE "public"."Delivery" (
  "carrier" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "deliveredAt" timestamptz,
  "id" text NOT NULL,
  "method" text NOT NULL,
  "note" text,
  "orderId" text NOT NULL,
  "receivedBy" text,
  "scheduledFor" timestamptz,
  "tenantId" text NOT NULL,
  "trackingCode" text,
  PRIMARY KEY ("id")
);

-- table.FinancialAccount
CREATE TABLE "public"."FinancialAccount" (
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "feeFixed" numeric DEFAULT '0'::numeric NOT NULL,
  "feePct" numeric DEFAULT '0'::numeric NOT NULL,
  "feeVatPct" numeric DEFAULT '0'::numeric NOT NULL,
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "ledgerAccount" text NOT NULL,
  "name" text NOT NULL,
  "provider" text,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

-- table.LeadForm
CREATE TABLE "public"."LeadForm" (
  "allowedOrigins" text[] NOT NULL,
  "campaign" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "enabled" bool DEFAULT true NOT NULL,
  "id" text NOT NULL,
  "name" text NOT NULL,
  "publicKey" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "LeadForm_allowedOrigins_elem_not_null_d963e802" CHECK (array_position("allowedOrigins", NULL) IS NULL)
);

-- table.MessageTemplate
CREATE TABLE "public"."MessageTemplate" (
  "body" text NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "enabled" bool DEFAULT true NOT NULL,
  "event" text,
  "id" text NOT NULL,
  "key" text NOT NULL,
  "language" text DEFAULT 'es' NOT NULL,
  "metaName" text,
  "metaStatus" text DEFAULT 'NONE' NOT NULL,
  "tenantId" text NOT NULL,
  "title" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

-- table.Obligation
CREATE TABLE "public"."Obligation" (
  "amount" numeric NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text,
  "debtorName" text NOT NULL,
  "description" text NOT NULL,
  "dueDate" timestamptz NOT NULL,
  "id" text NOT NULL,
  "originId" text NOT NULL,
  "originType" text NOT NULL,
  "paidTotal" numeric DEFAULT '0'::numeric NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

-- table.Opportunity
CREATE TABLE "public"."Opportunity" (
  "closedAt" timestamptz,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text,
  "description" text,
  "estimatedValue" numeric,
  "expectedClose" text,
  "id" text NOT NULL,
  "interest" text NOT NULL,
  "leadId" text,
  "lostReason" text,
  "nextAction" text,
  "nextActionAt" timestamptz,
  "orderId" text,
  "ownerId" text,
  "position" float8,
  "priority" int4 DEFAULT 0 NOT NULL,
  "probability" int4,
  "source" text,
  "stage" text DEFAULT 'NEW' NOT NULL,
  "stageId" text,
  "stageSince" timestamptz,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "tags" text[] DEFAULT '{}' NOT NULL,
  "teamId" text,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Opportunity_tags_elem_not_null_aecbe9e2" CHECK (array_position("tags", NULL) IS NULL)
);

-- table.OpportunityEvent
CREATE TABLE "public"."OpportunityEvent" (
  "authorId" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "data" json,
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "opportunityId" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.PaymentAllocation
CREATE TABLE "public"."PaymentAllocation" (
  "amount" numeric NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "paymentId" text NOT NULL,
  "targetId" text NOT NULL,
  "targetType" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.PaymentAttempt
CREATE TABLE "public"."PaymentAttempt" (
  "amount" numeric,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "externalId" text NOT NULL,
  "id" text NOT NULL,
  "intentId" text NOT NULL,
  "provider" text NOT NULL,
  "result" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.PaymentMethodSetting
CREATE TABLE "public"."PaymentMethodSetting" (
  "active" bool DEFAULT true NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "instructions" text,
  "kind" text DEFAULT 'TRANSFER' NOT NULL,
  "name" text NOT NULL,
  "position" int4 DEFAULT 0 NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

-- table.PriceTier
CREATE TABLE "public"."PriceTier" (
  "id" text NOT NULL,
  "minQty" int4 NOT NULL,
  "price" numeric NOT NULL,
  "priceListId" text NOT NULL,
  "productId" text NOT NULL,
  "tenantId" text NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

-- table.ProductionOrder
CREATE TABLE "public"."ProductionOrder" (
  "assigneeId" text,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "doneAt" timestamptz,
  "id" text NOT NULL,
  "note" text,
  "orderId" text NOT NULL,
  "orderLineId" text NOT NULL,
  "productName" text NOT NULL,
  "quantity" int4 NOT NULL,
  "stage" text DEFAULT 'QUEUED' NOT NULL,
  "startedAt" timestamptz,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.ProviderSettlement
CREATE TABLE "public"."ProviderSettlement" (
  "accounted" bool DEFAULT false NOT NULL,
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "day" text NOT NULL,
  "difference" numeric NOT NULL,
  "externalRef" text NOT NULL,
  "feeEstimated" numeric NOT NULL,
  "feeReal" numeric NOT NULL,
  "gross" numeric NOT NULL,
  "id" text NOT NULL,
  "itemCount" int4 NOT NULL,
  "netReceived" numeric NOT NULL,
  "provider" text NOT NULL,
  "tenantId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.SalesQuote
CREATE TABLE "public"."SalesQuote" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "createdById" text,
  "customerId" text NOT NULL,
  "decidedAt" timestamptz,
  "decidedByName" text,
  "decisionNote" text,
  "depositPct" numeric DEFAULT '50'::numeric NOT NULL,
  "id" text NOT NULL,
  "notes" text,
  "number" int4 NOT NULL,
  "orderId" text,
  "sentAt" timestamptz,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "subtotal" numeric NOT NULL,
  "taxTotal" numeric NOT NULL,
  "tenantId" text NOT NULL,
  "title" text NOT NULL,
  "total" numeric NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  "validUntil" text,
  PRIMARY KEY ("id")
);

-- table.SalesQuoteLine
CREATE TABLE "public"."SalesQuoteLine" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "productId" text NOT NULL,
  "quantity" int4 NOT NULL,
  "quoteId" text NOT NULL,
  "taxRatePct" numeric DEFAULT '0'::numeric NOT NULL,
  "tenantId" text NOT NULL,
  "unitPrice" numeric NOT NULL,
  PRIMARY KEY ("id")
);

-- table.SavedSearch
CREATE TABLE "public"."SavedSearch" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "id" text NOT NULL,
  "isDefault" bool DEFAULT false NOT NULL,
  "name" text NOT NULL,
  "params" json NOT NULL,
  "section" text NOT NULL,
  "tenantId" text NOT NULL,
  "userId" text NOT NULL,
  PRIMARY KEY ("id")
);

-- table.WhatsappNotice
CREATE TABLE "public"."WhatsappNotice" (
  "createdAt" timestamptz DEFAULT (now()) NOT NULL,
  "customerId" text NOT NULL,
  "event" text NOT NULL,
  "id" text NOT NULL,
  "messageId" text,
  "processedAt" timestamptz,
  "reason" text,
  "sourceId" text,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "templateKey" text NOT NULL,
  "tenantId" text NOT NULL,
  "variables" json NOT NULL,
  PRIMARY KEY ("id")
);

-- column.public.Customer.consentAt
ALTER TABLE "public"."Customer" ADD COLUMN "consentAt" timestamptz;

-- column.public.Customer.optOutAt
ALTER TABLE "public"."Customer" ADD COLUMN "optOutAt" timestamptz;

-- column.public.Customer.ownerId
ALTER TABLE "public"."Customer" ADD COLUMN "ownerId" text;

-- column.public.Customer.phoneNorm
ALTER TABLE "public"."Customer" ADD COLUMN "phoneNorm" text;

-- column.public.Customer.priceListId
ALTER TABLE "public"."Customer" ADD COLUMN "priceListId" text;

-- column.public.Customer.source
ALTER TABLE "public"."Customer" ADD COLUMN "source" text;

-- column.public.Customer.stage
ALTER TABLE "public"."Customer" ADD COLUMN "stage" text DEFAULT 'CUSTOMER' NOT NULL;

-- column.public.Party.contactEmail
ALTER TABLE "public"."Party" ADD COLUMN "contactEmail" text;

-- column.public.Party.contactName
ALTER TABLE "public"."Party" ADD COLUMN "contactName" text;

-- column.public.Party.contactPhone
ALTER TABLE "public"."Party" ADD COLUMN "contactPhone" text;

-- column.public.Party.region
ALTER TABLE "public"."Party" ADD COLUMN "region" text;

-- column.public.Party.taxResponsibility
ALTER TABLE "public"."Party" ADD COLUMN "taxResponsibility" text;

-- column.public.PaymentIntent.feeEstimated
ALTER TABLE "public"."PaymentIntent" ADD COLUMN "feeEstimated" numeric;

-- column.public.PaymentIntent.financialAccountId
ALTER TABLE "public"."PaymentIntent" ADD COLUMN "financialAccountId" text;

-- column.public.PaymentIntent.netExpected
ALTER TABLE "public"."PaymentIntent" ADD COLUMN "netExpected" numeric;

-- column.public.PaymentIntent.proofAt
ALTER TABLE "public"."PaymentIntent" ADD COLUMN "proofAt" timestamptz;

-- column.public.PaymentIntent.proofNote
ALTER TABLE "public"."PaymentIntent" ADD COLUMN "proofNote" text;

-- column.public.PaymentIntent.rejectionReason
ALTER TABLE "public"."PaymentIntent" ADD COLUMN "rejectionReason" text;

-- column.public.PaymentIntent.settlementId
ALTER TABLE "public"."PaymentIntent" ADD COLUMN "settlementId" text;

-- column.public.StoreOrder.channel
ALTER TABLE "public"."StoreOrder" ADD COLUMN "channel" text DEFAULT 'WEB' NOT NULL;

-- column.public.StoreOrder.customerId
ALTER TABLE "public"."StoreOrder" ADD COLUMN "customerId" text;

-- column.public.StoreOrder.externalId
ALTER TABLE "public"."StoreOrder" ADD COLUMN "externalId" text;

-- column.public.StoreOrder.quoteId
ALTER TABLE "public"."StoreOrder" ADD COLUMN "quoteId" text;

-- unique.BankStatementLine.BankStatementLine_tenantId_fingerprint_key
ALTER TABLE "public"."BankStatementLine" ADD CONSTRAINT "BankStatementLine_tenantId_fingerprint_key" UNIQUE ("tenantId", "fingerprint");

-- unique.BusinessConversation.BusinessConversation_tenantId_channel_contactHandle_key
ALTER TABLE "public"."BusinessConversation" ADD CONSTRAINT "BusinessConversation_tenantId_channel_contactHandle_key" UNIQUE ("tenantId", "channel", "contactHandle");

-- unique.BusinessMessage.BusinessMessage_tenantId_externalId_key
ALTER TABLE "public"."BusinessMessage" ADD CONSTRAINT "BusinessMessage_tenantId_externalId_key" UNIQUE ("tenantId", "externalId");

-- unique.CrmTag.CrmTag_tenantId_name_key
ALTER TABLE "public"."CrmTag" ADD CONSTRAINT "CrmTag_tenantId_name_key" UNIQUE ("tenantId", "name");

-- unique.CustomerGroup.CustomerGroup_tenantId_name_key
ALTER TABLE "public"."CustomerGroup" ADD CONSTRAINT "CustomerGroup_tenantId_name_key" UNIQUE ("tenantId", "name");

-- unique.CustomerGroupMember.CustomerGroupMember_groupId_customerId_key
ALTER TABLE "public"."CustomerGroupMember" ADD CONSTRAINT "CustomerGroupMember_groupId_customerId_key" UNIQUE ("groupId", "customerId");

-- unique.Deliverable.Deliverable_reviewTokenHash_key
ALTER TABLE "public"."Deliverable" ADD CONSTRAINT "Deliverable_reviewTokenHash_key" UNIQUE ("reviewTokenHash");

-- unique.Delivery.Delivery_orderId_key
ALTER TABLE "public"."Delivery" ADD CONSTRAINT "Delivery_orderId_key" UNIQUE ("orderId");

-- unique.FinancialAccount.FinancialAccount_tenantId_kind_name_key
ALTER TABLE "public"."FinancialAccount" ADD CONSTRAINT "FinancialAccount_tenantId_kind_name_key" UNIQUE ("tenantId", "kind", "name");

-- unique.LeadForm.LeadForm_publicKey_key
ALTER TABLE "public"."LeadForm" ADD CONSTRAINT "LeadForm_publicKey_key" UNIQUE ("publicKey");

-- unique.MessageTemplate.MessageTemplate_tenantId_key_key
ALTER TABLE "public"."MessageTemplate" ADD CONSTRAINT "MessageTemplate_tenantId_key_key" UNIQUE ("tenantId", "key");

-- unique.Obligation.Obligation_tenantId_originType_originId_key
ALTER TABLE "public"."Obligation" ADD CONSTRAINT "Obligation_tenantId_originType_originId_key" UNIQUE ("tenantId", "originType", "originId");

-- unique.Opportunity.Opportunity_tenantId_leadId_key
ALTER TABLE "public"."Opportunity" ADD CONSTRAINT "Opportunity_tenantId_leadId_key" UNIQUE ("tenantId", "leadId");

-- unique.PaymentAttempt.PaymentAttempt_tenantId_intentId_externalId_key
ALTER TABLE "public"."PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_tenantId_intentId_externalId_key" UNIQUE ("tenantId", "intentId", "externalId");

-- unique.PaymentMethodSetting.PaymentMethodSetting_tenantId_name_key
ALTER TABLE "public"."PaymentMethodSetting" ADD CONSTRAINT "PaymentMethodSetting_tenantId_name_key" UNIQUE ("tenantId", "name");

-- unique.PriceTier.PriceTier_priceListId_productId_minQty_key
ALTER TABLE "public"."PriceTier" ADD CONSTRAINT "PriceTier_priceListId_productId_minQty_key" UNIQUE ("priceListId", "productId", "minQty");

-- unique.ProductionOrder.ProductionOrder_tenantId_orderLineId_key
ALTER TABLE "public"."ProductionOrder" ADD CONSTRAINT "ProductionOrder_tenantId_orderLineId_key" UNIQUE ("tenantId", "orderLineId");

-- unique.ProviderSettlement.ProviderSettlement_tenantId_provider_externalRef_key
ALTER TABLE "public"."ProviderSettlement" ADD CONSTRAINT "ProviderSettlement_tenantId_provider_externalRef_key" UNIQUE ("tenantId", "provider", "externalRef");

-- unique.SalesQuote.SalesQuote_tenantId_number_key
ALTER TABLE "public"."SalesQuote" ADD CONSTRAINT "SalesQuote_tenantId_number_key" UNIQUE ("tenantId", "number");

-- unique.StoreOrder.StoreOrder_tenantId_channel_externalId_key
ALTER TABLE "public"."StoreOrder" ADD CONSTRAINT "StoreOrder_tenantId_channel_externalId_key" UNIQUE ("tenantId", "channel", "externalId");

-- unique.WhatsappNotice.WhatsappNotice_tenantId_event_sourceId_key
ALTER TABLE "public"."WhatsappNotice" ADD CONSTRAINT "WhatsappNotice_tenantId_event_sourceId_key" UNIQUE ("tenantId", "event", "sourceId");

-- index.Attachment.Attachment_tenantId_idx_c93ed4f1
CREATE INDEX "Attachment_tenantId_idx_c93ed4f1" ON "public"."Attachment" ("tenantId");

-- index.Attendance.Attendance_tenantId_idx_c93ed4f1
CREATE INDEX "Attendance_tenantId_idx_c93ed4f1" ON "public"."Attendance" ("tenantId");

-- index.BankStatementLine.BankStatementLine_tenantId_idx_c93ed4f1
CREATE INDEX "BankStatementLine_tenantId_idx_c93ed4f1" ON "public"."BankStatementLine" ("tenantId");

-- index.BankStatementLine.BankStatementLine_tenantId_status_day_idx_0d0f6919
CREATE INDEX "BankStatementLine_tenantId_status_day_idx_0d0f6919" ON "public"."BankStatementLine" ("tenantId", "status", "day");

-- index.BusinessConversation.BusinessConversation_tenantId_customerId_idx_302ad259
CREATE INDEX "BusinessConversation_tenantId_customerId_idx_302ad259" ON "public"."BusinessConversation" ("tenantId", "customerId");

-- index.BusinessConversation.BusinessConversation_tenantId_idx_c93ed4f1
CREATE INDEX "BusinessConversation_tenantId_idx_c93ed4f1" ON "public"."BusinessConversation" ("tenantId");

-- index.BusinessConversation.BusinessConversation_tenantId_status_lastMessageAt_idx_bee5e13b
CREATE INDEX "BusinessConversation_tenantId_status_lastMessageAt_idx_bee5e13b" ON "public"."BusinessConversation" ("tenantId", "status", "lastMessageAt");

-- index.BusinessMessage.BusinessMessage_conversationId_idx_669215a6
CREATE INDEX "BusinessMessage_conversationId_idx_669215a6" ON "public"."BusinessMessage" ("conversationId");

-- index.BusinessMessage.BusinessMessage_tenantId_conversationId_createdAt_idx_3e214dca
CREATE INDEX "BusinessMessage_tenantId_conversationId_createdAt_idx_3e214dca" ON "public"."BusinessMessage" ("tenantId", "conversationId", "createdAt");

-- index.BusinessMessage.BusinessMessage_tenantId_idx_c93ed4f1
CREATE INDEX "BusinessMessage_tenantId_idx_c93ed4f1" ON "public"."BusinessMessage" ("tenantId");

-- index.CashMovement.CashMovement_tenantId_idx_c93ed4f1
CREATE INDEX "CashMovement_tenantId_idx_c93ed4f1" ON "public"."CashMovement" ("tenantId");

-- index.CashSession.CashSession_tenantId_idx_c93ed4f1
CREATE INDEX "CashSession_tenantId_idx_c93ed4f1" ON "public"."CashSession" ("tenantId");

-- index.CrmLostReason.CrmLostReason_tenantId_idx_c93ed4f1
CREATE INDEX "CrmLostReason_tenantId_idx_c93ed4f1" ON "public"."CrmLostReason" ("tenantId");

-- index.CrmStage.CrmStage_tenantId_idx_c93ed4f1
CREATE INDEX "CrmStage_tenantId_idx_c93ed4f1" ON "public"."CrmStage" ("tenantId");

-- index.CrmStage.CrmStage_tenantId_position_idx_2c85c5ec
CREATE INDEX "CrmStage_tenantId_position_idx_2c85c5ec" ON "public"."CrmStage" ("tenantId", "position");

-- index.CrmTag.CrmTag_tenantId_idx_c93ed4f1
CREATE INDEX "CrmTag_tenantId_idx_c93ed4f1" ON "public"."CrmTag" ("tenantId");

-- index.CrmTeam.CrmTeam_tenantId_idx_c93ed4f1
CREATE INDEX "CrmTeam_tenantId_idx_c93ed4f1" ON "public"."CrmTeam" ("tenantId");

-- index.Customer.Customer_tenantId_accessCode_key_ef9862d0
CREATE UNIQUE INDEX "Customer_tenantId_accessCode_key_ef9862d0" ON "public"."Customer" ("tenantId", "accessCode") WHERE ("accessCode" IS NOT NULL);

-- index.Customer.Customer_tenantId_nfcUid_key_4a0896f1
CREATE UNIQUE INDEX "Customer_tenantId_nfcUid_key_4a0896f1" ON "public"."Customer" ("tenantId", "nfcUid") WHERE ("nfcUid" IS NOT NULL);

-- index.Customer.Customer_tenantId_phoneNorm_idx_8e50ed71
CREATE INDEX "Customer_tenantId_phoneNorm_idx_8e50ed71" ON "public"."Customer" ("tenantId", "phoneNorm");

-- index.CustomerGroup.CustomerGroup_tenantId_idx_c93ed4f1
CREATE INDEX "CustomerGroup_tenantId_idx_c93ed4f1" ON "public"."CustomerGroup" ("tenantId");

-- index.CustomerGroupMember.CustomerGroupMember_customerId_idx_b2a8a46c
CREATE INDEX "CustomerGroupMember_customerId_idx_b2a8a46c" ON "public"."CustomerGroupMember" ("customerId");

-- index.CustomerGroupMember.CustomerGroupMember_groupId_idx_e2fb5578
CREATE INDEX "CustomerGroupMember_groupId_idx_e2fb5578" ON "public"."CustomerGroupMember" ("groupId");

-- index.CustomerGroupMember.CustomerGroupMember_tenantId_customerId_idx_302ad259
CREATE INDEX "CustomerGroupMember_tenantId_customerId_idx_302ad259" ON "public"."CustomerGroupMember" ("tenantId", "customerId");

-- index.CustomerGroupMember.CustomerGroupMember_tenantId_idx_c93ed4f1
CREATE INDEX "CustomerGroupMember_tenantId_idx_c93ed4f1" ON "public"."CustomerGroupMember" ("tenantId");

-- index.Deliverable.Deliverable_tenantId_idx_c93ed4f1
CREATE INDEX "Deliverable_tenantId_idx_c93ed4f1" ON "public"."Deliverable" ("tenantId");

-- index.Deliverable.Deliverable_tenantId_projectId_idx_e88197e4
CREATE INDEX "Deliverable_tenantId_projectId_idx_e88197e4" ON "public"."Deliverable" ("tenantId", "projectId");

-- index.Deliverable.Deliverable_tenantId_status_idx_d3d04256
CREATE INDEX "Deliverable_tenantId_status_idx_d3d04256" ON "public"."Deliverable" ("tenantId", "status");

-- index.Delivery.Delivery_tenantId_idx_c93ed4f1
CREATE INDEX "Delivery_tenantId_idx_c93ed4f1" ON "public"."Delivery" ("tenantId");

-- index.Delivery.Delivery_tenantId_scheduledFor_idx_c01a0bda
CREATE INDEX "Delivery_tenantId_scheduledFor_idx_c01a0bda" ON "public"."Delivery" ("tenantId", "scheduledFor");

-- index.Departure.Departure_tenantId_idx_c93ed4f1
CREATE INDEX "Departure_tenantId_idx_c93ed4f1" ON "public"."Departure" ("tenantId");

-- index.FinancialAccount.FinancialAccount_tenantId_idx_c93ed4f1
CREATE INDEX "FinancialAccount_tenantId_idx_c93ed4f1" ON "public"."FinancialAccount" ("tenantId");

-- index.FinancialAccount.FinancialAccount_tenantId_kind_idx_1e76dd5c
CREATE INDEX "FinancialAccount_tenantId_kind_idx_1e76dd5c" ON "public"."FinancialAccount" ("tenantId", "kind");

-- index.Lead.Lead_tenantId_idx_c93ed4f1
CREATE INDEX "Lead_tenantId_idx_c93ed4f1" ON "public"."Lead" ("tenantId");

-- index.LeadForm.LeadForm_tenantId_idx_c93ed4f1
CREATE INDEX "LeadForm_tenantId_idx_c93ed4f1" ON "public"."LeadForm" ("tenantId");

-- index.MessageTemplate.MessageTemplate_tenantId_event_idx_a78823f0
CREATE INDEX "MessageTemplate_tenantId_event_idx_a78823f0" ON "public"."MessageTemplate" ("tenantId", "event");

-- index.MessageTemplate.MessageTemplate_tenantId_idx_c93ed4f1
CREATE INDEX "MessageTemplate_tenantId_idx_c93ed4f1" ON "public"."MessageTemplate" ("tenantId");

-- index.Obligation.Obligation_tenantId_idx_c93ed4f1
CREATE INDEX "Obligation_tenantId_idx_c93ed4f1" ON "public"."Obligation" ("tenantId");

-- index.Obligation.Obligation_tenantId_status_dueDate_idx_8121dcd9
CREATE INDEX "Obligation_tenantId_status_dueDate_idx_8121dcd9" ON "public"."Obligation" ("tenantId", "status", "dueDate");

-- index.Opportunity.Opportunity_tenantId_customerId_idx_302ad259
CREATE INDEX "Opportunity_tenantId_customerId_idx_302ad259" ON "public"."Opportunity" ("tenantId", "customerId");

-- index.Opportunity.Opportunity_tenantId_idx_c93ed4f1
CREATE INDEX "Opportunity_tenantId_idx_c93ed4f1" ON "public"."Opportunity" ("tenantId");

-- index.Opportunity.Opportunity_tenantId_status_stage_idx_824e523e
CREATE INDEX "Opportunity_tenantId_status_stage_idx_824e523e" ON "public"."Opportunity" ("tenantId", "status", "stage");

-- index.OpportunityEvent.OpportunityEvent_tenantId_idx_c93ed4f1
CREATE INDEX "OpportunityEvent_tenantId_idx_c93ed4f1" ON "public"."OpportunityEvent" ("tenantId");

-- index.OpportunityEvent.OpportunityEvent_tenantId_opportunityId_createdAt_idx_ba6e9aa1
CREATE INDEX "OpportunityEvent_tenantId_opportunityId_createdAt_idx_ba6e9aa1" ON "public"."OpportunityEvent" ("tenantId", "opportunityId", "createdAt");

-- index.PaymentAllocation.PaymentAllocation_tenantId_idx_c93ed4f1
CREATE INDEX "PaymentAllocation_tenantId_idx_c93ed4f1" ON "public"."PaymentAllocation" ("tenantId");

-- index.PaymentAllocation.PaymentAllocation_tenantId_paymentId_idx_5dee2bd2
CREATE INDEX "PaymentAllocation_tenantId_paymentId_idx_5dee2bd2" ON "public"."PaymentAllocation" ("tenantId", "paymentId");

-- index.PaymentAllocation.PaymentAllocation_tenantId_targetType_targetId_idx_aa5024a9
CREATE INDEX "PaymentAllocation_tenantId_targetType_targetId_idx_aa5024a9" ON "public"."PaymentAllocation" ("tenantId", "targetType", "targetId");

-- index.PaymentAttempt.PaymentAttempt_tenantId_idx_c93ed4f1
CREATE INDEX "PaymentAttempt_tenantId_idx_c93ed4f1" ON "public"."PaymentAttempt" ("tenantId");

-- index.PaymentAttempt.PaymentAttempt_tenantId_intentId_idx_78c4c2b6
CREATE INDEX "PaymentAttempt_tenantId_intentId_idx_78c4c2b6" ON "public"."PaymentAttempt" ("tenantId", "intentId");

-- index.PaymentMethodSetting.PaymentMethodSetting_tenantId_idx_c93ed4f1
CREATE INDEX "PaymentMethodSetting_tenantId_idx_c93ed4f1" ON "public"."PaymentMethodSetting" ("tenantId");

-- index.PriceTier.PriceTier_priceListId_idx_43057e0f
CREATE INDEX "PriceTier_priceListId_idx_43057e0f" ON "public"."PriceTier" ("priceListId");

-- index.PriceTier.PriceTier_productId_idx_5858600a
CREATE INDEX "PriceTier_productId_idx_5858600a" ON "public"."PriceTier" ("productId");

-- index.PriceTier.PriceTier_tenantId_idx_c93ed4f1
CREATE INDEX "PriceTier_tenantId_idx_c93ed4f1" ON "public"."PriceTier" ("tenantId");

-- index.Product.Product_tenantId_idx_c93ed4f1
CREATE INDEX "Product_tenantId_idx_c93ed4f1" ON "public"."Product" ("tenantId");

-- index.ProductionOrder.ProductionOrder_orderId_idx_d284871b
CREATE INDEX "ProductionOrder_orderId_idx_d284871b" ON "public"."ProductionOrder" ("orderId");

-- index.ProductionOrder.ProductionOrder_tenantId_idx_c93ed4f1
CREATE INDEX "ProductionOrder_tenantId_idx_c93ed4f1" ON "public"."ProductionOrder" ("tenantId");

-- index.ProductionOrder.ProductionOrder_tenantId_orderId_idx_095ca8c4
CREATE INDEX "ProductionOrder_tenantId_orderId_idx_095ca8c4" ON "public"."ProductionOrder" ("tenantId", "orderId");

-- index.ProductionOrder.ProductionOrder_tenantId_stage_createdAt_idx_99f08344
CREATE INDEX "ProductionOrder_tenantId_stage_createdAt_idx_99f08344" ON "public"."ProductionOrder" ("tenantId", "stage", "createdAt");

-- index.ProviderSettlement.ProviderSettlement_tenantId_createdAt_idx_88162366
CREATE INDEX "ProviderSettlement_tenantId_createdAt_idx_88162366" ON "public"."ProviderSettlement" ("tenantId", "createdAt");

-- index.ProviderSettlement.ProviderSettlement_tenantId_idx_c93ed4f1
CREATE INDEX "ProviderSettlement_tenantId_idx_c93ed4f1" ON "public"."ProviderSettlement" ("tenantId");

-- index.SalesQuote.SalesQuote_tenantId_customerId_idx_302ad259
CREATE INDEX "SalesQuote_tenantId_customerId_idx_302ad259" ON "public"."SalesQuote" ("tenantId", "customerId");

-- index.SalesQuote.SalesQuote_tenantId_idx_c93ed4f1
CREATE INDEX "SalesQuote_tenantId_idx_c93ed4f1" ON "public"."SalesQuote" ("tenantId");

-- index.SalesQuote.SalesQuote_tenantId_status_idx_d3d04256
CREATE INDEX "SalesQuote_tenantId_status_idx_d3d04256" ON "public"."SalesQuote" ("tenantId", "status");

-- index.SalesQuoteLine.SalesQuoteLine_quoteId_idx_a7628ce5
CREATE INDEX "SalesQuoteLine_quoteId_idx_a7628ce5" ON "public"."SalesQuoteLine" ("quoteId");

-- index.SalesQuoteLine.SalesQuoteLine_tenantId_idx_c93ed4f1
CREATE INDEX "SalesQuoteLine_tenantId_idx_c93ed4f1" ON "public"."SalesQuoteLine" ("tenantId");

-- index.SavedSearch.SavedSearch_tenantId_idx_c93ed4f1
CREATE INDEX "SavedSearch_tenantId_idx_c93ed4f1" ON "public"."SavedSearch" ("tenantId");

-- index.SavedSearch.SavedSearch_tenantId_userId_section_idx_61107353
CREATE INDEX "SavedSearch_tenantId_userId_section_idx_61107353" ON "public"."SavedSearch" ("tenantId", "userId", "section");

-- index.StockMovement.StockMovement_tenantId_idx_c93ed4f1
CREATE INDEX "StockMovement_tenantId_idx_c93ed4f1" ON "public"."StockMovement" ("tenantId");

-- index.TicketSale.TicketSale_tenantId_idx_c93ed4f1
CREATE INDEX "TicketSale_tenantId_idx_c93ed4f1" ON "public"."TicketSale" ("tenantId");

-- index.TourBooking.TourBooking_tenantId_idx_c93ed4f1
CREATE INDEX "TourBooking_tenantId_idx_c93ed4f1" ON "public"."TourBooking" ("tenantId");

-- index.WhatsappNotice.WhatsappNotice_tenantId_customerId_idx_302ad259
CREATE INDEX "WhatsappNotice_tenantId_customerId_idx_302ad259" ON "public"."WhatsappNotice" ("tenantId", "customerId");

-- index.WhatsappNotice.WhatsappNotice_tenantId_idx_c93ed4f1
CREATE INDEX "WhatsappNotice_tenantId_idx_c93ed4f1" ON "public"."WhatsappNotice" ("tenantId");

-- index.WhatsappNotice.WhatsappNotice_tenantId_status_createdAt_idx_c3c853c4
CREATE INDEX "WhatsappNotice_tenantId_status_createdAt_idx_c3c853c4" ON "public"."WhatsappNotice" ("tenantId", "status", "createdAt");

-- foreignKey.BankStatementLine.BankStatementLine_tenantId_fkey
ALTER TABLE "public"."BankStatementLine"
ADD CONSTRAINT "BankStatementLine_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.BusinessConversation.BusinessConversation_tenantId_fkey
ALTER TABLE "public"."BusinessConversation"
ADD CONSTRAINT "BusinessConversation_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.BusinessMessage.BusinessMessage_tenantId_fkey
ALTER TABLE "public"."BusinessMessage"
ADD CONSTRAINT "BusinessMessage_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.BusinessMessage.BusinessMessage_conversationId_fkey
ALTER TABLE "public"."BusinessMessage"
ADD CONSTRAINT "BusinessMessage_conversationId_fkey"
FOREIGN KEY ("conversationId")
REFERENCES "public"."BusinessConversation" ("id")
ON DELETE CASCADE;

-- foreignKey.CrmLostReason.CrmLostReason_tenantId_fkey
ALTER TABLE "public"."CrmLostReason"
ADD CONSTRAINT "CrmLostReason_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.CrmStage.CrmStage_tenantId_fkey
ALTER TABLE "public"."CrmStage"
ADD CONSTRAINT "CrmStage_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.CrmTag.CrmTag_tenantId_fkey
ALTER TABLE "public"."CrmTag"
ADD CONSTRAINT "CrmTag_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.CrmTeam.CrmTeam_tenantId_fkey
ALTER TABLE "public"."CrmTeam"
ADD CONSTRAINT "CrmTeam_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.CustomerGroup.CustomerGroup_tenantId_fkey
ALTER TABLE "public"."CustomerGroup"
ADD CONSTRAINT "CustomerGroup_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.CustomerGroupMember.CustomerGroupMember_tenantId_fkey
ALTER TABLE "public"."CustomerGroupMember"
ADD CONSTRAINT "CustomerGroupMember_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.CustomerGroupMember.CustomerGroupMember_groupId_fkey
ALTER TABLE "public"."CustomerGroupMember"
ADD CONSTRAINT "CustomerGroupMember_groupId_fkey"
FOREIGN KEY ("groupId")
REFERENCES "public"."CustomerGroup" ("id")
ON DELETE CASCADE;

-- foreignKey.CustomerGroupMember.CustomerGroupMember_customerId_fkey
ALTER TABLE "public"."CustomerGroupMember"
ADD CONSTRAINT "CustomerGroupMember_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "public"."Customer" ("id")
ON DELETE CASCADE;

-- foreignKey.Deliverable.Deliverable_tenantId_fkey
ALTER TABLE "public"."Deliverable"
ADD CONSTRAINT "Deliverable_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.Delivery.Delivery_tenantId_fkey
ALTER TABLE "public"."Delivery"
ADD CONSTRAINT "Delivery_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.Delivery.Delivery_orderId_fkey
ALTER TABLE "public"."Delivery"
ADD CONSTRAINT "Delivery_orderId_fkey"
FOREIGN KEY ("orderId")
REFERENCES "public"."StoreOrder" ("id")
ON DELETE CASCADE;

-- foreignKey.FinancialAccount.FinancialAccount_tenantId_fkey
ALTER TABLE "public"."FinancialAccount"
ADD CONSTRAINT "FinancialAccount_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.LeadForm.LeadForm_tenantId_fkey
ALTER TABLE "public"."LeadForm"
ADD CONSTRAINT "LeadForm_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.MessageTemplate.MessageTemplate_tenantId_fkey
ALTER TABLE "public"."MessageTemplate"
ADD CONSTRAINT "MessageTemplate_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.Obligation.Obligation_tenantId_fkey
ALTER TABLE "public"."Obligation"
ADD CONSTRAINT "Obligation_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.Opportunity.Opportunity_tenantId_fkey
ALTER TABLE "public"."Opportunity"
ADD CONSTRAINT "Opportunity_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.OpportunityEvent.OpportunityEvent_tenantId_fkey
ALTER TABLE "public"."OpportunityEvent"
ADD CONSTRAINT "OpportunityEvent_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.PaymentAllocation.PaymentAllocation_tenantId_fkey
ALTER TABLE "public"."PaymentAllocation"
ADD CONSTRAINT "PaymentAllocation_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.PaymentAttempt.PaymentAttempt_tenantId_fkey
ALTER TABLE "public"."PaymentAttempt"
ADD CONSTRAINT "PaymentAttempt_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.PaymentMethodSetting.PaymentMethodSetting_tenantId_fkey
ALTER TABLE "public"."PaymentMethodSetting"
ADD CONSTRAINT "PaymentMethodSetting_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.PriceTier.PriceTier_tenantId_fkey
ALTER TABLE "public"."PriceTier"
ADD CONSTRAINT "PriceTier_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.PriceTier.PriceTier_priceListId_fkey
ALTER TABLE "public"."PriceTier"
ADD CONSTRAINT "PriceTier_priceListId_fkey"
FOREIGN KEY ("priceListId")
REFERENCES "public"."PriceList" ("id")
ON DELETE CASCADE;

-- foreignKey.PriceTier.PriceTier_productId_fkey
ALTER TABLE "public"."PriceTier"
ADD CONSTRAINT "PriceTier_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "public"."Product" ("id")
ON DELETE CASCADE;

-- foreignKey.ProductionOrder.ProductionOrder_tenantId_fkey
ALTER TABLE "public"."ProductionOrder"
ADD CONSTRAINT "ProductionOrder_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.ProductionOrder.ProductionOrder_orderId_fkey
ALTER TABLE "public"."ProductionOrder"
ADD CONSTRAINT "ProductionOrder_orderId_fkey"
FOREIGN KEY ("orderId")
REFERENCES "public"."StoreOrder" ("id")
ON DELETE CASCADE;

-- foreignKey.ProviderSettlement.ProviderSettlement_tenantId_fkey
ALTER TABLE "public"."ProviderSettlement"
ADD CONSTRAINT "ProviderSettlement_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.SalesQuote.SalesQuote_tenantId_fkey
ALTER TABLE "public"."SalesQuote"
ADD CONSTRAINT "SalesQuote_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.SalesQuoteLine.SalesQuoteLine_tenantId_fkey
ALTER TABLE "public"."SalesQuoteLine"
ADD CONSTRAINT "SalesQuoteLine_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.SalesQuoteLine.SalesQuoteLine_quoteId_fkey
ALTER TABLE "public"."SalesQuoteLine"
ADD CONSTRAINT "SalesQuoteLine_quoteId_fkey"
FOREIGN KEY ("quoteId")
REFERENCES "public"."SalesQuote" ("id")
ON DELETE CASCADE;

-- foreignKey.SavedSearch.SavedSearch_tenantId_fkey
ALTER TABLE "public"."SavedSearch"
ADD CONSTRAINT "SavedSearch_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.Attachment.Attachment_tenantId_fkey
ALTER TABLE "public"."Attachment"
ADD CONSTRAINT "Attachment_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- Preserve 12 pre-existing orphan rows; enforce new writes and defer legacy validation.
-- foreignKey.Attendance.Attendance_tenantId_fkey
ALTER TABLE "public"."Attendance"
ADD CONSTRAINT "Attendance_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE NOT VALID;

-- foreignKey.BenefitRedemption.BenefitRedemption_tenantId_fkey
ALTER TABLE "public"."BenefitRedemption"
ADD CONSTRAINT "BenefitRedemption_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- Preserve 10 pre-existing orphan rows; enforce new writes and defer legacy validation.
-- foreignKey.Booking.Booking_tenantId_fkey
ALTER TABLE "public"."Booking"
ADD CONSTRAINT "Booking_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE NOT VALID;

-- foreignKey.CashBox.CashBox_tenantId_fkey
ALTER TABLE "public"."CashBox"
ADD CONSTRAINT "CashBox_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.CashMovement.CashMovement_tenantId_fkey
ALTER TABLE "public"."CashMovement"
ADD CONSTRAINT "CashMovement_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.CashSession.CashSession_tenantId_fkey
ALTER TABLE "public"."CashSession"
ADD CONSTRAINT "CashSession_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.Charge.Charge_tenantId_fkey
ALTER TABLE "public"."Charge"
ADD CONSTRAINT "Charge_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.Departure.Departure_tenantId_fkey
ALTER TABLE "public"."Departure"
ADD CONSTRAINT "Departure_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- Preserve 7 pre-existing orphan rows; enforce new writes and defer legacy validation.
-- foreignKey.InboxConversation.InboxConversation_tenantId_fkey
ALTER TABLE "public"."InboxConversation"
ADD CONSTRAINT "InboxConversation_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE NOT VALID;

-- foreignKey.Invoice.Invoice_tenantId_fkey
ALTER TABLE "public"."Invoice"
ADD CONSTRAINT "Invoice_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.Lead.Lead_tenantId_fkey
ALTER TABLE "public"."Lead"
ADD CONSTRAINT "Lead_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.Product.Product_tenantId_fkey
ALTER TABLE "public"."Product"
ADD CONSTRAINT "Product_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.SatisfactionSurvey.SatisfactionSurvey_tenantId_fkey
ALTER TABLE "public"."SatisfactionSurvey"
ADD CONSTRAINT "SatisfactionSurvey_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.StockMovement.StockMovement_tenantId_fkey
ALTER TABLE "public"."StockMovement"
ADD CONSTRAINT "StockMovement_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.Subscription.Subscription_tenantId_fkey
ALTER TABLE "public"."Subscription"
ADD CONSTRAINT "Subscription_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- Preserve 4 pre-existing orphan rows; enforce new writes and defer legacy validation.
-- foreignKey.SupportTicket.SupportTicket_tenantId_fkey
ALTER TABLE "public"."SupportTicket"
ADD CONSTRAINT "SupportTicket_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE NOT VALID;

-- foreignKey.TenantContact.TenantContact_tenantId_fkey
ALTER TABLE "public"."TenantContact"
ADD CONSTRAINT "TenantContact_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.TenantInvite.TenantInvite_tenantId_fkey
ALTER TABLE "public"."TenantInvite"
ADD CONSTRAINT "TenantInvite_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.TicketSale.TicketSale_tenantId_fkey
ALTER TABLE "public"."TicketSale"
ADD CONSTRAINT "TicketSale_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.TourBooking.TourBooking_tenantId_fkey
ALTER TABLE "public"."TourBooking"
ADD CONSTRAINT "TourBooking_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- foreignKey.WhatsappNotice.WhatsappNotice_tenantId_fkey
ALTER TABLE "public"."WhatsappNotice"
ADD CONSTRAINT "WhatsappNotice_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "public"."Tenant" ("id")
ON DELETE CASCADE;

-- rowLevelSecurity.public.ApuActivity
ALTER TABLE "public"."ApuActivity" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ApuActivityComposition
ALTER TABLE "public"."ApuActivityComposition" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ApuChapter
ALTER TABLE "public"."ApuChapter" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ApuImage
ALTER TABLE "public"."ApuImage" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ApuImportRun
ALTER TABLE "public"."ApuImportRun" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ApuItem
ALTER TABLE "public"."ApuItem" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ApuItemPriceHistory
ALTER TABLE "public"."ApuItemPriceHistory" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Attachment
ALTER TABLE "public"."Attachment" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Attendance
ALTER TABLE "public"."Attendance" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.AuditLog
ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BankStatementLine
ALTER TABLE "public"."BankStatementLine" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BenefitCode
ALTER TABLE "public"."BenefitCode" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BenefitRedemption
ALTER TABLE "public"."BenefitRedemption" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BillingPolicy
ALTER TABLE "public"."BillingPolicy" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Booking
ALTER TABLE "public"."Booking" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BudgetBaseline
ALTER TABLE "public"."BudgetBaseline" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BudgetChapter
ALTER TABLE "public"."BudgetChapter" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BudgetItem
ALTER TABLE "public"."BudgetItem" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BudgetItemProgress
ALTER TABLE "public"."BudgetItemProgress" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BudgetItemResource
ALTER TABLE "public"."BudgetItemResource" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BudgetLockEvent
ALTER TABLE "public"."BudgetLockEvent" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BusinessConversation
ALTER TABLE "public"."BusinessConversation" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.BusinessMessage
ALTER TABLE "public"."BusinessMessage" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.CashBox
ALTER TABLE "public"."CashBox" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.CashMovement
ALTER TABLE "public"."CashMovement" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.CashSession
ALTER TABLE "public"."CashSession" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Charge
ALTER TABLE "public"."Charge" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ChargeEvidence
ALTER TABLE "public"."ChargeEvidence" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.CrmLostReason
ALTER TABLE "public"."CrmLostReason" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.CrmStage
ALTER TABLE "public"."CrmStage" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.CrmTag
ALTER TABLE "public"."CrmTag" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.CrmTeam
ALTER TABLE "public"."CrmTeam" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Customer
ALTER TABLE "public"."Customer" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.CustomerGroup
ALTER TABLE "public"."CustomerGroup" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.CustomerGroupMember
ALTER TABLE "public"."CustomerGroupMember" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.CustomerNote
ALTER TABLE "public"."CustomerNote" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.CustomerTierSetting
ALTER TABLE "public"."CustomerTierSetting" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Deliverable
ALTER TABLE "public"."Deliverable" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Delivery
ALTER TABLE "public"."Delivery" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Departure
ALTER TABLE "public"."Departure" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.DismissedNotification
ALTER TABLE "public"."DismissedNotification" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Expense
ALTER TABLE "public"."Expense" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.FieldLog
ALTER TABLE "public"."FieldLog" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.FieldLogEntry
ALTER TABLE "public"."FieldLogEntry" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.FinancialAccount
ALTER TABLE "public"."FinancialAccount" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.InboxConversation
ALTER TABLE "public"."InboxConversation" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.InboxMessage
ALTER TABLE "public"."InboxMessage" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Invoice
ALTER TABLE "public"."Invoice" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.InvoiceLine
ALTER TABLE "public"."InvoiceLine" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Lead
ALTER TABLE "public"."Lead" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.LeadActivity
ALTER TABLE "public"."LeadActivity" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.LeadForm
ALTER TABLE "public"."LeadForm" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.LookaheadTask
ALTER TABLE "public"."LookaheadTask" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Membership
ALTER TABLE "public"."Membership" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.MessageTemplate
ALTER TABLE "public"."MessageTemplate" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ModuleSetting
ALTER TABLE "public"."ModuleSetting" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Obligation
ALTER TABLE "public"."Obligation" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Opportunity
ALTER TABLE "public"."Opportunity" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.OpportunityEvent
ALTER TABLE "public"."OpportunityEvent" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Payment
ALTER TABLE "public"."Payment" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.PaymentAllocation
ALTER TABLE "public"."PaymentAllocation" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.PaymentAttempt
ALTER TABLE "public"."PaymentAttempt" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.PaymentMethodSetting
ALTER TABLE "public"."PaymentMethodSetting" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.PlanSetting
ALTER TABLE "public"."PlanSetting" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.PresenceRequest
ALTER TABLE "public"."PresenceRequest" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.PresenceScan
ALTER TABLE "public"."PresenceScan" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.PriceTier
ALTER TABLE "public"."PriceTier" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Product
ALTER TABLE "public"."Product" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ProductionOrder
ALTER TABLE "public"."ProductionOrder" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Project
ALTER TABLE "public"."Project" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ProjectBudget
ALTER TABLE "public"."ProjectBudget" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ProjectFollowUp
ALTER TABLE "public"."ProjectFollowUp" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ProjectHeader
ALTER TABLE "public"."ProjectHeader" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ProjectPlan
ALTER TABLE "public"."ProjectPlan" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.ProviderSettlement
ALTER TABLE "public"."ProviderSettlement" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Quote
ALTER TABLE "public"."Quote" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.QuoteItem
ALTER TABLE "public"."QuoteItem" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.SalesQuote
ALTER TABLE "public"."SalesQuote" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.SalesQuoteLine
ALTER TABLE "public"."SalesQuoteLine" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.SatisfactionSurvey
ALTER TABLE "public"."SatisfactionSurvey" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.SavedSearch
ALTER TABLE "public"."SavedSearch" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.StaffInvite
ALTER TABLE "public"."StaffInvite" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.StaffMember
ALTER TABLE "public"."StaffMember" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.StaffRole
ALTER TABLE "public"."StaffRole" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.StockMovement
ALTER TABLE "public"."StockMovement" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Subscription
ALTER TABLE "public"."Subscription" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.SupportTicket
ALTER TABLE "public"."SupportTicket" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.Tenant
ALTER TABLE "public"."Tenant" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.TenantContact
ALTER TABLE "public"."TenantContact" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.TenantInvite
ALTER TABLE "public"."TenantInvite" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.TenantModule
ALTER TABLE "public"."TenantModule" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.TicketMessage
ALTER TABLE "public"."TicketMessage" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.TicketSale
ALTER TABLE "public"."TicketSale" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.TourBooking
ALTER TABLE "public"."TourBooking" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.User
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.VerticalSetting
ALTER TABLE "public"."VerticalSetting" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.WeeklyCommitment
ALTER TABLE "public"."WeeklyCommitment" ENABLE ROW LEVEL SECURITY;

-- rowLevelSecurity.public.WhatsappNotice
ALTER TABLE "public"."WhatsappNotice" ENABLE ROW LEVEL SECURITY;

COMMIT;
