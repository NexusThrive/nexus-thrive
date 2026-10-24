import { toNumber } from "@/lib/format";
import { db } from "@/prisma/db";
import { defaultCopy, isHexColor, isTemplate, validateSiteSlug, type SiteData } from "./site";

/** Mini-sitio (servidor). Lo público se busca por la dirección del sitio y solo devuelve lo que el negocio decidió mostrar. */
const norm = (s: string | null | undefined) => (s ?? "").trim();

async function productsOf(tenantId: string) {
  const rows = await db.orm.public.Product.where({ tenantId, active: true, publishedOnline: true }).orderBy((p) => p.name.asc()).limit(200).all();
  return rows.filter((p) => p.kind === "PRODUCT" || p.kind === "SERVICE").map((p) => ({ id: p.id, name: p.name, description: p.description, price: toNumber(p.price), category: p.category, imageUrl: p.imageUrl }));
}

function build(tenant: NonNullable<Awaited<ReturnType<typeof db.orm.public.Tenant.first>>>, cfg: { siteSlug: string; template: string; title: string | null; description: string | null; heroTitle: string | null; heroSubtitle: string | null; about: string | null; accent: string; showCatalog: boolean; showMap: boolean } | null, products: SiteData["products"]): SiteData {
  const d = defaultCopy(tenant.name, tenant.city);
  return {
    slug: cfg?.siteSlug ?? tenant.slug,
    business: { name: tenant.name, city: tenant.city, address: tenant.address, phone: tenant.whatsappNumber, whatsapp: tenant.whatsappNumber, latitude: tenant.latitude, longitude: tenant.longitude, instagram: tenant.instagramHandle },
    template: cfg && isTemplate(cfg.template) ? cfg.template : "clasica",
    title: norm(cfg?.title) || d.title,
    description: norm(cfg?.description) || d.description,
    heroTitle: norm(cfg?.heroTitle) || d.heroTitle,
    heroSubtitle: norm(cfg?.heroSubtitle) || d.heroSubtitle,
    about: norm(cfg?.about),
    accent: cfg && isHexColor(cfg.accent) ? cfg.accent : "#D4AF37",
    showCatalog: cfg?.showCatalog ?? true,
    showMap: cfg?.showMap ?? true,
    products,
  };
}

/** El sitio PÚBLICO por su dirección: solo si está publicado. `null` si no existe o está apagado (no se distingue). */
export async function publicSite(slug: string): Promise<(SiteData & { tenantId: string; updatedAt: string }) | null> {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const cfg = await db.orm.public.SiteConfig.where({ siteSlug: slug, enabled: true }).first();
  if (!cfg) return null;
  const tenant = await db.orm.public.Tenant.where({ id: cfg.tenantId, active: true }).first();
  if (!tenant) return null;
  const products = cfg.showCatalog ? await productsOf(tenant.id) : [];
  return { ...build(tenant, cfg, products), tenantId: tenant.id, updatedAt: String(cfg.updatedAt).slice(0, 10) };
}

export type SiteEditor = { enabled: boolean; site: SiteData; raw: { title: string; description: string; heroTitle: string; heroSubtitle: string; about: string }; catalog: { id: string; name: string; price: number; published: boolean }[] };

/** Lo que edita el negocio (con o sin sitio creado todavía). */
export async function siteForEditor(tenantId: string): Promise<SiteEditor> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant) throw new Error("Negocio no encontrado");
  const cfg = await db.orm.public.SiteConfig.where({ tenantId }).first();
  const all = await db.orm.public.Product.where({ tenantId, active: true }).orderBy((p) => p.name.asc()).limit(300).all();
  const catalog = all.filter((p) => p.kind === "PRODUCT" || p.kind === "SERVICE").map((p) => ({ id: p.id, name: p.name, price: toNumber(p.price), published: p.publishedOnline }));
  const products = (cfg?.showCatalog ?? true) ? await productsOf(tenantId) : [];
  return { enabled: Boolean(cfg?.enabled), site: build(tenant, cfg, products), raw: { title: cfg?.title ?? "", description: cfg?.description ?? "", heroTitle: cfg?.heroTitle ?? "", heroSubtitle: cfg?.heroSubtitle ?? "", about: cfg?.about ?? "" }, catalog };
}

export type SiteInput = { enabled: boolean; siteSlug: string; template: string; title: string; description: string; heroTitle: string; heroSubtitle: string; about: string; accent: string; showCatalog: boolean; showMap: boolean };

export async function saveSite(tenantId: string, input: SiteInput): Promise<{ ok: true } | { ok: false; message: string; field?: string }> {
  const slug = validateSiteSlug(input.siteSlug);
  if (!slug.ok) return { ok: false, message: slug.message, field: "siteSlug" };
  if (!isTemplate(input.template)) return { ok: false, message: "Elige una plantilla.", field: "template" };
  if (!isHexColor(input.accent)) return { ok: false, message: "El color debe ser como #D4AF37.", field: "accent" };
  const limits: [string, string, number][] = [["title", input.title, 70], ["description", input.description, 200], ["heroTitle", input.heroTitle, 80], ["heroSubtitle", input.heroSubtitle, 140], ["about", input.about, 1200]];
  for (const [field, v, max] of limits) if (v.length > max) return { ok: false, message: `Máximo ${max} caracteres.`, field };
  const taken = await db.orm.public.SiteConfig.where({ siteSlug: slug.slug }).first();
  if (taken && taken.tenantId !== tenantId) return { ok: false, message: "Esa dirección ya la usa otro negocio.", field: "siteSlug" };
  const data = { enabled: input.enabled, siteSlug: slug.slug, template: input.template, title: input.title.trim() || null, description: input.description.trim() || null, heroTitle: input.heroTitle.trim() || null, heroSubtitle: input.heroSubtitle.trim() || null, about: input.about.trim() || null, accent: input.accent, showCatalog: input.showCatalog, showMap: input.showMap };
  try {
    await db.orm.public.SiteConfig.upsert({ create: { tenantId, ...data }, update: data, conflictOn: { tenantId } });
  } catch {
    return { ok: false, message: "Esa dirección ya la usa otro negocio.", field: "siteSlug" };
  }
  return { ok: true };
}

/** Qué productos salen en el sitio (los marcados). Solo los del negocio. */
export async function setPublished(tenantId: string, productIds: readonly string[]): Promise<number> {
  const ids = new Set(productIds);
  const all = await db.orm.public.Product.where({ tenantId, active: true }).select("id", "publishedOnline").all();
  let changed = 0;
  for (const p of all) {
    const want = ids.has(p.id);
    if (p.publishedOnline !== want) {
      await db.orm.public.Product.where({ tenantId, id: p.id }).update({ publishedOnline: want });
      changed++;
    }
  }
  return changed;
}

/** Si el negocio no tenía sitio propio, el mini-sitio pasa a ser el que verifica el escaneo de Presencia. */
export async function adoptAsWebsite(tenantId: string, url: string): Promise<void> {
  const t = await db.orm.public.Tenant.where({ id: tenantId }).select("websiteUrl").first();
  if (t && !t.websiteUrl) await db.orm.public.Tenant.where({ id: tenantId }).update({ websiteUrl: url });
}
