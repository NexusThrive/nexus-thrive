import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import GoogleView from "./google-view";

const place = { name: "Simplapp Gym", address: "Cl. 80 #12-34, Bogotá", phone: "+57 300 123 4567", website: "https://www.simplapp.co/", rating: 4.6, ratingCount: 128 };
const base = { connected: true, placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4", status: "OK" as const, syncedAt: "2026-10-24T10:30:00.000Z", lastError: null, place, mapsUrl: "https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4" };

const meta = {
  title: "Páginas/Visibilidad/Ficha de Google",
  component: GoogleView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Se conecta con el ID de lugar y la llave de Google del negocio; NEXUS solo lee y compara nombre, dirección, teléfono y sitio con lo que dice el negocio, y muestra la calificación y las reseñas. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", listing: { ...base, nap: [{ field: "name", label: "Nombre", nexus: "Simplapp Gym", google: "Simplapp Gym", match: true }, { field: "address", label: "Dirección", nexus: "Calle 80 # 12-34, Bogotá", google: "Cl. 80 #12-34, Bogotá", match: true }, { field: "phone", label: "Teléfono", nexus: "+57 301 999 9999", google: "+57 300 123 4567", match: false }, { field: "website", label: "Sitio web", nexus: null, google: "https://www.simplapp.co/", match: true }], napMatches: 3 } },
} satisfies Meta<typeof GoogleView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sincronizada: Story = {};
export const SinConectar: Story = { args: { listing: { connected: false, placeId: null, status: null, syncedAt: null, lastError: null, place: null, nap: [], napMatches: 0, mapsUrl: null } } };
export const ConError: Story = { args: { listing: { ...base, status: "ERROR", place: null, nap: [], napMatches: 0, lastError: "Google rechazó la llave: revisa que la API «Places API (New)» esté activada y que la llave no esté restringida de más." } } };
