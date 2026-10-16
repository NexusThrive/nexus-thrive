/**
 * Validación de una foto subida desde un formulario (SERVER ONLY): tipo real
 * por firma de bytes (no por extensión) y tamaño máximo.
 */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const SIGNATURES: { mime: string; test: (b: Uint8Array) => boolean }[] = [
  { mime: "image/png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/gif", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  {
    mime: "image/webp",
    test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45,
  },
];

export type ImageUpload =
  | { status: "none" }
  | { status: "ok"; data: Uint8Array; mimeType: string }
  | { status: "error"; message: string };

export async function readImageUpload(formData: FormData, field: string): Promise<ImageUpload> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return { status: "none" };
  if (file.size > MAX_IMAGE_BYTES) {
    return { status: "error", message: "La foto supera 2 MB. Usa una imagen más liviana." };
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const match = SIGNATURES.find((signature) => signature.test(data));
  if (!match) {
    return { status: "error", message: "La foto debe ser PNG, JPG, GIF o WEBP." };
  }
  return { status: "ok", data, mimeType: match.mime };
}
