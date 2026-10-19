import { auth } from "@clerk/nextjs/server";
import { db } from "@/prisma/db";
import { getStaffContext } from "@/lib/ops/access";

/**
 * Archivo de un negocio guardado en NEXUS (comprobantes, soportes, fotos).
 * Solo para miembros del negocio o el equipo NEXUS con acceso a cuentas;
 * para cualquier otro, el mismo 404 que si no existiera.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("No encontrado.", { status: 404 });
  const file = await db.orm.public.Attachment.where({ id }).select("tenantId", "fileName", "mimeType", "sha256", "data").first();
  if (!file) return new Response("No encontrado.", { status: 404 });
  const member = await db.orm.public.User.where({ clerkUserId: userId, tenantId: file.tenantId }).select("id").first();
  if (!member && !(await getStaffContext())?.permissions.includes("accounts.view")) return new Response("No encontrado.", { status: 404 });
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
