import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ToastProvider } from "@/components/molecules/toast";
import { CurrentUserProvider } from "@/components/providers/current-user";
import { AuriAssistant } from "./auri-assistant";

/**
 * AURI AI: la asistente del negocio. El botón de la esquina (que antes era el «?») es su cara: unos ojos que siguen el cursor y
 * parpadean. Abre una ventana flotante de chat. Hoy es solo la interfaz: no hay modelo detrás y lo dice con claridad; el
 * Centro de ayuda se abre desde el pie del chat.
 */
const meta = {
  title: "Organismos/AURI/AuriAssistant",
  id: "organismos-auriassistant",
  component: AuriAssistant,
  args: { tenantSlug: "gym-norte", businessName: "Gimnasio Norte", activeModules: ["crm", "finance", "bookings"] },
  // Fuera del Inicio, para que el recorrido de la primera visita no aparezca en las demás historias.
  parameters: { layout: "fullscreen", nextjs: { navigation: { pathname: "/gym-norte/contactos" } } },
  decorators: [
    (Story) => (
      <ToastProvider>
        <CurrentUserProvider firstName="Santiago">
          <div className="min-h-[520px] p-6 text-sm text-muted-foreground">Contenido de la página.<Story /></div>
        </CurrentUserProvider>
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof AuriAssistant>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Cerrado: solo su cara en la esquina. */
export const Cerrado: Story = {};

/** Abierto: saludo, aviso de vista previa y sugerencias. */
export const Abierto: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Abrir el chat con AURI AI" }));
    const chat = await within(document.body).findByRole("dialog");
    await expect(within(chat).getByText(/Vista previa/)).toBeVisible();
  },
};

/** Una pregunta: el mensaje queda en el hilo y AURI contesta con honestidad que aún no está conectada. */
export const Conversando: Story = {
  play: async (context) => {
    await Abierto.play?.(context);
    const chat = within(await within(document.body).findByRole("dialog"));
    await userEvent.click(chat.getByRole("button", { name: "Citas de mañana" }));
    await expect(await chat.findByText(/Todavía no estoy conectada/, {}, { timeout: 3000 })).toBeVisible();
  },
};

/** Mantenerla presionada: pone cara de alegría y saluda por el nombre, escrito letra a letra en una burbuja. Soltar no abre el chat. */
export const SaludoAlMantener: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Abrir el chat con AURI AI" });
    await userEvent.pointer({ keys: "[MouseLeft>]", target: button });
    await expect(await within(canvasElement).findByText("Hola Santiago!", {}, { timeout: 3000 })).toBeVisible();
    await userEvent.pointer({ keys: "[/MouseLeft]", target: button });
    await expect(within(document.body).queryByRole("dialog")).toBeNull();
  },
};

/**
 * Primera visita al Inicio: AURI crece en su esquina, pone cara de alegría y explica qué hay en el panel, paso a paso, en una
 * tarjeta. «Omitir» o «Entendido» la cierran y no vuelve a salir; se puede repetir desde el chat. Sin `play`: la interacción la
 * prueba `e2e/onboarding.spec.ts` (un `play` correría solo y la saltaría).
 */
export const PrimeraVisitaAlInicio: Story = {
  parameters: { nextjs: { navigation: { pathname: "/gym-norte" } } },
  decorators: [
    (Story) => {
      try {
        window.localStorage.removeItem("nx:auri-home-intro:v1:gym-norte");
      } catch {
        /* sin almacenamiento */
      }
      return <Story />;
    },
  ],
};
