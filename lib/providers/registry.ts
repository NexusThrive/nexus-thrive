import { sandboxPayments } from "./sandbox";
import type { ProviderAdapter, ProviderKind } from "./types";

/** Adaptadores disponibles. Wompi y el proveedor DIAN se agregan aquí cuando existan. */
export const ADAPTERS: readonly ProviderAdapter[] = [sandboxPayments];

export const adapterFor = (provider: string, kind?: ProviderKind) => ADAPTERS.find((a) => a.provider === provider && (!kind || a.kind === kind));
