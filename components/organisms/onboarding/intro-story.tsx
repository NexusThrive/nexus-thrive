import { Check, CircleHelp, Equal, FileSpreadsheet, MessageCircleWarning, NotebookPen, Plus } from "lucide-react";
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
];

const PROBLEMS = [
  {
    icon: FileSpreadsheet,
    title: "Todo vive en Excel",
    text: "Clientes, precios y cuentas repartidos en hojas que nadie actualiza.",
  },
  {
    icon: MessageCircleWarning,
    title: "Chats que se pierden",
    text: "Pedidos, citas y pagos entre cientos de mensajes sin seguimiento.",
  },
  {
    icon: NotebookPen,
    title: "Caja a la memoria",
    text: "Ventas y gastos en papel: nunca cuadran al cerrar el día.",
  },
  {
    icon: CircleHelp,
    title: "No sabes cuánto ganas",
    text: "Sin un número claro decides a ciegas y pierdes margen.",
  },
];

const FORMULA = ["Clientes", "Cobros", "Caja", "Finanzas"];

const FORMULA_POINTS = [
  "Un cobro registrado actualiza tus finanzas y la ficha del cliente.",
  "Tu panel te dice cada mañana qué pasó y qué viene.",
  "Activas solo los módulos que tu rubro necesita.",
];

const ROADMAP = [
  { title: "Tu perfil", hint: "Persona natural o empresa" },
  { title: "Tu negocio", hint: "Nombre, rubro, ciudad y enlace" },
  { title: "Plan y módulos", hint: "Lo que tu rubro necesita" },
  { title: "Confirmación", hint: "Revisas y creas tu espacio" },
];

/** Contenido de la presentación (slides 0–2). Ocupa todo el alto disponible. */
export function IntroStory({ slide }: { slide: number }) {
  if (slide === 0) {
    return (
      <ul className="grid flex-1 content-center gap-3 sm:grid-cols-2">
        {PROBLEMS.map(({ icon: Icon, title, text }, i) => (
          <li
            key={title}
            className="nx-rise flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
            style={{ ["--i" as string]: i + 3 }}
          >
            <IconTile tone="danger" size="lg">
              <Icon />
            </IconTile>
            <div className="min-w-0">
              <p className="text-[14.5px] font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (slide === 1) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-3">
        <div
          className="nx-rise flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-4 sm:p-5"
          style={{ ["--i" as string]: 3 }}
        >
          {FORMULA.map((item, i) => (
            <span key={item} className="contents">
              {i > 0 ? (
                <Plus
                  aria-hidden="true"
                  className="nx-rise size-4 shrink-0 text-muted-foreground"
                  style={{ ["--i" as string]: i * 2 + 4 }}
                />
              ) : null}
              <span
                className="nx-rise rounded-md border border-border bg-background px-3 py-2 text-[13.5px] font-semibold"
                style={{ ["--i" as string]: i * 2 + 5 }}
              >
                {item}
              </span>
            </span>
          ))}
          <Equal aria-hidden="true" className="nx-rise size-4 shrink-0 text-muted-foreground" style={{ ["--i" as string]: 13 }} />
          <span
            className="nx-rise rounded-md bg-accent px-3 py-2 text-[13.5px] font-bold text-ink"
            style={{ ["--i" as string]: 14 }}
          >
            Negocio ordenado
          </span>
        </div>

        <ul className="grid gap-3">
          {FORMULA_POINTS.map((line, i) => (
            <li
              key={line}
              className="nx-rise flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-[13.5px] text-muted-foreground"
              style={{ ["--i" as string]: 16 + i }}
            >
              <IconTile tone="success" size="sm" className="shrink-0">
                <Check />
              </IconTile>
              <span className="min-w-0">{line}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ol className="grid flex-1 content-center gap-3">
      {ROADMAP.map(({ title, hint }, i) => (
        <li
          key={title}
          className="nx-rise flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3.5"
          style={{ ["--i" as string]: i + 3 }}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-muted font-mono text-[11px] font-semibold text-accent-text">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0">
            <span className="block text-[14.5px] font-semibold text-foreground">{title}</span>
            <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{hint}</span>
          </span>
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
