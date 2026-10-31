# Importación CSV — evidencias (límite, duplicados, vista previa, no sobrescribir precios)

## 1) CSV simple (ItemsBank) — `app/[tenant]/(app)/quotes/_components/items-bank.tsx`

- `parseImportCsv`:
  - Lee líneas, ignora vacías.
  - Validadores: `code` (opcional pero único si presente), `name` requerido, `unit` requerido (mapeado a `APU_UNITS`), `category` requerido (`MATERIAL|MANO_DE_OBRA|EQUIPO|TRANSPORTE`), `unitPrice` numérico >=0, `imageUrl` opcional https.
  - **Duplicados por código**: al parsear, detecta códigos repetidos en el archivo → devuelve error con mensaje indicando fila duplicada.
  - **Límite de tamaño**: en UI no hay hard-limit explícito en el código simple; se procesa lo cargado. (Ver apu-importer avanzado para límite real.)
- **Vista previa antes de escribir**: ItemsBank muestra tabla de errores/resultado del parseo antes de enviar a server action `importItemsCsvAction`. No se escribe hasta confirmar.
- **No sobrescribe precios en silencio**: `importItemsCsvAction` hace upsert por código (si existe, actualiza campos). La política actual: actualiza `name, category, unit, unitPrice, imageUrl, active` según datos importados. Se documenta aquí como comportamiento existente; Etapa 3 revisará política "no sobrescribir precios en silencio" (podría requerir flag `--force-price` o preservar si vacío). Por ahora se registra comportamiento actual.

## 2) Importador avanzado (apu-importer) — `lib/apu-importer/*`, `app/[tenant]/(app)/quotes/import/*` (be1d010)

Archivos relevantes:
- `lib/apu-importer/parser.ts`, `mapper.ts`, `normalizer.ts`, `validator.ts`, `types.ts`, `index.ts`
- `app/[tenant]/(app)/quotes/import/actions.ts` (`executeImport` transaccional)

Comportamiento observado:
- Parser normaliza encabezados, soporta formatos comunes.
- Validator aplica reglas por fila (requeridos, tipos, enums).
- **Duplicados**: detecta conflictos dentro del archivo (mismo código) y marca errores.
- **Tamaño**: no se ve límite explícito hardcoded en archivos leídos; procesamiento en memoria. Recomendado documentar límite (p.ej. 10k filas) si aplica.
- **Vista previa**: UI `import-workspace.tsx`, `mapping-editor.tsx` permiten mapear columnas, revisar filas válidas/erróneas antes de ejecutar `executeImport`.
- **Transaccional**: `executeImport` corre dentro de transacción (`tx`) para upsert atómico.
- **Política precios**: por defecto upsert actualiza campos; no hay protección explícita "no sobrescribir precios en silencio" visible. Se marcará para revisión en Etapa 3 (puntualizar regla).

## 3) apuImporterStatus (PASO 2.6)

Actualmente `getCatalogHealthReport.apuImporterStatus = { recentFiles: 0, lastImport: null }` (placeholder). Se sustituirá por evaluación real: contar archivos recientes bajo `app/[tenant]/(app)/quotes/import` / estado de ejecución, o leer logs si existen. Punto 3 de Etapa 3 solicita reemplazo por evaluación real.
