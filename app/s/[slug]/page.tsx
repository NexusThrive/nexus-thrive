import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteView } from "@/components/organisms/site-view";
import { getAppBaseUrl } from "@/lib/app-url";
import { jsonLd } from "@/lib/site/site";
import { publicSite } from "@/lib/site/site-db";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const site = await publicSite((await params).slug);
  if (!site) return { robots: { index: false } };
  const base = await getAppBaseUrl();
  const url = `${base}/s/${site.slug}`;
  return { title: site.title, description: site.description, alternates: { canonical: url }, openGraph: { title: site.title, description: site.description, url, type: "website", locale: "es_CO", siteName: site.business.name }, twitter: { card: "summary", title: site.title, description: site.description } };
}

/** Mini-sitio público del negocio: sin sesión, rápido y con SEO técnico (título, descripción, canónica y datos estructurados). */
export default async function PublicSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const site = await publicSite((await params).slug);
  if (!site) notFound();
  const base = await getAppBaseUrl();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(site, base)).replace(/</g, "\\u003c") }} />
      <SiteView site={site} store />
    </>
  );
}
