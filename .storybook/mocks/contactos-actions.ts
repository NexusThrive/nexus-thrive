/** Acciones de Contactos en Storybook: respuestas de muestra, sin servidor ni base. */
export type CustomerActionResult = { ok: boolean; message?: string; deleted?: number };
const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
export async function archiveCustomerAction(_slug: string, _id: string): Promise<CustomerActionResult> { await wait(); return { ok: true, message: "Cliente archivado" }; }
export async function restoreCustomerAction(_slug: string, _id: string): Promise<CustomerActionResult> { await wait(); return { ok: true, message: "Cliente restaurado" }; }
export async function deleteCustomersAction(_slug: string, ids: string[]): Promise<CustomerActionResult> { await wait(); return { ok: true, message: "Eliminados", deleted: ids.length }; }
