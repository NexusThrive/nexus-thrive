"use client";

import { ViewTransition } from "react";
import { Building2, CalendarDays, FileSpreadsheet, HandCoins, LineChart, MapPin, MessageCircleWarning, NotebookPen, Receipt, Sparkles, StickyNote, User, Users, Wallet } from "lucide-react";
import { EyeTracker } from "@/components/atoms/eye-tracker";
import { getVerticalIcon } from "@/lib/experience/vertical-icons";
import { VERTICAL_LABELS, type VerticalValue } from "@/lib/core/sectors/verticals";
import { MODULE_LABELS, type ModuleValue } from "@/lib/core/capabilities/modules";
import { MODULE_ICONS } from "@/lib/experience/onboarding/module-meta";
import type { FlowStep } from "@/lib/experience/onboarding/flow";
import { guideLine, type GuideContext } from "@/lib/experience/onboarding/guide";
import { useTypedText } from "@/lib/experience/hooks/use-typed-text";
import { cn } from "@/lib/utils";

export type ScenePreview = {
  name: string;
  slug: string;
  vertical: VerticalValue | null;
  city: string;
  tenantType: "INDIVIDUAL" | "COMPANY" | null;
  planName?: string;
  modules: { module: ModuleValue; price?: string }[];
  /** Precio mensual sin símbolo ("58", "84.40"). */
  price?: string;
};

/* Papeles del «caos» de la presentación: posición inicial en px respecto al centro del escenario. */
const CHAOS = [
  { icon: FileSpreadsheet, label: "clientes_final_v3.xlsx", x: -120, y: -70, r: -6 },
  { icon: MessageCircleWarning, label: "37 chats sin leer", x: 90, y: -90, r: 5 },
  { icon: NotebookPen, label: "Caja: ¿$ 230.000?", x: -110, y: 10, r: 4 },
  { icon: StickyNote, label: "Llamar a Marta", x: 100, y: 30, r: -5 },
  { icon: Receipt, label: "Facturas sueltas", x: -10, y: 80, r: 3 },
];

/** Las piezas que NEXUS conecta (el «orden» de la presentación). */
const ORDER = [
  { icon: Users, label: "Clientes", text: "Cada persona con su historial" },
  { icon: HandCoins, label: "Cobros", text: "Pagos que se registran solos" },
  { icon: Wallet, label: "Caja", text: "Lo que entra y sale, al día" },
  { icon: LineChart, label: "Finanzas", text: "Cuánto ganas, de un vistazo" },
];

/**
 * Lado izquierdo del onboarding: AURI explica cada paso (la frase se escribe letra a letra y su cara cambia) y debajo se arma, en vivo, el
 * relleno de datos del paso: el caos que se vuelve orden en la presentación, el perfil elegido y la vista previa del espacio con lo que
 * la persona va escribiendo.
 */
