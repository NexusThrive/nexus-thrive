import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TEMPLATES, onAccent } from "@/lib/site/site";
import { publicSite } from "@/lib/site/site-db";
import ReviewForm from "./review-form";

export const metadata: Metadata = { title: "Tu opinión", robots: { index: false } };

/** Enlace público de reseña del negocio (para compartir por WhatsApp o en un QR). */
export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const site = await publicSite((await params).slug);
  if (!site) notFound();
  const t = TEMPLATES[site.template];
  return (
    <main style={{ background: t.bg, color: t.fg }} className="grid min-h-dvh content-center px-4 py-10">
      <section className="mx-auto grid w-full max-w-md gap-4">
        <h1 className="font-display text-2xl font-bold">Tu opinión sobre {site.business.name}</h1>
        <ReviewForm slug={site.slug} business={site.business.name} accent={site.accent} onAccent={onAccent(site.accent)} />
      </section>
    </main>
  );
}
