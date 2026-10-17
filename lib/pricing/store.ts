import { DEFAULT_PRICING_STATE, type PricingState } from "./calc";
import { INDUSTRIES } from "./catalog";

/** Configuración del configurador + la selección guardada al pasar a Signature. */
export type PricingStoreState = PricingState & { kept?: string[] };

const STORAGE_KEY = "nx-pricing";
const listeners = new Set<() => void>();
let current: PricingStoreState | null = null;

function load(): PricingStoreState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as PricingStoreState | null;
    if (saved && saved.tier && INDUSTRIES[saved.industry] && Array.isArray(saved.modules)) return saved;
  } catch {
    /* sin almacenamiento */
  }
  return DEFAULT_PRICING_STATE;
}

/**
 * Store mínimo para `useSyncExternalStore`: el servidor ve la configuración por
 * defecto y el navegador la última guardada (solo en este navegador).
 */
export const pricingStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): PricingStoreState {
    current ??= load();
    return current;
  },
  getServerSnapshot(): PricingStoreState {
    return DEFAULT_PRICING_STATE;
  },
  update(updater: (state: PricingStoreState) => PricingStoreState) {
    current = updater(pricingStore.getSnapshot());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      /* modo privado */
    }
    listeners.forEach((l) => l());
  },
};
