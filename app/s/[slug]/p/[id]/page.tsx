import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppBaseUrl } from "@/lib/app-url";
import { TEMPLATES, onAccent, whatsappUrl } from "@/lib/site/site";
import { publicSite } from "@/lib/site/site-db";

type Params = Promise<{ slug: string; id: string }>;

async function load({ slug, id }: { slug: string; id: string }) {
  const site = await publicSite(slug);
  const product = site?.products.find((p) => p.id === id);
  return site && product ? { site, product } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await load(await params);
  if (!found) return { robots: { index: false } };
  const base = await getAppBaseUrl();
  return { title: `${found.product.name} · ${found.site.business.name}`, description: found.product.description ?? found.site.description, alternates: { canonical: `${base}/s/${found.site.slug}/p/${found.product.id}` } };
}

/** Ficha de un producto del catálogo del sitio. */
export default async function ProductPage({ params }: { params: Params }) {
  const found = await load(await params);
  if (!found) notFound();
  const { site, product } = found;
  const t = TEMPLATES[site.template];
  const wa = whatsappUrl(site.business.whatsapp, `Hola ${site.business.name}, me interesa «${product.name}».`);
  return (
    <main style={{ background: t.bg, color: t.fg }} className="min-h-dvh px-4 py-10">
      <article className="mx-auto grid max-w-xl gap-3">
        <Link href={`/s/${site.slug}`} style={{ color: t.muted }} className="text-sm underline underline-offset-2">← {site.business.name}</Link>
        <h1 className="font-display text-3xl font-bold">{product.name}</h1>
        {product.category ? <small style={{ color: t.muted }}>{product.category}</small> : null}
        {product.description ? <p style={{ color: t.muted }} className="leading-relaxed">{product.description}</p> : null}
        <b className="font-mono text-2xl">{product.price.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}</b>
        {wa ? <a href={wa} style={{ background: site.accent, color: onAccent(site.accent) }} className="mt-2 inline-flex h-12 items-center justify-center rounded-md px-5 font-semibold">Pedir por WhatsApp</a> : null}
      </article>
    </main>
  );
}
