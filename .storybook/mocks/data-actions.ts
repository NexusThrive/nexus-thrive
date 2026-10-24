/** Importar y exportar en Storybook: informes de muestra según el nombre del archivo, sin servidor ni base. */
import type { ImportKind, ImportReport } from "@/lib/data-exchange/exchange-db";

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

function sample(kind: ImportKind, fileName: string, dryRun: boolean): ImportReport {
  const clean = /limpio/i.test(fileName);
  return {
    kind,
    dryRun,
    total: clean ? 40 : 52,
    created: clean ? 30 : 38,
    updated: clean ? 4 : 6,
    unchanged: clean ? 6 : 5,
    missingColumns: [],
    errors: clean ? [] : [{ line: 7, message: "Precio inválido: «barato»." }, { line: 19, message: "El SKU «A-10» está repetido (ya aparece en la fila 4)." }, { line: 33, message: "Correo inválido: «ana@».", }],
  };
}

export async function previewImportAction(_slug: string, kind: ImportKind, formData: FormData) {
  await wait();
  const file = formData.get("file") as File;
  if (/malo/i.test(file.name)) return { ok: false as const, message: "Al archivo le falta la columna Nombre y Precio. Descarga la plantilla para ver cómo va." };
  return { ok: true as const, report: sample(kind, file.name, true) };
}
export async function commitImportAction(_slug: string, kind: ImportKind, formData: FormData) {
  await wait();
  const file = formData.get("file") as File;
  return { ok: true as const, report: sample(kind, file.name, false) };
}
