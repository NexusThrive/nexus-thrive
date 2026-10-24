#!/usr/bin/env bash
# ============================================================================
# Aplica a UNA base de datos todo lo que le falte, en el orden correcto:
#   1. muestra las migraciones pendientes (prisma migration status)
#   2. respalda la base (pg_dump)
#   3. aplica las migraciones (prisma db migrate)
#   4. corre los scripts de DATOS idempotentes de scripts/prod-data.txt
#   5. verifica que la base coincida con el contrato (prisma db verify)
#
# Uso (la URL va SIEMPRE explícita; nunca se lee de .env):
#   PROD_DATABASE_URL="postgresql://…" bash scripts/migrate-prod.sh            # pide confirmación
#   PROD_DATABASE_URL="postgresql://…" bash scripts/migrate-prod.sh --dry-run  # solo muestra lo pendiente
#   PROD_DATABASE_URL="postgresql://…" bash scripts/migrate-prod.sh --yes      # sin preguntar (CI aprobado)
#   …  --no-backup   omite el respaldo (no recomendado)
#
# Usa la conexión DIRECTA de Supabase (puerto 5432), no el pooler de transacciones.
# Nunca borra datos: las migraciones son aditivas y los scripts de datos, idempotentes.
# ============================================================================
set -euo pipefail

URL="${PROD_DATABASE_URL:?Define PROD_DATABASE_URL con la conexión directa de la base a migrar}"
DRY=0; YES=0; BACKUP=1
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --yes) YES=1 ;;
    --no-backup) BACKUP=0 ;;
    *) echo "Opción desconocida: $a"; exit 1 ;;
  esac
done

# Qué base es (sin imprimir la contraseña).
TARGET="$(printf '%s' "$URL" | sed -E 's#^[a-z]+://([^:@/]+)(:[^@]*)?@#\1@#; s#\?.*$##')"
echo "Base de destino: $TARGET"

echo
echo "── 1. Migraciones pendientes ──"
pnpm exec prisma migration status --db "$URL" --json 2>/dev/null | node -e '
  let d = ""; process.stdin.on("data", (c) => (d += c)).on("end", () => {
    try {
      const r = JSON.parse(d.trim().split("\n").pop()).envelope.result;
      const m = r.spaces.flatMap((s) => s.migrations);
      const pending = m.filter((x) => x.status === "pending");
      console.log("Estado:", r.summary, "· aplicadas:", m.filter((x) => x.status === "applied").length, "· pendientes:", pending.length);
      for (const x of pending) console.log("  pendiente →", x.name);
    } catch { console.log("No se pudo leer el estado (¿la base está firmada?). Se seguirá con db migrate."); }
  });
' || true

if [ "$DRY" = 1 ]; then
  echo
  echo "(--dry-run) No se aplicó nada."
  exit 0
fi

if [ "$YES" != 1 ]; then
  echo
  read -r -p "Escribe APLICAR para continuar sobre $TARGET: " ANSWER
  [ "$ANSWER" = "APLICAR" ] || { echo "Cancelado."; exit 1; }
fi

if [ "$BACKUP" = 1 ]; then
  mkdir -p backups
  FILE="backups/respaldo-$(date +%Y%m%d-%H%M%S).dump"
  echo
  echo "── 2. Respaldo → $FILE ──"
  pg_dump "$URL" --format=custom --no-owner --file "$FILE"
fi

echo
echo "── 3. Migraciones ──"
pnpm exec prisma db migrate --db "$URL"

echo
echo "── 4. Datos idempotentes ──"
while IFS= read -r line; do
  line="${line%%#*}"; line="$(echo "$line" | xargs)"
  [ -z "$line" ] && continue
  echo "→ $line"
  psql "$URL" -v ON_ERROR_STOP=1 -q -f "docs/prod-sql/$line"
done < scripts/prod-data.txt

echo
echo "── 5. Verificación ──"
pnpm exec prisma db verify --db "$URL"
echo "Listo."
