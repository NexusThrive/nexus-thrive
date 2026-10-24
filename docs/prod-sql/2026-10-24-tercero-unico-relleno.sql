-- Tercero único · relleno de datos (PR-08). Correr DESPUÉS de 2026-10-24-tercero-unico.sql.
--
-- Crea el tercero (Party) y el rol CUSTOMER de cada cliente que aún no lo tiene.
-- Idempotente: solo toca clientes con "partyId" nulo, así que se puede repetir.
-- No borra ni cambia datos del cliente; solo escribe en Party, PartyRole y
-- Customer."partyId".
--
-- Reglas:
--  * El documento se normaliza (solo letras y números, mayúsculas).
--  * Dos clientes del mismo negocio con el MISMO documento quedan enlazados al
--    MISMO tercero (es la misma persona o empresa repetida; la ficha de cada
--    cliente no se toca).
--  * Cliente sin documento: un tercero propio (su id).

BEGIN;

-- 1) Un tercero por (negocio, documento) que todavía no exista.
INSERT INTO "public"."Party" ("id", "tenantId", "kind", "documentNumber", "legalName", "email", "phone", "city", "active", "updatedAt")
SELECT DISTINCT ON (c."tenantId", d.doc) c."id", c."tenantId", 'PERSON', d.doc, c."name", lower(c."email"), c."phone", c."city", true, now()
FROM "public"."Customer" c
CROSS JOIN LATERAL (SELECT NULLIF(upper(regexp_replace(coalesce(c."documentId", ''), '[^A-Za-z0-9]', '', 'g')), '') AS doc) d
WHERE c."partyId" IS NULL AND d.doc IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "public"."Party" p WHERE p."tenantId" = c."tenantId" AND p."documentNumber" = d.doc)
ORDER BY c."tenantId", d.doc, c."createdAt", c."id"
ON CONFLICT DO NOTHING;

-- 2) Un tercero por cada cliente sin documento (usa el id del cliente).
INSERT INTO "public"."Party" ("id", "tenantId", "kind", "documentNumber", "legalName", "email", "phone", "city", "active", "updatedAt")
SELECT c."id", c."tenantId", 'PERSON', NULL, c."name", lower(c."email"), c."phone", c."city", true, now()
FROM "public"."Customer" c
WHERE c."partyId" IS NULL
  AND NULLIF(upper(regexp_replace(coalesce(c."documentId", ''), '[^A-Za-z0-9]', '', 'g')), '') IS NULL
ON CONFLICT DO NOTHING;

-- 3) Enlazar cada cliente con su tercero.
UPDATE "public"."Customer" c SET "partyId" = p."id"
FROM "public"."Party" p
WHERE c."partyId" IS NULL AND p."tenantId" = c."tenantId"
  AND p."documentNumber" = NULLIF(upper(regexp_replace(coalesce(c."documentId", ''), '[^A-Za-z0-9]', '', 'g')), '');

UPDATE "public"."Customer" c SET "partyId" = c."id"
WHERE c."partyId" IS NULL
  AND NULLIF(upper(regexp_replace(coalesce(c."documentId", ''), '[^A-Za-z0-9]', '', 'g')), '') IS NULL
  AND EXISTS (SELECT 1 FROM "public"."Party" p WHERE p."id" = c."id");

-- 4) Rol CUSTOMER para todo tercero enlazado a un cliente.
INSERT INTO "public"."PartyRole" ("id", "tenantId", "partyId", "role")
SELECT gen_random_uuid()::text, x."tenantId", x."partyId", 'CUSTOMER'
FROM (SELECT DISTINCT "tenantId", "partyId" FROM "public"."Customer" WHERE "partyId" IS NOT NULL) x
ON CONFLICT DO NOTHING;

COMMIT;

-- Verificación (debe dar 0): clientes sin tercero.
-- SELECT count(*) FROM "public"."Customer" WHERE "partyId" IS NULL;
