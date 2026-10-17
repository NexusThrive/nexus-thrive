"use client";

import { Building2, FileSpreadsheet, MapPin, MessageCircleWarning, NotebookPen, Receipt, StickyNote, User } from "lucide-react";
import { NMark } from "@/components/atoms/n-mark";
import { Odometer } from "@/components/atoms/odometer";
import { getVerticalIcon } from "@/lib/admin/vertical-icons";
import { MODULE_LABELS, VERTICAL_LABELS, type ModuleValue, type VerticalValue } from "@/lib/admin-catalogs";
import { MODULE_ICONS } from "@/lib/onboarding/module-meta";
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

/* Papeles del "caos" (presentación): posición inicial en % del escenario. */
const CHAOS = [
  { icon: FileSpreadsheet, label: "clientes_final_v3.xlsx", x: -120, y: -150, r: -8 },
  { icon: MessageCircleWarning, label: "37 chats sin leer", x: 110, y: -110, r: 6 },
  { icon: NotebookPen, label: "Caja: ¿$ 230.000?", x: -140, y: 60, r: 5 },
  { icon: StickyNote, label: "Llamar a Marta", x: 120, y: 120, r: -6 },
  { icon: Receipt, label: "Facturas sueltas", x: -30, y: 170, r: 3 },
];

/**
 * Escena animada del panel de marca del onboarding.
 *
 * - Presentación: papeles y chats flotando alrededor de la N (el caos); desde
 *   la segunda diapositiva convergen hacia ella y la N se llena (el orden).
 * - Resto de pasos: la vista previa del negocio, que se arma en vivo con lo
 *   que el usuario escribe (nombre, enlace, rubro, módulos, plan y precio).
 */
export function OnboardingScene({
  mode,
  introSlide = 0,
  preview,
}: {
  mode: "intro" | "preview";
  introSlide?: number;
  preview: ScenePreview;
}) {
  if (mode === "intro") return <ChaosScene ordered={introSlide > 0} />;
  return <BusinessPreview preview={preview} />;
}

function ChaosScene({ ordered }: { ordered: boolean }) {
  return (
    <div className="relative grid size-[360px] place-items-center">
      <div
        className={cn(
          "absolute size-56 rounded-full bg-accent/20 blur-3xl transition-opacity duration-1000",
          ordered ? "opacity-100" : "opacity-0",
        )}
      />
      <NMark size={120} state={ordered ? "done" : "loop"} className={cn("relative text-white transition-transform duration-700 [&_.o]:[stroke-opacity:.45]", ordered && "scale-110")} />
      {CHAOS.map(({ icon: Icon, label, x, y, r }, i) => (
        <span
          key={label}
          className="absolute left-1/2 top-1/2 transition-[transform,opacity] duration-[900ms] ease-[var(--nx-ease-out)] motion-reduce:transition-none"
          style={{
            transform: ordered
              ? "translate(-50%,-50%) scale(.3)"
              : `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${r}deg)`,
            opacity: ordered ? 0 : 1,
            transitionDelay: `${i * 70}ms`,
          }}
        >
          <span
            className="flex items-center gap-2 whitespace-nowrap rounded-md border border-white/12 bg-white/[.06] px-3 py-2 text-[12.5px] text-white/80 backdrop-blur-sm motion-safe:animate-[nx-float_4s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * -0.8}s` }}
          >
            <Icon aria-hidden="true" className="size-3.5 text-white/55" />
            {label}
          </span>
        </span>
      ))}
    </div>
  );
}

function Bar({ className }: { className?: string }) {
  return <span className={cn("block h-2.5 rounded-full bg-white/10", className)} />;
}

function BusinessPreview({ preview }: { preview: ScenePreview }) {
  const visual = preview.vertical ? getVerticalIcon(preview.vertical) : null;
  const VerticalIcon = visual?.icon;
  const initial = preview.name.trim().charAt(0).toUpperCase();
  return (
    <div className="w-full max-w-[360px]">
      <p className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/45">Vista previa de tu espacio</p>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[.04] shadow-[0_30px_60px_-30px_rgba(0,0,0,.8)] backdrop-blur">
        <div className="flex items-center gap-1.5 border-b border-white/8 px-4 py-2.5">
          <i className="size-2 rounded-full bg-white/15" />
          <i className="size-2 rounded-full bg-white/15" />
          <i className="size-2 rounded-full bg-white/15" />
          <span className="ml-2 min-w-0 truncate font-mono text-[11px] text-white/45">
            nexusthrive.co/<span className="text-accent">{preview.slug || "tu-negocio"}</span>
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3">
            <span
              key={initial || "empty"}
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-lg font-display text-lg font-bold transition-colors duration-500",
                initial ? "bg-accent text-ink motion-safe:animate-[nx-pop_.5s_var(--nx-ease-spring)]" : "bg-white/8 text-white/30",
              )}
            >
              {initial || "N"}
            </span>
            <div className="min-w-0 flex-1">
              {preview.name.trim() ? (
                <p className="truncate font-display text-[17px] font-bold text-white">{preview.name}</p>
              ) : (
                <Bar className="w-36" />
              )}
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/50">
                {preview.tenantType === "COMPANY" ? (
                  <Building2 aria-hidden="true" className="size-3" />
                ) : (
                  <User aria-hidden="true" className="size-3" />
                )}
                {preview.tenantType === "COMPANY" ? "Empresa" : preview.tenantType === "INDIVIDUAL" ? "Emprendedor" : "Perfil"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {preview.vertical && VerticalIcon ? (
              <span key={preview.vertical} className="inline-flex items-center gap-1.5 rounded-sm bg-white/8 px-2 py-1 text-[11.5px] text-white/80 motion-safe:animate-[nx-pop_.45s_var(--nx-ease-spring)]">
                <VerticalIcon aria-hidden="true" className="size-3 text-accent" />
                {VERTICAL_LABELS[preview.vertical]}
              </span>
            ) : (
              <Bar className="h-[22px] w-24 rounded-sm" />
            )}
            {preview.city.trim() ? (
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-white/8 px-2 py-1 text-[11.5px] text-white/80">
                <MapPin aria-hidden="true" className="size-3 text-white/50" />
                {preview.city}
              </span>
            ) : (
              <Bar className="h-[22px] w-16 rounded-sm" />
            )}
          </div>

          <div className="mt-5 grid gap-1">
            {preview.modules.length ? (
              preview.modules.map(({ module, price }, i) => {
                const Icon = MODULE_ICONS[module];
                return (
                  <div
                    key={module}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] text-white/80 motion-safe:animate-[nx-rise_.5s_var(--nx-ease-out)_backwards]"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <Icon aria-hidden="true" className="size-3.5 text-accent" />
                    <span className="flex-1">{MODULE_LABELS[module]}</span>
                    {price ? <span className="font-mono text-[11px] text-white/45">{price}</span> : null}
                  </div>
                );
              })
            ) : (
              <>
                <Bar className="my-1.5 w-40" />
                <Bar className="my-1.5 w-28" />
                <Bar className="my-1.5 w-32" />
              </>
            )}
          </div>
        </div>

        {preview.planName ? (
          <div className="flex items-end justify-between gap-3 border-t border-white/8 bg-white/[.03] px-5 py-4">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/45">Plan</p>
              <p className="font-display text-[15px] font-bold text-white">
                Thrive <span className="text-accent">{preview.planName}</span>
              </p>
            </div>
            <p className="flex items-baseline gap-1 text-white">
              <Odometer value={preview.price ?? "0"} prefix="$" className="font-display text-[30px] font-bold leading-none" />
              <span className="text-[12px] text-white/50">USD/mes</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
