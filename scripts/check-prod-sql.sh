#!/usr/bin/env bash
# ============================================================================
# Regla de oro: si cambia el modelo de datos, tiene que haber SQL de
# producción en el mismo cambio.
#
# Por qué muerde: Vercel despliega main solo. Si la app nueva lee una tabla o
# una columna que todavía no existe en Supabase, se cae en producción. El SQL
# se corre a mano (SQL Editor de Supabase), así que la app se despliega antes
# de que la base esté lista.
#
# Uso:
#   bash scripts/check-prod-sql.sh [ref-base]
#
#   ref-base: contra qué se compara. Por defecto:
#     - origin/main, si existe (uso normal en un PR);
#     - el último tag, si no (publicación de una versión).
#
# Salida: 0 si todo bien; 1 con el motivo si falta el SQL.
# ============================================================================
set -euo pipefail

CONTRACT="prisma/contract.prisma"
SQL_DIR="docs/prod-sql"

BASE="${1:-}"
if [ -z "$BASE" ]; then
  if git rev-parse --verify origin/main > /dev/null 2>&1; then
    BASE="origin/main"
  elif git describe --tags --abbrev=0 > /dev/null 2>&1; then
    BASE="$(git describe --tags --abbrev=0)"
  else
    echo "Sin base de comparación: no hay origin/main ni tags. Se omite la comprobación."
    exit 0
  fi
fi

if ! git rev-parse --verify "$BASE" > /dev/null 2>&1; then
  echo "No se encuentra la ref '$BASE'. Se omite la comprobación."
  exit 0
fi

changed_files() {
  git diff --name-only "$BASE"...HEAD -- "$@" 2>/dev/null || true
}

if [ -z "$(changed_files "$CONTRACT")" ]; then
  # No cambió el modelo de datos: no hace falta SQL.
  exit 0
fi

new_sql="$(changed_files "$SQL_DIR" | grep '\.sql$' || true)"

if [ -z "$new_sql" ]; then
  cat >&2 <<EOF
ERROR: cambió el modelo de datos ($CONTRACT) pero no hay ningún SQL nuevo en $SQL_DIR/.

La app se despliega sola (Vercel toma main), pero el SQL de producción se
corre a mano en Supabase. Sin ese SQL, la versión se cae en producción.

Qué hacer:
  1) Escribe el SQL en $SQL_DIR/ (aditivo e idempotente: que se pueda correr
     dos veces sin romper nada).
  2) Anótalo en $SQL_DIR/00-ORDEN.md.
  3) Corre el SQL en el SQL Editor de Supabase ANTES de que alguien use la
     función nueva.
EOF
  exit 1
fi

echo "Modelo de datos cambiado y SQL de producción presente:"
echo "$new_sql" | sed 's/^/  - /'
