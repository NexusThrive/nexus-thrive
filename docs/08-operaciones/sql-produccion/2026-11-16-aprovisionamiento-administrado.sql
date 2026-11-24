-- Apply before deployment; existing tenant data and memberships remain unchanged.
-- From a9b88b713550292f7a53606a717fc3f12e1ba425706df226c51113aaf3443f67
-- to aa3535fad47d3ed4395c026ce67d9fbaaecae4118e20153ab85d2fec3036fdb4.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "TenantInvite" WHERE "acceptedAt" IS NULL AND "revokedAt" IS NULL
    GROUP BY "tenantId", email HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Resolve duplicate pending invitations before migrating';
  END IF;
END $$;
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "managedProvisioning" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ownerEmail" text,
  ADD COLUMN IF NOT EXISTS "activatedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "provisioningKey" text,
  ADD COLUMN IF NOT EXISTS "provisioningRequestHash" text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Tenant_provisioningKey_key' AND conrelid = '"Tenant"'::regclass) THEN
    ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_provisioningKey_key" UNIQUE ("provisioningKey");
  END IF;
END $$;
ALTER TABLE "TenantInvite"
  ADD COLUMN IF NOT EXISTS "deliveryStatus" text NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "deliveryAttempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deliveryLeaseToken" text,
  ADD COLUMN IF NOT EXISTS "deliveryLeaseUntil" timestamptz,
  ADD COLUMN IF NOT EXISTS "deliveryNextAttemptAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "deliveryProviderId" text,
  ADD COLUMN IF NOT EXISTS "deliveryError" text,
  ADD COLUMN IF NOT EXISTS "deliveredAt" timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_invite_pending_ea0c48f6"
  ON "TenantInvite" ("tenantId", email)
  WHERE "acceptedAt" IS NULL AND "revokedAt" IS NULL;
COMMIT;
-- Verify the live schema and marker before signing or deploying the contract.
