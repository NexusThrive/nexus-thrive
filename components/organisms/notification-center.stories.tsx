import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { AppNotification } from "@/lib/dashboard/notifications";
import { requestNotificationsRefresh } from "@/lib/dashboard/notifications-client";
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
  parameters: { docs: { description: { component: "AVI·02 — al llegar algo nuevo la campana se sacude (−28°, resorte 380 · 6) y el contador oro salta; al abrir, las nuevas destellan. Pendientes y leídas van en pestañas. Una acción que genera una notificación (un cobro, un gasto) sale como aviso junto a la campana unos 5 segundos después (no de inmediato), que se encoge y vuela de vuelta a ella a los pocos segundos." } } },
} satisfies Meta<typeof NotificationCenter>;
export default meta;

export const ConNuevas: StoryObj<typeof meta> = {};
export const Vacio: StoryObj<typeof meta> = { args: { load: async () => [] } };

/** Una acción genera una notificación: ~5 s después sale como aviso (barrido de oro) y regresa a la campana. */
export const LlegaUnaNueva: StoryObj<typeof meta> = {
  render: (args) => {
    let calls = 0;
    const load = async () => {
      calls += 1;
      return calls === 1
        ? LIST
        : [{ id: "p-nuevo", kind: "payment" as const, title: "Pago recibido · $ 120.000", detail: "Laura Méndez · Tarjeta", at: new Date().toISOString(), href: "/finance" }, ...LIST];
    };
    return (
      <div className="flex w-full items-start justify-between">
        <button type="button" onClick={() => requestNotificationsRefresh({ kind: "payment", title: "Pago recibido · $ 120.000", detail: "Laura Méndez · Tarjeta", href: "/finance" })} className="rounded-md border border-border px-3 py-2 text-sm">
          Registrar un pago (simula la acción)
        </button>
        <NotificationCenter {...args} load={load} storageKey="sb:notifications-llega" />
      </div>
    );
  },
};
