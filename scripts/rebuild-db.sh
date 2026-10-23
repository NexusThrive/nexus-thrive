#!/usr/bin/env bash
# ============================================================================
# Reconstruye una base desde cero con las migraciones de Prisma (la fuente
# única del esquema, DATA-03) y deja el equipo del panel listo.
#
#   OWNER_EMAIL=dueno@ejemplo.com bash scripts/rebuild-db.sh
#
# Pide la cadena de conexión sin mostrarla (o la toma de TARGET_DATABASE_URL
# si ya está exportada).
#
# BORRA todas las tablas del esquema public y el marcador de Prisma. Sirve
# para una base sin datos que conservar (desarrollo, pruebas o una producción
# que todavía no tiene clientes reales). Pide escribir el nombre de la base
# antes de borrar.
#
# Después:
#   - La base queda en la última migración (el CI aplica las mismas).
#   - Roles del panel + el Propietario por correo. Se vincula a su cuenta de
#     Clerk la primera vez que entra con ese correo verificado.
#   - El catálogo de planes se siembra solo la primera vez que se lee.
# ============================================================================
set -euo pipefail

: "${OWNER_EMAIL:?Falta OWNER_EMAIL (el correo del Propietario del panel).}"

URL="${TARGET_DATABASE_URL:-}"
if [ -z "$URL" ]; then
  read -rsp "Pega la cadena de conexión de la base (no se ve) y pulsa Enter: " URL
  echo
fi
case "$URL" in
  postgres://*|postgresql://*) ;;
  *) echo "Eso no parece una cadena de conexión (debe empezar por postgresql://). No se tocó nada."; exit 1 ;;
esac
# psql no entiende parámetros de Prisma como ?schema=public.
PSQL_URL="${URL%%\?*}"

DB_NAME="$(psql "$PSQL_URL" -tAc "select current_database()")"
HOST="$(psql "$PSQL_URL" -tAc "select coalesce(inet_server_addr()::text, 'socket local')")"
TABLES="$(psql "$PSQL_URL" -tAc "select count(*) from pg_tables where schemaname = 'public'")"

echo "Base: $DB_NAME ($HOST) · $TABLES tablas en public."
echo "Esto BORRA todas esas tablas y sus datos."
read -rp "Escribe el nombre de la base para confirmar: " answer
if [ "$answer" != "$DB_NAME" ]; then
  echo "No coincide. No se tocó nada."
  exit 1
fi

echo "== Borrando el esquema anterior =="
psql -q -v ON_ERROR_STOP=1 "$PSQL_URL" <<'SQL'
BEGIN;
DROP SCHEMA IF EXISTS prisma_contract CASCADE;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
  FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
           WHERE n.nspname = 'public' AND t.typtype = 'e' LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.typname);
  END LOOP;
END $$;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
COMMIT;
SQL

echo "== Migraciones =="
pnpm exec prisma db migrate --db "$URL" > /dev/null
echo "  aplicadas"

echo "== Equipo del panel =="
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/staff-seed-sql.mjs "$OWNER_EMAIL" | psql -q -v ON_ERROR_STOP=1 "$PSQL_URL"

echo "== Comprobación =="
psql "$PSQL_URL" -tA <<'SQL'
SELECT 'tablas: ' || count(*) || ' · con RLS: ' || count(*) FILTER (WHERE rowsecurity) FROM pg_tables WHERE schemaname = 'public';
SELECT 'roles del panel: ' || count(*) FROM "public"."StaffRole";
SELECT 'propietario: ' || m."email" || ' (' || r."key" || ', ' || array_length(r."permissions", 1) || ' permisos)'
  FROM "public"."StaffMember" m JOIN "public"."StaffRole" r ON r."id" = m."roleId";
SQL
