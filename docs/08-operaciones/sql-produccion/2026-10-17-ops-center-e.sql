-- Fase E · Operations Center: bandeja (WhatsApp y correo), encuestas de satisfacción.
-- (La salud de cuenta se calcula; no necesita tablas.)
-- Aditivo. Producción no tiene el registro de migraciones de Prisma (prisma_contract):
-- se aplica con psql -1 (una transacción) o en el SQL Editor de Supabase, DESPUÉS de las fases A, B, C y D.
-- Generado con `prisma db update --dry-run` contra una copia del esquema de producción.
-- Se omiten los "DISABLE ROW LEVEL SECURITY": RLS sigue activo.

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

-- Las tablas nuevas quedan con RLS activo, como el resto (el servidor usa el rol propietario).
ALTER TABLE "public"."InboxConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InboxMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SatisfactionSurvey" ENABLE ROW LEVEL SECURITY;
