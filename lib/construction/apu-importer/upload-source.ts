/**
 * Origen de un archivo de importación (SERVER ONLY): el `File` del FormData
 * (≤ 4,5 MB) o un blob subido con `upload()` a Vercel Blob (archivos grandes).
 *
 * Seguridad: solo se descarga desde el almacenamiento Blob propio
 * (https://*.public.blob.vercel-storage.com/imports/...); cualquier otra URL
 * se rechaza (sin SSRF).
 */
import { createHash } from "node:crypto";
import { del } from "@vercel/blob";

export const MAX_IMPORT_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["xlsx", "xls", "csv", "txt"]);

export type ImportSource = {
  buffer: ArrayBuffer;
  fileName: string;
  size: number;
  sha256: string;
  blobUrl: string | null;
};

export function isAllowedBlobUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      url.pathname.startsWith("/imports/")
    );
  } catch {
    return false;
  }
}

export async function readImportSource(formData: FormData): Promise<ImportSource> {
  const file = formData.get("file");
  const blobUrl = formData.get("blobUrl");
  let buffer: ArrayBuffer;
  let fileName: string;
  let url: string | null = null;

  if (file instanceof File) {
    fileName = file.name;
    if (file.size > MAX_IMPORT_FILE_SIZE) throw new Error("El archivo supera el límite de 20 MB.");
    buffer = await file.arrayBuffer();
  } else if (typeof blobUrl === "string" && blobUrl) {
    if (!isAllowedBlobUrl(blobUrl)) throw new Error("Origen del archivo no válido.");
    fileName = String(formData.get("fileName") ?? "archivo.xlsx");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(blobUrl, { signal: controller.signal });
      if (!response.ok) throw new Error(`No se pudo descargar el archivo (${response.status}).`);
      buffer = await response.arrayBuffer();
    } finally {
      clearTimeout(timeout);
    }
    url = blobUrl;
  } else {
    throw new Error("Selecciona un archivo (.xlsx, .csv o .txt).");
  }

  if (buffer.byteLength === 0) throw new Error("El archivo está vacío.");
  if (buffer.byteLength > MAX_IMPORT_FILE_SIZE) throw new Error("El archivo supera el límite de 20 MB.");
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) throw new Error("Formato no soportado. Usa .xlsx, .csv o .txt.");

  const sha256 = createHash("sha256").update(new Uint8Array(buffer)).digest("hex");
  return { buffer, fileName, size: buffer.byteLength, sha256, blobUrl: url };
}

/** Borra el archivo subido a Blob una vez importado (no se guarda el Excel). */
export async function discardImportBlob(blobUrl: string | null): Promise<void> {
  if (!blobUrl || !isAllowedBlobUrl(blobUrl)) return;
  try {
    await del(blobUrl);
  } catch (error) {
    console.error("[apu-importer] no se pudo borrar el archivo temporal", error);
  }
}
