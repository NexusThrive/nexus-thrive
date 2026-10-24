import { sandboxPayments } from "./sandbox";
import { wompiPayments } from "./wompi";
import type { ProviderAdapter, ProviderKind } from "./types";

/** Adaptadores disponibles. El proveedor DIAN se agrega aquí cuando se elija. */
export const ADAPTERS: readonly ProviderAdapter[] = [sandboxPayments, wompiPayments];

export const adapterFor = (provider: string, kind?: ProviderKind) => ADAPTERS.find((a) => a.provider === provider && (!kind || a.kind === kind));
