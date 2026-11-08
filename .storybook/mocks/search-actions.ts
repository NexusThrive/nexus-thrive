/** Búsqueda avanzada, grupos de clientes y favoritos en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

export async function customerFilterCountsAction() { await wait(); return { activos: 5, archivados: 0, "cita-proxima": 1, saldo: 2, "sin-visitas-90": 0, personas: 4, empresas: 1, "este-mes": 5 } as Record<string, number>; }
export async function crmFilterCountsAction() { await wait(); return { "mis-oportunidades": 6, "sin-responsable": 2, todas: 11, "actividad-vencida": 3, ganadas: 1, "cierre-este-mes": 4 } as Record<string, number>; }

export async function createGroupAction(_s: string, name: string) { await wait(); return name.trim().toLowerCase() === "vip" ? { ok: false as const, message: "Ya tienes un grupo con ese nombre." } : { ok: true as const, id: "g-nuevo" }; }
export async function updateGroupAction() { await wait(); return { ok: true as const }; }
export async function deleteGroupAction() { await wait(); return { ok: true as const }; }
export async function assignGroupAction() { await wait(); return { ok: true as const }; }

export async function saveSearchAction() { await wait(); return { ok: true as const, id: "f-nuevo" }; }
export async function renameSearchAction() { await wait(); return { ok: true as const }; }
export async function deleteSearchAction() { await wait(); return { ok: true as const }; }
export async function setDefaultSearchAction() { await wait(); return { ok: true as const }; }
