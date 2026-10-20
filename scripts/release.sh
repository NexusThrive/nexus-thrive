#!/usr/bin/env bash
# ============================================================================
# Publica una versión: verifica las puertas y crea el tag.
#
#   bash scripts/release.sh v1.0.1 "fix(ventas): no deja registrar venta sin fecha"
#
# Qué hace:
#   1. Comprueba que el árbol esté limpio y en main, y que main == origin/main.
#   2. Corre las puertas: tipos, lint, pruebas, build.
#   3. Crea el tag anotado y lo sube.
#
# NO hace push de main (eso es del PR) ni aplica el SQL de producción (eso es
# del SQL Editor de Supabase).
# ============================================================================
set -euo pipefail

VERSION="${1:-}"
MESSAGE="${2:-}"

if [ -z "$VERSION" ] || [ -z "$MESSAGE" ]; then
  echo "Uso: bash scripts/release.sh <v1.0.1> \"<mensaje del tag>\""
  echo "Ejemplo: bash scripts/release.sh v1.0.1 \"fix(ventas): no deja registrar venta sin fecha\""
  exit 1
fi

case "$VERSION" in
  v[0-9]*.[0-9]*.[0-9]*) ;;
  *) echo "La versión debe ser vX.Y.Z (ejemplo: v1.0.1)"; exit 1 ;;
esac

if [ -n "$(git status --porcelain)" ]; then
  echo "El árbol tiene cambios sin commitear. Commitea o stash antes de publicar."
  git status --short
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [ "$BRANCH" != "main" ]; then
  echo "Estás en '$BRANCH'. Las versiones se publican desde main."
  exit 1
fi

git fetch origin main --quiet
LOCAL="$(git rev-parse main)"
REMOTE="$(git rev-parse origin/main)"
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "main no está sincronizada con origin/main. Sube (o baja) los cambios primero."
  exit 1
fi

if git rev-parse "$VERSION" > /dev/null 2>&1; then
  echo "El tag $VERSION ya existe."
  exit 1
fi

# Regla de oro: si cambió el modelo de datos, tiene que haber SQL de
# producción en el mismo cambio (si no, la versión se cae al desplegar).
LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || true)"
if [ -n "$LAST_TAG" ]; then
  echo "== SQL de producción (desde $LAST_TAG) =="
  bash ./scripts/check-prod-sql.sh "$LAST_TAG"
fi

# La versión tiene que estar anotada en el changelog.
if ! grep -q "## \[$VERSION\]" CHANGELOG.md 2>/dev/null; then
  echo "El CHANGELOG.md no tiene la sección '## [$VERSION]'."
  echo "Anótala antes de publicar (ver docs/VERSIONADO.md, sección 7)."
  exit 1
fi

echo "== Puertas de calidad =="
pnpm exec tsc --noEmit
echo "  tipos OK"
pnpm lint
echo "  lint OK"
pnpm test
echo "  pruebas unitarias OK"
pnpm build > /dev/null
echo "  build OK"

if [ -n "${TEST_DATABASE_URL:-}" ]; then
  pnpm test:integration
  echo "  pruebas de integración OK"
else
  echo "  (sin TEST_DATABASE_URL: no se corrieron las pruebas de integración)"
fi

echo "== Tag $VERSION =="
git tag -a "$VERSION" -m "$MESSAGE"
git push origin "$VERSION"
echo "Publicado: $VERSION"

cat <<EOF

Pendiente de hacer a mano (no lo hace este script):
  - Si la versión trae cambios de esquema: correr el SQL nuevo de
    docs/prod-sql/ en Supabase ANTES de que alguien use la función nueva.
  - Anotar la versión en CHANGELOG.md.
  - Verificar en producción (ver docs/VERSIONADO.md, sección 6).
EOF