export function OnboardingScene({
  mode,
  introSlide = 0,
  preview,
  step = mode === "intro" ? "intro" : "business",
  guide,
  auriHandoff = false,
}: {
  mode: "intro" | "preview";
  introSlide?: number;
  preview: ScenePreview;
  /** Paso actual (decide lo que AURI dice y el relleno que se muestra). */
  step?: FlowStep;
  /** Contexto para que AURI hable de lo que la persona ya escribió. */
  guide?: GuideContext;
  /** El negocio se está creando: AURI sale de aquí hacia el centro de la pantalla de creación (View Transition compartida `nx-auri`). */
  auriHandoff?: boolean;
}) {
  const line = guideLine(step, introSlide, { ...guide, businessName: guide?.businessName ?? preview.name, tenantType: guide?.tenantType ?? preview.tenantType });
  const { typed, typing } = useTypedText(line.text);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-5">
      {/* AURI y lo que dice */}
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4">
        <div className="relative grid size-[150px] shrink-0 place-items-center">
          <span aria-hidden="true" className="absolute size-[150px] rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,var(--card))]" />
          <span aria-hidden="true" className="absolute size-[118px] rounded-full bg-[color-mix(in_srgb,var(--accent)_24%,var(--card))]" />
          {auriHandoff ? (
            <div className="size-24" />
          ) : (
            <ViewTransition name="auri-onboarding" share="nx-auri" default="none">
              <div className="size-24">
                <EyeTracker fit decorative poke={false} follow={60} size={96} shape="Ball" eyeScale={1.2} mood={line.mood} speaking={typing} />
              </div>
            </ViewTransition>
          )}
        </div>
        <p className="sr-only" aria-live="polite">{line.text}</p>
        <p aria-hidden="true" className="relative min-h-[4.5rem] w-full rounded-3xl border border-border bg-card px-5 py-3.5 font-display text-[17px] font-medium leading-snug tracking-[-0.01em] shadow-[0_1px_2px_rgba(10,10,11,.04),0_14px_32px_rgba(10,10,11,.07)]">
          <span className="absolute -top-[7px] left-1/2 size-3.5 -translate-x-1/2 rotate-45 border-l border-t border-border bg-card" />
          {typed}
          <span className={cn("ml-0.5 inline-block h-[1.05em] w-0.5 translate-y-[0.18em] bg-[var(--nx-gold-600)]", !typing && "motion-safe:animate-pulse")} />
        </p>
      </div>

      {/* El relleno de datos del paso */}
      <div className="flex min-h-0 w-full flex-1 justify-center overflow-y-auto py-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-28px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* `my-auto` centra cuando sobra espacio y, si el relleno es más alto, se desplaza dentro sin subir sobre el texto de AURI. */}
        <div className="my-auto flex w-full justify-center pb-4">
        {mode === "intro" ? <IntroFill ordered={introSlide > 0} /> : step === "profile" ? <ProfileFill type={preview.tenantType} /> : <BusinessPreview preview={preview} />}
        </div>
      </div>
    </div>
  );
}

function IntroFill({ ordered }: { ordered: boolean }) {
  return (
    <div className="relative grid h-[230px] w-full max-w-[420px] place-items-center">
      {ordered ? (
        <ul className="grid w-full grid-cols-2 gap-3">
          {ORDER.map(({ icon: Icon, label, text }, i) => (
            <li key={label} className="nx-rise flex flex-col gap-2 rounded-3xl bg-card p-4 shadow-[0_1px_2px_rgba(10,10,11,.04),0_12px_28px_rgba(10,10,11,.07)]" style={{ ["--i" as string]: i }}>
              <span className="grid size-9 place-items-center rounded-full bg-accent-subtle text-accent-text"><Icon aria-hidden="true" className="size-4" /></span>
              <span className="grid">
                <span className="text-ui font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        CHAOS.map(({ icon: Icon, label, x, y, r }, i) => (
          <span key={label} className="absolute left-1/2 top-1/2" style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${r}deg)` }}>
            <span
              className="flex items-center gap-2 whitespace-nowrap rounded-full bg-card px-3.5 py-2 text-[12.5px] text-foreground shadow-[0_8px_20px_rgba(10,10,11,.1)] motion-safe:animate-[nx-float_4s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * -0.8}s` }}
            >
              <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
              {label}
            </span>
          </span>
        ))
      )}
    </div>
  );
}

