import { getAppBaseUrl } from "@/lib/app-url";
import { sitemapXml } from "@/lib/site/site";
import { publicSite } from "@/lib/site/site-db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const site = await publicSite((await params).slug);
  if (!site) return new Response("No encontrado", { status: 404 });
  const xml = sitemapXml(await getAppBaseUrl(), site.slug, site.products.map((p) => p.id), site.updatedAt);
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
