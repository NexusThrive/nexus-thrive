import { sandboxEInvoice } from "./sandbox";
import type { EInvoicePort } from "./port";

/** Proveedores tecnológicos disponibles. El real (PR-20) se agrega aquí cuando se elija. */
export const EINVOICE_PORTS: readonly EInvoicePort[] = [sandboxEInvoice];
export const einvoicePort = (provider: string) => EINVOICE_PORTS.find((p) => p.provider === provider);
