/** Caja menor de Finanzas en Storybook: respuestas de muestra, sin servidor ni base. */
const ok = async (message = "Listo") => ({ ok: true as const, message });

export const saveCashBoxAction = async () => ok("Caja guardada");
export const openCashAction = async () => ok("Turno abierto");
export const cashMovementAction = async () => ok("Movimiento registrado");
export const closeCashAction = async () => ok("Turno cerrado");
