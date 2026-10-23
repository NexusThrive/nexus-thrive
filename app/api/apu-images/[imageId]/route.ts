import { auth } from "@clerk/nextjs/server";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";

/**
 * Sirve la foto de un insumo guardada en la base (`ApuImage`). Solo para
 * miembros del negocio dueño de la imagen (o SUPERADMIN). La imagen es
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
  if (!/^[0-9a-f-]{36}$/i.test(imageId)) {
    return new Response("Imagen no encontrada.", { status: 404 });
  }

  const image = await db.orm.public.ApuImage.where({ id: imageId })
    .select("tenantId", "sha256", "mimeType", "data")
    .first();
  if (!image) {
    return new Response("Imagen no encontrada.", { status: 404 });
  }

  const member = await db.orm.public.User.where({ clerkUserId: userId, tenantId: image.tenantId })
    .select("id")
    .first();
  if (!member && !(await createAdminDb().isSuperAdmin(userId))) {
    // Mismo 404 que una imagen inexistente: no se revela que existe.
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