function ProfileFill({ type }: { type: ScenePreview["tenantType"] }) {
  const items = [
    { key: "INDIVIDUAL", icon: User, title: "Emprendedor", text: "Empiezas sin NIT ni local" },
    { key: "COMPANY", icon: Building2, title: "Empresa", text: "Con NIT y facturación" },
  ] as const;
  return (
    <ul className="grid w-full max-w-[420px] gap-3">
      {items.map(({ key, icon: Icon, title, text }) => {
        const on = type === key;
        return (
          <li key={key} className={cn("flex items-center gap-4 rounded-3xl p-4 transition-all duration-500", on ? "scale-[1.02] bg-card shadow-[0_1px_2px_rgba(10,10,11,.04),0_16px_36px_rgba(10,10,11,.1)] ring-2 ring-accent" : "bg-card/55 opacity-70")}>
            <span className={cn("grid size-11 place-items-center rounded-full", on ? "bg-accent text-ink" : "bg-surface-muted text-muted-foreground")}><Icon aria-hidden="true" className="size-5" /></span>
            <span className="grid">
              <span className="text-ui font-semibold">{title}</span>
              <span className="text-xs text-muted-foreground">{text}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Bar({ className }: { className?: string }) {
  return <span className={cn("block h-2.5 rounded-full bg-surface-muted", className)} />;
}

function BusinessPreview({ preview }: { preview: ScenePreview }) {
  const visual = preview.vertical ? getVerticalIcon(preview.vertical) : null;
  const VerticalIcon = visual?.icon;
  const initial = preview.name.trim().charAt(0).toUpperCase();
  return (
    <div className="w-full max-w-[420px]">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles aria-hidden="true" className="size-3.5 text-accent-text" /> Así se ve tu espacio
      </p>
      <div className="overflow-hidden rounded-[28px] bg-card shadow-[0_1px_2px_rgba(10,10,11,.04),0_20px_44px_rgba(10,10,11,.1)]">
        <div className="flex items-center gap-1.5 border-b border-border/60 px-5 py-3">
          <i className="size-2 rounded-full bg-border-strong" />
          <i className="size-2 rounded-full bg-border-strong" />
          <i className="size-2 rounded-full bg-border-strong" />
          <span className="ml-2 min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            nexusthrive.co/<span className="text-accent-text">{preview.slug || "tu-negocio"}</span>
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3">
            <span
              key={initial || "empty"}
              className={cn("grid size-12 shrink-0 place-items-center rounded-2xl font-display text-lg font-semibold transition-colors duration-500", initial ? "bg-accent text-ink motion-safe:animate-[nx-pop_.5s_var(--nx-ease-spring)]" : "bg-surface-muted text-muted-foreground")}
            >
              {initial || "N"}
            </span>
            <div className="min-w-0 flex-1">
              {preview.name.trim() ? <p className="truncate font-display text-[17px] font-semibold">{preview.name}</p> : <Bar className="w-36" />}
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                {preview.tenantType === "COMPANY" ? <Building2 aria-hidden="true" className="size-3" /> : <User aria-hidden="true" className="size-3" />}
                {preview.tenantType === "COMPANY" ? "Empresa" : preview.tenantType === "INDIVIDUAL" ? "Emprendedor" : "Perfil"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {preview.vertical && VerticalIcon ? (
              <span key={preview.vertical} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-[11.5px] motion-safe:animate-[nx-pop_.45s_var(--nx-ease-spring)]">
                <VerticalIcon aria-hidden="true" className="size-3 text-accent-text" />
                {VERTICAL_LABELS[preview.vertical]}
              </span>
            ) : (
              <Bar className="h-6 w-24 rounded-full" />
            )}
            {preview.city.trim() ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-[11.5px]">
                <MapPin aria-hidden="true" className="size-3 text-muted-foreground" />
                {preview.city}
              </span>
            ) : (
              <Bar className="h-6 w-16 rounded-full" />
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-1.5">
            {preview.modules.length ? (
              preview.modules.map(({ module, price }, i) => {
                const Icon = MODULE_ICONS[module];
                return (
                  <div key={module} className="flex min-w-0 items-center gap-2 rounded-2xl bg-surface-muted/60 px-3 py-2 text-[12px] motion-safe:animate-[nx-rise_.5s_var(--nx-ease-out)_backwards]" style={{ animationDelay: `${i * 40}ms` }}>
                    <Icon aria-hidden="true" className="size-3.5 text-accent-text" />
                    <span className="min-w-0 flex-1 truncate">{MODULE_LABELS[module]}</span>
                    {price ? <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">{price}</span> : null}
                  </div>
                );
              })
            ) : (
              <>
                <Bar className="col-span-2 my-1.5 w-40" />
                <Bar className="col-span-2 my-1.5 w-28" />
                <Bar className="col-span-2 my-1.5 w-32" />
              </>
            )}
          </div>
          {preview.planName ? (
            <p className="mt-4 flex items-center justify-between rounded-2xl bg-accent-subtle px-4 py-2.5 text-ui">
              <span className="inline-flex items-center gap-2 font-medium"><CalendarDays aria-hidden="true" className="size-4 text-accent-text" />{preview.planName}</span>
              {preview.price ? <span className="font-display font-semibold tabular-nums">${preview.price}<span className="text-xs font-normal text-muted-foreground">/mes</span></span> : null}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
