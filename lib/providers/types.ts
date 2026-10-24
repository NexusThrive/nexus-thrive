/**
 * Puertos de proveedores externos. NEXUS habla con una interfaz por tipo de
 * proveedor (`kind`); cada proveedor real (Wompi, Nequi, el proveedor
 * tecnológico de la DIAN…) es un adaptador que la cumple, sin tocar el resto.
 */
export type ProviderKind = "PAYMENT" | "EINVOICE" | "MESSAGING" | "SHIPPING";
export type Environment = "sandbox" | "production";

/** Evento ya entendido, igual para todos los proveedores. */
export type NormalizedEvent = {
  /** Id del proveedor: base de la deduplicación. */
  externalId: string;
  /** `payment.succeeded`, `payment.failed`… */
  type: string;
  /** Referencia nuestra (id de cobro) si el proveedor la devuelve. */
  reference?: string | null;
  amount?: string | null;
};

export type ProviderCredentials = Record<string, string>;

export type ProviderAdapter = {
  provider: string;
  kind: ProviderKind;
  label: string;
  /** Credenciales mínimas que pide al conectar. */
  requiredCredentials: readonly string[];
  /** ¿La firma del webhook es válida? Siempre sobre el cuerpo CRUDO. */
  verifyWebhook(rawBody: string, headers: Headers, credentials: ProviderCredentials): boolean;
  /** Entiende el cuerpo; devuelve null si no es un evento que NEXUS use. */
  parseWebhook(rawBody: string): NormalizedEvent | null;
  /** Prueba que las credenciales sirven (llamada barata al proveedor). */
  check(credentials: ProviderCredentials): Promise<{ ok: true } | { ok: false; message: string }>;
};
