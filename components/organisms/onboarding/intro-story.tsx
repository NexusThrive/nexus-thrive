import { Check, CircleHelp, FileSpreadsheet, HandCoins, LineChart, MessageCircleWarning, NotebookPen, Sparkles, Users, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Diapositivas de la presentación: te reconoces → ves cómo se conecta todo → armamos tu espacio juntos. */
export const INTRO_SLIDES = [
  {
    eyebrow: "Antes de empezar",
    title: "¿Te suena familiar?",
    description: "Casi todos los negocios empiezan así. No estás solo, y tiene arreglo.",
  },
  {
    eyebrow: "Así funciona NEXUS",
    title: "Todo conectado, sin trabajo extra",
    description: "Lo que haces en un lugar aparece solo en los demás. Tú te dedicas a tu negocio.",
  },
  {
    eyebrow: "Comencemos",
    title: "Armemos tu espacio, juntos",
    description: "Son cinco pasos cortos, menos de tres minutos. Yo te acompaño en cada uno y empiezas gratis.",
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

/** Un solo gesto, y lo que NEXUS actualiza por ti. */
const FLOW = [
  { icon: Wallet, title: "Caja", text: "Entran $ 180.000 al turno de hoy" },
  { icon: LineChart, title: "Finanzas", text: "Tus ingresos del mes se actualizan" },
  { icon: Users, title: "Ficha de Laura", text: "Queda su pago y su historial al día" },
];

const FORMULA_POINTS = [
  "Tu panel te cuenta cada mañana qué pasó y qué viene.",
  "Activas solo los módulos que tu rubro necesita.",
];

const ROADMAP = [
  { title: "Tu etapa", hint: "Emprendiendo o ya en funcionamiento" },
  { title: "Tu negocio", hint: "Nombre, rubro, ciudad y enlace" },
  { title: "Tu operación", hint: "Cómo vendes y qué quieres controlar" },
  { title: "Acceso", hint: "15 días gratis, tu código o un plan" },
  { title: "Confirmación", hint: "Revisas y creas tu espacio" },
];

const card = "rounded-3xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(10,10,11,.03)]";

/** Contenido de la presentación (slides 0–2). Ocupa todo el alto disponible. */
export function IntroStory({ slide }: { slide: number }) {
  if (slide === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4">
        <ul className="grid gap-3.5 sm:grid-cols-2">
          {PROBLEMS.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className={cn(card, "nx-rise group flex flex-col gap-4 p-5 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-danger/30")}
              style={{ ["--i" as string]: i + 3 }}
            >
              <span className="relative grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
                <Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />
                <X aria-hidden="true" className="absolute -right-1 -top-1 size-[18px] rounded-full bg-card p-0.5 text-danger shadow-sm" strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[15.5px] font-semibold leading-tight text-foreground">{title}</p>
                <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="nx-rise flex items-center gap-2 rounded-2xl bg-accent-subtle/60 px-4 py-3 text-ui text-foreground" style={{ ["--i" as string]: 8 }}>
          <Sparkles aria-hidden="true" className="size-4 shrink-0 text-accent-text" />
          Si te suena familiar, NEXUS lo ordena por ti.
        </p>
      </div>
    );
  }

  if (slide === 1) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4">
        {/* El gesto: registrar un cobro. */}
        <div className={cn(card, "nx-rise flex items-center gap-4 p-5")} style={{ ["--i" as string]: 3 }}>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-ink">
            <HandCoins aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </span>
          <span className="grid min-w-0 flex-1">
            <span className="text-xs text-muted-foreground">Tú haces esto</span>
            <span className="font-display text-[16px] font-semibold leading-tight">Registras un cobro de $ 180.000 a Laura</span>
          </span>
        </div>

        {/* Y NEXUS lo conecta: una línea baja del cobro y llega a cada pieza. */}
        <div className="relative grid gap-2.5 pl-6">
          <span aria-hidden="true" className="absolute bottom-6 left-[0.42rem] top-[-1rem] w-0.5 rounded-full bg-accent/50" />
          <p className="nx-rise -mb-0.5 text-xs font-medium text-muted-foreground" style={{ ["--i" as string]: 5 }}>NEXUS hace el resto</p>
          {FLOW.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className={cn(card, "nx-rise relative flex items-center gap-3.5 px-4 py-3.5")} style={{ ["--i" as string]: 7 + i * 2 }}>
              <span aria-hidden="true" className="absolute -left-[1.45rem] top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-accent bg-card" />
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent-text">
                <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="text-[14px] font-semibold">{title}</span>
                <span className="text-[12.5px] text-muted-foreground">{text}</span>
              </span>
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
              </span>
            </div>
          ))}
        </div>

        <ul className="nx-rise flex flex-wrap gap-2" style={{ ["--i" as string]: 14 }}>
          {FORMULA_POINTS.map((line) => (
            <li key={line} className="flex items-center gap-2 rounded-full bg-accent-subtle/60 px-4 py-2 text-[12.5px] text-foreground">
              <Check aria-hidden="true" className="size-3.5 shrink-0 text-accent-text" strokeWidth={3} />
              {line}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ol className="relative flex flex-1 flex-col justify-center gap-3.5">
      {/* La línea que une los pasos. */}
      <span aria-hidden="true" className="absolute bottom-[3.2rem] left-[2.05rem] top-[3.2rem] w-0.5 rounded-full bg-border-strong/50" />
      {ROADMAP.map(({ title, hint }, i) => (
        <li key={title} className={cn(card, "nx-rise relative flex items-center gap-4 px-4 py-3.5")} style={{ ["--i" as string]: i + 3 }}>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-display text-sm font-semibold text-ink">{i + 1}</span>
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
