import { MessageCircle } from "lucide-react";
import { AttributionCapture, ContactForm } from "@/components/organisms/site-extras";
import { AddToCart, CartDock } from "@/components/organisms/store-cart";
import { TEMPLATES, mapUrl, onAccent, whatsappUrl, type SiteData } from "@/lib/site/site";

const peso = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/**
 * El mini-sitio del negocio. Es el MISMO componente que ve el público y el que usa la vista previa del
 * editor. Celular primero (una columna que crece), botón flotante de WhatsApp, catálogo, contacto y mapa.
 * Los colores salen de la plantilla y el acento se valida (hex) antes de llegar aquí.
 */
export function SiteView({ site, preview = false, store = false }: { site: SiteData; preview?: boolean; store?: boolean }) {
  const t = TEMPLATES[site.template];
  const wa = whatsappUrl(site.business.whatsapp, `Hola ${site.business.name}, vi su sitio y quiero más información.`);
  const map = site.showMap ? mapUrl(site.business) : null;
  const accentText = onAccent(site.accent);
  return (
    <div style={{ background: t.bg, color: t.fg }} className="min-h-full">
      <header style={{ borderColor: `${t.muted}33` }} className="mx-auto flex max-w-3xl items-center justify-between gap-3 border-b px-4 py-4">
        <b className="font-display text-lg">{site.business.name}</b>
        {wa ? <a href={wa} style={{ background: site.accent, color: accentText }} className="rounded-md px-3 py-1.5 text-[13px] font-semibold">Escríbenos</a> : null}
      </header>
      <main className="mx-auto grid max-w-3xl gap-10 px-4 py-10">
        <section aria-labelledby="hero" className="grid gap-3">
          <h1 id="hero" className="font-display text-4xl font-bold leading-tight sm:text-5xl">{site.heroTitle}</h1>
          <p style={{ color: t.muted }} className="text-lg">{site.heroSubtitle}</p>
          <span style={{ background: site.accent }} className="mt-1 block h-1 w-16 rounded-full" aria-hidden="true" />
        </section>
        {site.about ? (
          <section aria-labelledby="about" className="grid gap-2">
            <h2 id="about" className="font-display text-xl font-semibold">Quiénes somos</h2>
            <p style={{ color: t.muted }} className="whitespace-pre-line leading-relaxed">{site.about}</p>
          </section>
        ) : null}
        {site.showCatalog && site.products.length ? (
          <section aria-labelledby="catalog" className="grid gap-4">
            <h2 id="catalog" className="font-display text-xl font-semibold">Catálogo</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {site.products.map((p) => (
                <li key={p.id} style={{ background: t.card, borderColor: `${t.muted}33` }} className="grid gap-1 rounded-lg border p-4">
                  <a href={preview ? "#catalog" : `/s/${site.slug}/p/${p.id}`} className="font-semibold underline-offset-2 hover:underline">{p.name}</a>
                  {p.category ? <small style={{ color: t.muted }}>{p.category}</small> : null}
                  {p.description ? <p style={{ color: t.muted }} className="line-clamp-2 text-[14px]">{p.description}</p> : null}
                  <b className="mt-1 font-mono">{peso(p.price)}</b>
                  {store ? <AddToCart slug={site.slug} product={p} accent={site.accent} onAccent={accentText} /> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {store ? (
          <section aria-labelledby="write" className="grid gap-3">
            <h2 id="write" className="font-display text-xl font-semibold">Escríbenos</h2>
            <ContactForm slug={site.slug} accent={site.accent} onAccent={accentText} />
          </section>
        ) : null}
        <section aria-labelledby="contact" className="grid gap-2">
          <h2 id="contact" className="font-display text-xl font-semibold">Contacto</h2>
          <ul style={{ color: t.muted }} className="grid gap-1">
            {site.business.address ? <li>{site.business.address}{site.business.city ? `, ${site.business.city}` : ""}</li> : site.business.city ? <li>{site.business.city}</li> : null}
            {site.business.phone ? <li><a href={`tel:${site.business.phone.replace(/\s/g, "")}`} className="underline underline-offset-2">{site.business.phone}</a></li> : null}
            {site.business.instagram ? <li><a href={`https://instagram.com/${site.business.instagram.replace(/^@/, "")}`} rel="noopener noreferrer" className="underline underline-offset-2">@{site.business.instagram.replace(/^@/, "")}</a></li> : null}
            {map ? <li><a href={map} rel="noopener noreferrer" target="_blank" className="underline underline-offset-2">Cómo llegar (mapa)</a></li> : null}
          </ul>
        </section>
      </main>
      <footer style={{ color: t.muted, borderColor: `${t.muted}33` }} className="mx-auto max-w-3xl border-t px-4 py-6 text-xs">© {site.business.name}. Sitio creado con NEXUS THRIVE.</footer>
      {store ? <AttributionCapture slug={site.slug} /> : null}
      {store ? <CartDock slug={site.slug} accent={site.accent} onAccent={accentText} /> : null}
      {wa ? (
        <a href={wa} aria-label="Escríbenos por WhatsApp" style={{ background: "#25D366", color: "#000" }} className={`${preview ? "absolute" : "fixed"} bottom-4 right-4 grid size-14 place-items-center rounded-full shadow-lg`}>
          <MessageCircle aria-hidden="true" className="size-7" />
        </a>
      ) : null}
    </div>
  );
}
