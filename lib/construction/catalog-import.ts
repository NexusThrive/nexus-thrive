import { db } from "@/prisma/db";
import type { ApuItemCategoryValue } from "@/lib/construction/apu-engine";

/** Fila ya validada del CSV de insumos. */
export type ApuItemImportRow = {
  code: string | null;
  name: string;
  unit: string;
  category: string;
  unitPrice: string;
};

/**
 * Carga de insumos del catálogo APU en una sola transacción: si una fila
 * falla, no se aplica ninguna. Con código: actualiza el insumo de ese código
 * en el negocio o lo crea; sin código, siempre crea (NULL no choca con el
 * índice único parcial). Todo filtra por `tenantId`. Un código repetido
 * lanza la violación de unicidad para que la acción lo explique.
 */
export async function importApuItems(tenantId: string, rows: readonly ApuItemImportRow[]) {
  return db.transaction(async (tx) => {
    let created = 0;
    let updated = 0;
    for (const row of rows) {
      const values = {
        name: row.name,
        unit: row.unit,
        category: row.category as ApuItemCategoryValue,
        unitPrice: row.unitPrice,
      };
      const found = row.code ? await tx.orm.public.ApuItem.where({ tenantId, code: row.code }).first() : null;
      if (found) {
        await tx.orm.public.ApuItem.where({ id: found.id, tenantId }).update(values);
        updated += 1;
      } else {
        await tx.orm.public.ApuItem.create({ tenantId, code: row.code || null, ...values });
        created += 1;
      }
    }
    return { created, updated };
  });
}
