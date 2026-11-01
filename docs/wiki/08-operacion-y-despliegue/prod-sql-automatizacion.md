# Migrar producción sin copiar y pegar

`scripts/migrate-prod.sh` hace, en orden y sobre **una** base que tú indicas:

1. muestra las migraciones pendientes,
2. respalda la base (`pg_dump` → `backups/`),
3. aplica las migraciones (`prisma db migrate`),
4. corre los scripts de **datos** idempotentes de `scripts/prod-data.txt`,
5. verifica que la base coincida con el contrato (`prisma db verify`).

Nunca lee `.env`: la URL va siempre explícita y pide escribir `APLICAR` antes de tocar nada.

## Desde tu máquina
```bash
export PROD_DATABASE_URL="postgresql://postgres:…@db.<proyecto>.supabase.co:5432/postgres"   # conexión DIRECTA, no el pooler
bash scripts/migrate-prod.sh --dry-run   # solo muestra lo pendiente
bash scripts/migrate-prod.sh             # aplica (pide confirmación)
```
Requiere `psql` y `pg_dump` instalados. `--no-backup` omite el respaldo (no recomendado).

## Con un clic (GitHub Actions)
Copia `docs/ci/migrar-produccion.yml` a `.github/workflows/` y crea el entorno `production` con revisor y el secreto `PROD_DATABASE_URL` (instrucciones en el archivo). Ejecuta «Migrar producción»: primero en modo de solo lectura, y después sin él; el revisor aprueba antes de que corra y el respaldo queda como artefacto 7 días.

## Reglas
- Cuando agregues una migración de esquema **no** hace falta crear un `.sql` a mano para producción: `db migrate` la aplica. Los `.sql` de esta carpeta son historial y una vía manual.
- Si necesitas rellenar o corregir datos, escribe un script **idempotente** y agrégalo al final de `scripts/prod-data.txt`.
- Los cambios de esquema son aditivos: corre el script **antes** de desplegar el código.
