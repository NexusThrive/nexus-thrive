/** Catálogo (productos, categorías y atributos) en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

// Formulario de producto
export async function saveProductFormAction(_s: string, id: string | null, form: FormData) {
  await wait();
  const draft = JSON.parse(String(form.get("draft") ?? "{}")) as { name?: string; price?: number | null };
  if (draft.name === "Error") return { ok: false as const, message: "Revisa los campos marcados.", errors: { name: "Escribe otro nombre." } };
  return { ok: true as const, id: id ?? "p-nuevo", message: id ? "Cambios guardados" : "Producto creado" };
}

// Categorías
export async function saveCategoryAction(_s: string, input: { id?: string; name: string }) {
  await wait();
  return input.name.trim().toLowerCase() === "ropa" ? { ok: false as const, message: "Ya existe una categoría con ese nombre en este lugar." } : { ok: true as const, id: input.id ?? "c-nueva", message: input.id ? "Categoría actualizada" : "Categoría creada" };
}
export async function deleteCategoryAction() { await wait(); return { ok: true as const, message: "Categoría eliminada" }; }
export async function reorderCategoriesAction() { await wait(); return { ok: true as const }; }
export async function assignCategoryAction() { await wait(); return { ok: true as const, message: "2 productos actualizados" }; }

// Atributos
export async function saveAttributeAction(_s: string, input: { id?: string }) { await wait(); return { ok: true as const, message: input.id ? "Atributo actualizado" : "Atributo creado" }; }
export async function deleteAttributeAction() { await wait(); return { ok: true as const, message: "Atributo eliminado" }; }

// Detalle del producto (movimientos y venta rápida)
export async function moveStockAction() { await wait(); return { ok: true as const, message: "Movimiento registrado" }; }
export async function sellProductAction() { await wait(); return { ok: true as const, message: "Venta registrada", receipt: "R-000001" }; }
export async function stockHistoryAction() { await wait(); return [] as { id: string; kind: "IN" | "OUT" | "ADJUST"; quantity: number; note: string | null; createdAt: string }[]; }

// Listas de precios
export async function createPriceListAction(_s: string, name: string) { await wait(); return name.trim().toLowerCase() === "detal" ? { ok: false as const, message: "Ya existe una lista con ese nombre." } : { ok: true as const, id: "l-nueva" }; }
export async function renamePriceListAction() { await wait(); return { ok: true as const }; }
export async function setPriceListActiveAction() { await wait(); return { ok: true as const }; }
export async function makeDefaultPriceListAction() { await wait(); return { ok: true as const }; }
export async function deletePriceListAction() { await wait(); return { ok: true as const }; }
export async function savePriceListPricesAction(_s: string, _id: string, prices: unknown[]) { await wait(); return { ok: true as const, saved: prices.length }; }
