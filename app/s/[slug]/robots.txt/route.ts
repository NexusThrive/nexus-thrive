import { getAppBaseUrl } from "@/lib/app-url";
import { robotsTxt } from "@/lib/experience/site/site";
import { publicSite } from "@/lib/experience/site/site-db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await publicSite(slug);
  return new Response(robotsTxt(await getAppBaseUrl(), slug, site !== null), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
