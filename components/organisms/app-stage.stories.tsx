import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ViewTransition, startTransition, useState } from "react";
import { Target } from "lucide-react";
import { Button } from "@/components/atoms/button";

/**
 * Demostración del morfeo de abrir una app: el icono del cajón y la vista de la app comparten el nombre de View Transition
 * (`appTransitionName`) y la clase `nx-app`. En la app real el cambio lo hace la navegación de Next (Link o «atrás»).
 */
function Demo() {
  const [open, setOpen] = useState(false);
  const go = (next: boolean) => startTransition(() => setOpen(next));
  return open ? (
    <ViewTransition key="app" name="nx-app-demo" share="nx-app" exit="nx-app-exit" default="none">
      <div className="min-h-[560px] bg-background p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">CRM</h1>
          <Button variant="outline" onClick={() => go(false)}>
            Volver a Inicio
          </Button>
        </div>
        <ul className="mt-6 grid grid-cols-3 gap-4">
          {["Nuevo", "Calificado", "Propuesta"].map((s) => (
            <li key={s} className="grid h-80 content-start gap-2 rounded-lg border border-border bg-card p-4 text-sm text-foreground">
              {s}
              <span className="h-16 rounded-md bg-surface-muted" />
              <span className="h-16 rounded-md bg-surface-muted" />
            </li>
          ))}
        </ul>
      </div>
    </ViewTransition>
  ) : (
    <div key="inicio" className="grid min-h-[560px] place-items-center">
      <button type="button" onClick={() => go(true)} className="grid w-28 justify-items-center gap-3 text-center">
        <ViewTransition name="nx-app-demo" share="nx-app" default="none">
          <span className="grid size-[84px] place-items-center rounded-3xl border border-border bg-card text-accent-text">
            <Target aria-hidden="true" strokeWidth={1.5} className="size-[34px]" />
          </span>
        </ViewTransition>
        <span className="text-ui font-medium text-foreground">CRM</span>
      </button>
    </div>
  );
}

const meta = {
  title: "Organismos/Shell/AppStage",
  id: "organismos-appstage",
  component: Demo,
  parameters: { layout: "fullscreen", docs: { description: { component: "Abrir una app: el icono crece hasta la vista y, al volver, la vista se encoge a su icono (sin estirar las capturas)." } } },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AbrirApp: Story = {};
