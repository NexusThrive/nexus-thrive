import { auth } from "@clerk/nextjs/server";
import { readApuImageFor } from "@/lib/files/stored-files";

/**
 * Sirve la foto de un insumo guardada en la base (`ApuImage`). Solo para
 * miembros activos del negocio dueño de la imagen, o el equipo NEXUS con
 * acceso a cuentas (igual que `/api/files`). La imagen es
 * inmutable (identificada por contenido), así que se cachea en el navegador.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params;
  const { userId } = await auth();
  if (!userId) {
    return new Response("No autenticado.", { status: 401 });
  }
  // Inexistente o de un negocio ajeno: el mismo 404 (no se revela que existe).
  const image = await readApuImageFor(userId, imageId);
  if (!image) {
    return new Response("Imagen no encontrada.", { status: 404 });
  }

  const etag = `"${image.sha256}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  return new Response(image.data as Uint8Array<ArrayBuffer>, {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
