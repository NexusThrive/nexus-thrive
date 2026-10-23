#!/usr/bin/env bash
# Ejecuta SQL en Supabase reintentando: el pooler alterna entre backends que
# aceptan y backends que no (por eso falla a ratos).
#   bash scripts/psql-supabase.sh "select 1;"
set -uo pipefail

# La contraseña nunca va en el repositorio: exporta SUPABASE_DB_PASSWORD antes.
export PGPASSWORD="${SUPABASE_DB_PASSWORD:?Exporta SUPABASE_DB_PASSWORD con la contraseña de la base}"
URL="postgresql://postgres.vnwwarudcycqdrthiouk:${PGPASSWORD}@aws-1-ca-central-1.pooler.supabase.com:5432/postgres"

for i in $(seq 1 "${TRIES:-15}"); do
  if OUT="$(psql "$URL" -v ON_ERROR_STOP=1 -t -A -c "$1" 2>/dev/null)"; then
    echo "$OUT"
    exit 0
  fi
  sleep 5
done

echo "No se pudo conectar a Supabase tras ${TRIES:-15} intentos." >&2
exit 1
