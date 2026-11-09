/** Configuración del CRM en Storybook: respuestas de muestra, sin servidor ni base. */
const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const ok = async (message: string) => (await wait(), { ok: true as const, message });
export const createStageAction = async () => ok("Etapa creada");
export const setStageOrderAction = async () => ok("Orden guardado");
export const updateStageAction = async () => ok("Etapa guardada");
export const moveStageOrderAction = async () => ok("Orden guardado");
export const deleteStageAction = async () => ok("Etapa eliminada");
export const addReasonAction = async () => ok("Motivo agregado");
export const renameReasonAction = async () => ok("Motivo guardado");
export const deleteReasonAction = async () => ok("Motivo eliminado");
export const addTagAction = async () => ok("Etiqueta agregada");
export const deleteTagAction = async () => ok("Etiqueta quitada de la lista");
export const saveTeamAction = async () => ok("Equipo guardado");
export const deleteTeamAction = async () => ok("Equipo eliminado");
