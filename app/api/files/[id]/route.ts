import { auth } from "@clerk/nextjs/server";
import { readAttachmentFor } from "@/lib/files/stored-files";

/**
 * Archivo de un negocio guardado en NEXUS (comprobantes, soportes, fotos).
 * Solo para miembros activos del negocio o el equipo NEXUS con acceso a cuentas;
 * para cualquier otro, el mismo 404 que si no existiera.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  const file = userId ? await readAttachmentFor(userId, id) : null;
  if (!file) return new Response("No encontrado.", { status: 404 });
  return new Response(file.data as Uint8Array<ArrayBuffer>, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.fileName.replace(/[^\w.\- ]+/g, "_")}"`,
      "Cache-Control": "private, max-age=3600",
      ETag: `"${file.sha256}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
