import { getStaffContext } from "@/lib/ops/access";
import { getEvidenceFile } from "@/lib/ops/billing";

/**
 * Comprobante de pago guardado en el sistema. Solo para el equipo NEXUS con
 * permiso de cobros; para cualquier otro, el mismo 404 que si no existiera.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("billing.view") || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("No encontrado.", { status: 404 });
  const file = await getEvidenceFile(id);
  if (!file) return new Response("No encontrado.", { status: 404 });
  const safeName = file.fileName.replace(/[^\w.\- ]+/g, "_");
  return new Response(file.data as Uint8Array<ArrayBuffer>, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, max-age=3600",
      ETag: `"${file.sha256}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
