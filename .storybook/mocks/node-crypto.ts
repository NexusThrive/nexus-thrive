/**
 * Sustituto de `node:crypto` en Storybook. Varias reglas puras de `lib/` (etiquetas de estado, validaciones) viven en el mismo
 * módulo que una función de servidor que genera un código o firma con `node:crypto`; un componente de cliente que importa la
 * regla arrastra el módulo y, en el navegador, Vite lo deja vacío y la historia cae al cargar. Aquí basta con poder importarlo:
 * - `randomBytes` y `randomUUID` funcionan con Web Crypto (por si una historia genera un código de muestra).
 * - Hash, firma y cifrado no ocurren en una historia (las acciones de servidor están simuladas): fallan con un mensaje claro.
 */
type Encoding = "hex" | "base64" | "base64url";

function encode(bytes: Uint8Array, encoding?: Encoding): string {
  if (encoding === "hex") return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const base64 = btoa(String.fromCharCode(...bytes));
  return encoding === "base64url" ? base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : base64;
}

export function randomBytes(size: number): Uint8Array & { toString(encoding?: Encoding): string } {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Object.assign(bytes, { toString: (encoding?: Encoding) => encode(bytes, encoding) });
}

export const randomUUID = (): string => crypto.randomUUID();

function serverOnly(name: string) {
  return (): never => {
    throw new Error(`node:crypto.${name} solo corre en el servidor; en Storybook la acción que lo usa está simulada.`);
  };
}

export const createHash = serverOnly("createHash");
export const createHmac = serverOnly("createHmac");
export const createCipheriv = serverOnly("createCipheriv");
export const createDecipheriv = serverOnly("createDecipheriv");
export const timingSafeEqual = serverOnly("timingSafeEqual");

export default { randomBytes, randomUUID, createHash, createHmac, createCipheriv, createDecipheriv, timingSafeEqual };
