import { publicTenantLogo } from "@/lib/business/customers/registration-db";

/**
 * Logotipo público del negocio para su enlace de registro. Solo se sirve si el
 * registro está habilitado y el archivo es el logo del propio negocio.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const file = await publicTenantLogo(slug);
  if (!file) return new Response("No encontrado.", { status: 404 });

  return new Response(file.data as Uint8Array<ArrayBuffer>, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.fileName.replace(/[^\w.\- ]+/g, "_")}"`,
      "Cache-Control": "public, max-age=300",
      ETag: `"${file.sha256}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
