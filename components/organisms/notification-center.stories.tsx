import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { AppNotification } from "@/lib/notifications";
import { NotificationCenter } from "./notification-center";

const now = Date.now();
const LIST: AppNotification[] = [
  { id: "p1", kind: "payment", title: "Pago recibido · $ 89.000", detail: "Carlos Peña · Membresía Plata · Nequi", at: new Date(now - 6 * 60_000).toISOString(), href: "/finance" },
  { id: "b1", kind: "booking", title: "Cita hoy · Corte y barba", detail: "Laura Gómez", at: new Date(now + 90 * 60_000).toISOString(), href: "/bookings" },
  { id: "m1", kind: "membership", title: "3 membresías vencen esta semana", detail: "Recuérdales renovar por WhatsApp", at: new Date(now - 5 * 3600_000).toISOString(), href: "/memberships" },
];

const meta = {
  title: "Organismos/NotificationCenter",
  component: NotificationCenter,
  decorators: [(Story) => <div className="flex h-[460px] justify-end p-4"><Story /></div>],
  args: { load: async () => LIST, hrefFor: (p: string) => p, storageKey: "sb:notifications" },
  parameters: { docs: { description: { component: "AVI·02 — al llegar algo nuevo la campana se sacude (−28°, resorte 380 · 6) y el contador oro salta; al abrir, las nuevas destellan." } } },
} satisfies Meta<typeof NotificationCenter>;
export default meta;

export const ConNuevas: StoryObj<typeof meta> = {};
export const Vacio: StoryObj<typeof meta> = { args: { load: async () => [] } };
