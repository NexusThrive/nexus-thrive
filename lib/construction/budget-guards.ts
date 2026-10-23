/**
 * Guardas de "guardado sin cambios" del presupuesto y del proyecto (Etapa 1).
 *
 * Un formulario reenviado con los mismos valores no debe escribir ni avanzar
 * la `revision` del presupuesto: la revisión es el token de concurrencia
 * optimista y no puede moverse "en el aire".
 *
 * Módulo puro a propósito: sin imports de base de datos, para poder cubrirlo
 * con pruebas unitarias sin conexión.
 */

export type ChapterSnapshot = { name: string; description: string | null };
export type ChapterPatch = { name: string; description?: string | null };

export type ItemSnapshot = {
  code: string;
  description: string;
  unit: string;
  quantity: unknown;
  unitCostDirect: unknown;
};
export type ItemPatch = {
  code: string;
  description: string;
  unit: string;
  quantity: bigint;
  unitCostDirect: bigint;
};

export type AiuSnapshot = {
  aiuAdminPct: bigint;
  aiuImprevPct: bigint;
  aiuUtilidadPct: bigint;
  ivaUtilidadPct: bigint;
};
export type AiuPatch = {
  adminPct: bigint;
  imprevPct: bigint;
  utilidadPct: bigint;
  ivaUtilidadPct: bigint;
};

/** Decimal del driver (micro, entero) → bigint. `null` si no es exacto. */
export function microToBigIntExact(value: unknown): bigint | null {
  const trimmed = String(value ?? "").trim();
  // `BigInt("")` devuelve 0n: un valor vacío no es un micro exacto.
  if (trimmed === "") {
    return null;
  }
  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

/** ¿El capítulo ya tiene exactamente el nombre y la descripción pedidos? */
export function isUnchangedChapter(
  chapter: ChapterSnapshot,
  input: ChapterPatch,
): boolean {
  return (
    chapter.name === input.name &&
    (chapter.description ?? null) === (input.description ?? null)
  );
}

/** ¿La partida ya tiene exactamente los valores pedidos (micro incluido)? */
export function isUnchangedItem(
  item: ItemSnapshot,
  input: ItemPatch,
): boolean {
  const quantity = microToBigIntExact(item.quantity);
  const unitCost = microToBigIntExact(item.unitCostDirect);
  return (
    item.code === input.code &&
    item.description === input.description &&
    item.unit === input.unit &&
    quantity !== null &&
    unitCost !== null &&
    quantity === input.quantity &&
    unitCost === input.unitCostDirect
  );
}

/** ¿La configuración AIU ya tiene exactamente los porcentajes pedidos? */
export function isUnchangedAiu(
  budget: AiuSnapshot,
  config: AiuPatch,
): boolean {
  return (
    budget.aiuAdminPct === config.adminPct &&
    budget.aiuImprevPct === config.imprevPct &&
    budget.aiuUtilidadPct === config.utilidadPct &&
    budget.ivaUtilidadPct === config.ivaUtilidadPct
  );
}
