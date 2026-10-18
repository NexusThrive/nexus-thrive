-- =====================================================================
-- NEXUS THRIVE · LIMPIEZA TOTAL DE LA BASE DE DATOS
-- Deja como único administrador global (Propietario del Operations Center):
--   Santiago Castellar Garcia <santiagocastellar201022@gmail.com>
--
-- ⚠️  IRREVERSIBLE. Borra TODOS los negocios, usuarios, clientes, cobros,
--     obras, presupuestos, catálogos APU, fotos, leads, tickets, suscripciones,
--     comprobantes, conversaciones y la auditoría. Haz un respaldo antes
--     (Supabase → Database → Backups) si existe la mínima duda.
--
-- Requisito: haber ejecutado antes 2026-10-17-ops-center-completo.sql
-- (crea las tablas del Operations Center). Si faltan, este script se
-- detiene sin borrar nada.
--
-- Qué NO toca:
--   · Usuarios y organizaciones de Clerk (se gestionan en el panel de Clerk).
--   · Archivos en Vercel Blob.
--   · Esquemas de Supabase distintos de "public" (auth, storage…).
--   · La estructura de las tablas ni RLS: solo vacía datos.
--
-- Después: entra a /sign-in con santiagocastellar201022@gmail.com. Al primer
-- ingreso la sesión de Clerk se vincula sola a este administrador (por correo)
-- y los catálogos (planes, módulos, rubros, tramos, política de cobro) y los
-- roles base se vuelven a crear con sus valores iniciales.
-- =====================================================================

BEGIN;

-- 1) Verificación: deben existir todas las tablas de NEXUS. Si falta una,
--    se aborta todo (no se borra nada).
DO $$
DECLARE
  t text;
  missing text[] := '{}';
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Tenant','TenantModule','User','Customer','Payment','Expense','Membership','CustomerNote',
    'ApuItem','ApuImage','ApuChapter','ApuImportRun','ApuItemPriceHistory','ApuActivity','ApuActivityComposition',
    'Booking','Quote','QuoteItem','ProjectFollowUp','AuditLog','Project','ProjectHeader','ProjectBudget',
    'BudgetChapter','BudgetItem','BudgetItemResource','BudgetItemProgress','BudgetBaseline','BudgetLockEvent',
    'ProjectPlan','LookaheadTask','WeeklyCommitment','FieldLog','FieldLogEntry',
    'StaffRole','StaffMember','TenantContact','PlanSetting','ModuleSetting','VerticalSetting','CustomerTierSetting',
    'Lead','LeadActivity','SupportTicket','TicketMessage','Subscription','Charge','ChargeEvidence','BillingPolicy',
    'InboxConversation','InboxMessage','SatisfactionSurvey'
  ] LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      missing := missing || t;
    END IF;
  END LOOP;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'Faltan tablas (%). Ejecuta primero 2026-10-17-ops-center-completo.sql. No se borró nada.', array_to_string(missing, ', ');
  END IF;
END $$;

-- 2) Vaciar todo (una sola sentencia: respeta las llaves foráneas entre ellas).
TRUNCATE TABLE
  "public"."TenantModule", "public"."User", "public"."Customer", "public"."Payment", "public"."Expense",
  "public"."Membership", "public"."CustomerNote",
  "public"."ApuItem", "public"."ApuImage", "public"."ApuChapter", "public"."ApuImportRun",
  "public"."ApuItemPriceHistory", "public"."ApuActivity", "public"."ApuActivityComposition",
  "public"."Booking", "public"."Quote", "public"."QuoteItem", "public"."ProjectFollowUp", "public"."AuditLog",
  "public"."Project", "public"."ProjectHeader", "public"."ProjectBudget", "public"."BudgetChapter",
  "public"."BudgetItem", "public"."BudgetItemResource", "public"."BudgetItemProgress", "public"."BudgetBaseline",
  "public"."BudgetLockEvent", "public"."ProjectPlan", "public"."LookaheadTask", "public"."WeeklyCommitment",
  "public"."FieldLog", "public"."FieldLogEntry",
  "public"."StaffMember", "public"."StaffRole", "public"."TenantContact",
  "public"."PlanSetting", "public"."ModuleSetting", "public"."VerticalSetting", "public"."CustomerTierSetting",
  "public"."Lead", "public"."LeadActivity", "public"."SupportTicket", "public"."TicketMessage",
  "public"."Subscription", "public"."Charge", "public"."ChargeEvidence", "public"."BillingPolicy",
  "public"."InboxConversation", "public"."InboxMessage", "public"."SatisfactionSurvey",
  "public"."Tenant"
RESTART IDENTITY CASCADE;

-- 3) Rol Propietario (todos los permisos) y el administrador global.
--    Sin clerkUserId: se vincula solo en su primer ingreso, por el correo.
WITH owner AS (
  INSERT INTO "public"."StaffRole" ("id", "key", "name", "description", "permissions", "system", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'owner',
    'Propietario',
    'Acceso total al Operations Center. No se puede quedar sin al menos un Propietario.',
    ARRAY[
      'leads.view','leads.edit','leads.assign','proposals.view',
      'accounts.view','accounts.edit','accounts.create','accounts.modules','accounts.suspend','accounts.impersonate',
      'billing.view','billing.record','billing.refund','pricing.edit',
      'tickets.view','tickets.reply','tickets.escalate','diagnostics.view',
      'team.invite','team.roles','team.permissions','audit.view','catalog.edit'
    ]::text[],
    true,
    now(),
    now()
  )
  RETURNING "id"
)
INSERT INTO "public"."StaffMember" ("id", "clerkUserId", "email", "name", "title", "roleId", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, NULL, 'santiagocastellar201022@gmail.com', 'Santiago Castellar Garcia', 'Fundador', owner."id", true, now(), now()
FROM owner;

-- 4) Comprobación final: un solo integrante, Propietario y activo; todo lo demás vacío.
DO $$
DECLARE
  n_staff int;
  n_tenants int;
  n_users int;
BEGIN
  SELECT count(*) INTO n_staff FROM "public"."StaffMember" m JOIN "public"."StaffRole" r ON r."id" = m."roleId"
   WHERE m."email" = 'santiagocastellar201022@gmail.com' AND r."key" = 'owner' AND m."active";
  SELECT count(*) INTO n_tenants FROM "public"."Tenant";
  SELECT count(*) INTO n_users FROM "public"."User";
  IF n_staff <> 1 OR (SELECT count(*) FROM "public"."StaffMember") <> 1 OR n_tenants <> 0 OR n_users <> 0 THEN
    RAISE EXCEPTION 'Comprobación fallida (staff=%, negocios=%, usuarios=%). Se deshace todo.', n_staff, n_tenants, n_users;
  END IF;
  RAISE NOTICE 'Listo: base vacía y Santiago Castellar Garcia como Propietario.';
END $$;

COMMIT;
