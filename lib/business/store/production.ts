/**
 * Producción (HU-produccion-01), reglas puras. Una orden por línea de pedido con tres etapas mínimas. Cuando todas las órdenes
 * de un pedido están terminadas, el pedido pasa a «listo».
 */
export const PRODUCTION_STAGES = ["QUEUED", "IN_PROGRESS", "DONE"] as const;
export type ProductionStage = (typeof PRODUCTION_STAGES)[number];
export const STAGE_TEXT: Record<ProductionStage, string> = { QUEUED: "En cola", IN_PROGRESS: "En curso", DONE: "Terminada" };

const NEXT: Record<ProductionStage, readonly ProductionStage[]> = { QUEUED: ["IN_PROGRESS", "DONE"], IN_PROGRESS: ["DONE", "QUEUED"], DONE: [] };

export const isStage = (v: string): v is ProductionStage => (PRODUCTION_STAGES as readonly string[]).includes(v);
export const canMoveStage = (from: string, to: string): boolean => isStage(from) && (NEXT[from] as readonly string[]).includes(to);

/** ¿Están todas las órdenes terminadas? Sin órdenes no hay nada que terminar: falso. */
export const allDone = (stages: readonly string[]): boolean => stages.length > 0 && stages.every((s) => s === "DONE");
