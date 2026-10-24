import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import { SiteView } from "@/components/organisms/site-view";
import type { SiteData } from "@/lib/site/site";
import SiteEditor from "./site-editor";

const site: SiteData = {
  slug: "simplapp", template: "moderna", title: "Simplapp Gym en Bogotá", description: "Gimnasio con clases grupales, entrenamiento personalizado y planes mensuales para todos los niveles en el norte de Bogotá.",
  heroTitle: "Simplapp Gym", heroSubtitle: "Entrena con nosotros en Bogotá.", about: "Somos un gimnasio de barrio con entrenadores certificados y clases para todos los niveles.", accent: "#D4AF37", showCatalog: true, showMap: true,
  business: { name: "Simplapp Gym", city: "Bogotá", address: "Calle 80 # 12-34", phone: "+57 300 123 4567", whatsapp: "+57 300 123 4567", latitude: 4.7, longitude: -74.05, instagram: "simplapp" },
  products: [{ id: "p1", name: "Plan mensual", description: "Acceso total a la sede y clases grupales.", price: 120_000, category: "Planes", imageUrl: null }, { id: "p2", name: "Clase de prueba", description: null, price: 0, category: "Planes", imageUrl: null }],
};
const catalog = [{ id: "p1", name: "Plan mensual", price: 120_000, published: true }, { id: "p2", name: "Clase de prueba", price: 0, published: true }, { id: "p3", name: "Proteína whey 2 lb", price: 129_900, published: false }];

const meta = {
  title: "Páginas/Visibilidad/Mi sitio web",
  component: SiteEditor,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Editor del mini-sitio: publicación y dirección, plantilla y color, textos para buscadores, catálogo a mostrar, lista de SEO y vista previa en vivo con el mismo componente que ve el público (celular primero, botón flotante de WhatsApp, catálogo, contacto y mapa). Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", baseUrl: "https://app.nexus.co", initial: { enabled: true, site, raw: { title: "", description: "", heroTitle: "", heroSubtitle: "", about: site.about }, catalog } },
} satisfies Meta<typeof SiteEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editor: Story = {};
export const SinPublicar: Story = { args: { initial: { enabled: false, site: { ...site, template: "oscura" }, raw: { title: "", description: "", heroTitle: "", heroSubtitle: "", about: "" }, catalog: [] } } };
export const SitioPublico: Story = { render: () => <SiteView site={site} />, parameters: { layout: "fullscreen" } };
export const SitioPublicoOscuro: Story = { render: () => <SiteView site={{ ...site, template: "oscura", accent: "#7C3AED" }} />, parameters: { layout: "fullscreen" } };
