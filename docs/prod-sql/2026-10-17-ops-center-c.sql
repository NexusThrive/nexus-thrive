-- Fase C · Operations Center: CRM comercial (leads y actividad) y Soporte (tickets y mensajes).
-- Aditivo. Producción no tiene el registro de migraciones de Prisma (prisma_contract):
-- se aplica con psql -1 (una transacción) o en el SQL Editor de Supabase, DESPUÉS de las fases A y B.
-- Generado con `prisma db update --dry-run` contra una copia del esquema de producción.
-- Se omiten los "DISABLE ROW LEVEL SECURITY": RLS sigue activo.

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

-- Las tablas nuevas quedan con RLS activo, como el resto (el servidor usa el rol propietario).
ALTER TABLE "public"."Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LeadActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TicketMessage" ENABLE ROW LEVEL SECURITY;
