import { NextResponse } from "next/server";
import { destinationUrl } from "@/lib/growth/growth";
import { getAppBaseUrl } from "@/lib/app-url";
import { resolveLink } from "@/lib/growth/growth-db";

/** Enlace corto de una campaña: cuenta el clic y lleva al sitio del negocio con su origen (UTM) marcado. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const link = await resolveLink((await params).code);
  if (!link) return new NextResponse("Este enlace no existe o ya no está activo.", { status: 404 });
  const url = destinationUrl(await getAppBaseUrl(), link.siteSlug, link);
  return NextResponse.redirect(url, 302);
}
