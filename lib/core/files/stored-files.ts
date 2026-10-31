import { db } from "@/prisma/db";
import { isActiveMember } from "@/lib/core/tenancy/membership";

/**
 * Archivos guardados en la base (comprobantes, soportes, fotos de insumos).
 *
 * Se piden por id desde una URL, así que la búsqueda no puede filtrar por un
 * negocio que todavía no se conoce: se lee el `tenantId` del archivo y se
 * decide aquí, en el servidor, si quien pide puede verlo (miembro activo de
 * ese negocio o equipo NEXUS con acceso a cuentas). Para cualquier otro, el
 * resultado es `null`, igual que si no existiera: no se revela que existe.
 *
 * Core no conoce al equipo de NEXUS (Platform): quien llama aporta
 * `staffAccess`, una función que solo se evalúa si quien pide NO es miembro.
 * Es obligatoria a propósito: así cada ruta decide de forma explícita si el
 * equipo de NEXUS puede leer, y olvidarla es un error de compilación.
 */

/** Dice si la sesión actual es del equipo NEXUS con permiso de leer archivos de cualquier negocio. */
export type StaffFileAccess = () => Promise<boolean>;

const UUID = /^[0-9a-f-]{36}$/i;

async function canReadTenantFiles(tenantId: string, userId: string, staffAccess: StaffFileAccess) {
  if (await isActiveMember(tenantId, userId)) return true;
  return staffAccess();
}

export type StoredAttachment = { fileName: string; mimeType: string; sha256: string; data: Uint8Array };

/** Adjunto de un negocio, solo si `userId` puede verlo. */
export async function readAttachmentFor(userId: string, id: string, staffAccess: StaffFileAccess): Promise<StoredAttachment | null> {
  if (!UUID.test(id)) return null;
  const file = await db.orm.public.Attachment.where({ id }).select("tenantId", "fileName", "mimeType", "sha256", "data").first();
  if (!file || !(await canReadTenantFiles(file.tenantId, userId, staffAccess))) return null;
  return { fileName: file.fileName, mimeType: file.mimeType, sha256: file.sha256, data: file.data as Uint8Array };
}

export type StoredApuImage = { mimeType: string; sha256: string; data: Uint8Array };

/** Foto de un insumo (`ApuImage`), solo si `userId` puede verla. */
export async function readApuImageFor(userId: string, id: string, staffAccess: StaffFileAccess): Promise<StoredApuImage | null> {
  if (!UUID.test(id)) return null;
  const image = await db.orm.public.ApuImage.where({ id }).select("tenantId", "sha256", "mimeType", "data").first();
  if (!image || !(await canReadTenantFiles(image.tenantId, userId, staffAccess))) return null;
  return { mimeType: image.mimeType, sha256: image.sha256, data: image.data as Uint8Array };
}
