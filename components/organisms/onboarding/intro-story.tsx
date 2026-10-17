import { FileSpreadsheet, MessageCircleWarning, NotebookPen, Plus, Equal, CircleHelp } from "lucide-react";
import { IconTile } from "@/components/atoms/icon-tile";
import { cn } from "@/lib/utils";

/** Diapositivas de la presentación: problemas → fórmula → arranque. */
export const INTRO_SLIDES = [
  {
    eyebrow: "Antes de empezar",
    title: "¿Tu negocio vive así?",
    description: "Así trabajan la mayoría de negocios antes de NEXUS.",
  },
  {
    eyebrow: "La fórmula NEXUS",
    title: "Todo en un solo lugar",
    description: "Cada pieza se conecta con las demás: lo que pasa en una se refleja en todas.",
  },
  {
    eyebrow: "Comencemos",
    title: "Vamos a crear y diseñar tu negocio ordenado",
    description: "Son cuatro pasos y menos de tres minutos. Empiezas gratis.",
  },
] as const;

const PROBLEMS = [
  { icon: FileSpreadsheet, title: "Excel por todas partes", text: "Clientes y cobros en archivos que nadie actualiza." },
  { icon: MessageCircleWarning, title: "Mensajes que se pierden", text: "Pedidos y citas enterrados en WhatsApp." },
  { icon: NotebookPen, title: "La caja en un cuaderno", text: "Gastos sin soporte y cuentas que no cuadran." },
  { icon: CircleHelp, title: "¿Cuánto ganaste este mes?", text: "Nadie lo sabe hasta que es tarde." },
];

const FORMULA = ["Clientes", "Agenda", "Cobros", "Finanzas"];

const ROADMAP = ["Tu perfil", "Tu negocio", "Plan y módulos", "Confirmación"];

/** Contenido de la diapositiva `slide` de la presentación (el título lo pinta la plantilla). */
export function IntroStory({ slide }: { slide: number }) {
  if (slide === 0) {
    return (
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {PROBLEMS.map(({ icon: Icon, title, text }, i) => (
          <li
            key={title}
            className="nx-rise flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
            style={{ ["--i" as string]: i + 3 }}
          >
            <IconTile tone="danger" className="size-9 [&_svg]:size-[18px]">
              <Icon />
            </IconTile>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (slide === 1) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {FORMULA.map((item, i) => (
            <span key={item} className="contents">
              {i > 0 ? (
                <Plus aria-hidden="true" className="nx-rise size-4 text-muted-foreground" style={{ ["--i" as string]: i * 2 + 2 }} />
              ) : null}
              <span
                className="nx-rise rounded-md border border-border bg-surface px-3.5 py-2.5 text-[14px] font-semibold"
                style={{ ["--i" as string]: i * 2 + 3 }}
              >
                {item}
              </span>
            </span>
          ))}
          <Equal aria-hidden="true" className="nx-rise size-4 text-muted-foreground" style={{ ["--i" as string]: 11 }} />
          <span
            className="nx-rise rounded-md bg-accent px-3.5 py-2.5 text-[14px] font-bold text-ink shadow-[0_8px_24px_-8px_rgba(212,175,55,.6)]"
            style={{ ["--i" as string]: 12 }}
          >
            Negocio ordenado
          </span>
        </div>
        <ul className="mt-6 grid gap-2 text-[13.5px] text-muted-foreground">
          {[
            "Un cobro registrado actualiza tus finanzas y la ficha del cliente.",
            "Tu panel te dice cada mañana qué pasó y qué sigue.",
            "Solo activas los módulos que tu rubro necesita.",
          ].map((line, i) => (
            <li key={line} className="nx-rise flex gap-2.5" style={{ ["--i" as string]: 14 + i }}>
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
              {line}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <ol className="grid gap-2.5">
      {ROADMAP.map((step, i) => (
        <li
          key={step}
          className="nx-rise flex items-center gap-3.5 rounded-lg border border-border bg-surface px-4 py-3.5"
          style={{ ["--i" as string]: i + 3 }}
        >
          <span className="font-mono text-[11px] font-semibold text-accent-text">{String(i + 1).padStart(2, "0")}</span>
          <span className="text-[14px] font-semibold">{step}</span>
        </li>
      ))}
    </ol>
  );
}

/** Puntos de avance de la presentación. */
export function IntroDots({ slide, total = INTRO_SLIDES.length }: { slide: number; total?: number }) {
  return (
    <span aria-label={`Diapositiva ${slide + 1} de ${total}`} className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          className={cn(
            "block h-1.5 rounded-full transition-all duration-500 ease-[var(--nx-ease-out)]",
            i === slide ? "w-5 bg-accent" : "w-1.5 bg-border-strong",
          )}
        />
      ))}
    </span>
  );
}
