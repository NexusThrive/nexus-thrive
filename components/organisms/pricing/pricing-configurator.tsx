"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToastProvider, useToast } from "@/components/molecules/toast";
import { ClientCounter } from "@/components/molecules/pricing/client-counter";
import { IndustryPicker } from "@/components/molecules/pricing/industry-picker";
import { ModuleOption } from "@/components/molecules/pricing/module-option";
import { TierSelector } from "@/components/molecules/pricing/tier-selector";
import { BASE_MODULES, INDUSTRIES, TIERS, type IndustryKey, type TierKey } from "@/lib/pricing/catalog";
import { pricingStore } from "@/lib/pricing/store";
import {
  availableModules,
  changeIndustry,
  changeTier,
  clampClients,
  effectiveTier,
  formatUSD,
  modulePrice,
  quote as quoteFor,
  selectedModules,
  shouldSuggestSignature,
  signatureAllIn,
  signatureModulePrice,
  tierBasePrice,
  tierFeatures,
} from "@/lib/pricing/calc";
import { cn } from "@/lib/utils";
import { PriceSummary } from "./price-summary";
import styles from "./pricing.module.css";


function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-display text-[15px] font-bold tracking-[-0.01em]">{title}</h3>
        {note ? <small className="text-[12.5px] text-muted-foreground">{note}</small> : null}
      </div>
      {children}
    </section>
  );
}

function Configurator() {
  const { toast } = useToast();
  // La última configuración de este navegador (no sale de aquí).
  const state = useSyncExternalStore(pricingStore.subscribe, pricingStore.getSnapshot, pricingStore.getServerSnapshot);
  const setState = pricingStore.update;
  const [showBar, setShowBar] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Barra fija en móvil mientras el resumen no está a la vista.
  useEffect(() => {
    const el = summaryRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowBar(!entry.isIntersecting && window.innerWidth < 960),
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const effective = effectiveTier(state);
  const quote = useMemo(() => quoteFor(state), [state]);
  const modules = availableModules(state.industry);
  const chosen = new Set(state.modules);
  const count = selectedModules(state).length;

  const setTier = (tier: TierKey) => setState((s) => changeTier(s, tier, s.kept));
  const setIndustry = (industry: IndustryKey) => {
    setState((s) => changeIndustry(s, industry));
    toast(`Precios ajustados para ${INDUSTRIES[industry].name.toLowerCase()}`);
  };
  const toggleModule = (key: string, on: boolean) =>
    setState((s) => ({ ...s, modules: on ? [...s.modules, key] : s.modules.filter((k) => k !== key) }));
  const nudgeElite = () =>
    toast({ title: "Los módulos se activan desde Elite", undo: () => setTier("elite"), description: "Pulsa Deshacer para cambiar a Elite." });

  const priceText = (m: (typeof modules)[number]) =>
    state.tier === "signature" ? (
      <>
        <s className="mr-1 text-[11px] text-muted-foreground">${modulePrice(m, state.industry)}</s>+{formatUSD(signatureModulePrice(m, state.industry))}
      </>
    ) : (
      `+$${modulePrice(m, state.industry)}`
    );

  const ctaHref = `/sign-up?plan=${effective}`;
  const industry = INDUSTRIES[state.industry];

  return (
    <>
      <section className={styles.cfg} data-tier={state.tier} data-pre={effective === "pre" ? "" : undefined} aria-label="Configurador de plan">
        <div className="grid min-w-0 gap-[26px] px-[clamp(18px,3vw,32px)] pb-[30px] pt-7">
          <Block title="Nivel" note="Sube o baja cuando quieras">
            <TierSelector
              value={state.tier}
              preSignature={effective === "pre"}
              onChange={setTier}
              prices={{
                essential: "Gratis",
                elite: `desde $${tierBasePrice("elite", state.industry)}/mes`,
                signature: `desde $${tierBasePrice("signature", state.industry)}/mes`,
              }}
            />
          </Block>
          <Block title="Rubro" note="El que elegiste al registrarte">
            <IndustryPicker value={state.industry} onChange={setIndustry} />
          </Block>
          <Block title="Clientes">
            <ClientCounter
              tier={state.tier}
              effective={effective}
              clients={state.clients}
              moduleCount={count}
              onChange={(n) => setState((s) => ({ ...s, clients: clampClients(n) }))}
            />
          </Block>
          <Block title="Módulos" note={state.tier === "essential" ? "Solo módulos base" : `${count} de ${modules.length} activos`}>
            <div className="grid gap-1.5">
              {[
                { label: "Incluido en todos", items: BASE_MODULES.map((m) => ({ ...m, price: 0, base: true })) },
                { label: `Para ${industry.name.toLowerCase()}`, items: industry.modules.map((m) => ({ ...m, base: false })) },
                { label: "Generales", items: modules.slice(industry.modules.length).map((m) => ({ ...m, base: false })) },
              ].map((group) => (
                <div key={group.label} className="grid gap-1.5">
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground after:h-px after:flex-1 after:bg-border first:mt-0">
                    {group.label}
                  </div>
                  {group.items.map((m, i) => (
                    <ModuleOption
                      key={`${state.industry}-${m.key}`}
                      index={i}
                      icon={m.icon}
                      name={m.name}
                      description={m.description}
                      state={m.base ? "base" : state.tier === "essential" ? "locked" : chosen.has(m.key) ? "on" : "off"}
                      price={m.base ? "Incluido" : priceText(m)}
                      onToggle={(on) => toggleModule(m.key, on)}
                      onLocked={nudgeElite}
                    />
                  ))}
                </div>
              ))}
            </div>
          </Block>
        </div>
        <div ref={summaryRef} className="contents">
          <PriceSummary
            tier={effective}
            quote={quote}
            billing={state.billing}
            onBillingChange={(billing) => setState((s) => ({ ...s, billing }))}
            features={tierFeatures(state)}
            ctaHref={ctaHref}
            suggestion={shouldSuggestSignature(state) ? { price: signatureAllIn(state), onAccept: () => setTier("signature") } : undefined}
          />
        </div>
      </section>

      <div
        data-tier={state.tier}
        className={cn(
          styles.cfg,
          "fixed inset-x-0 bottom-0 z-20 !grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-none border-x-0 border-b-0 bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] px-[max(16px,env(safe-area-inset-left,0px))] pb-[calc(10px+env(safe-area-inset-bottom,0px))] pt-2.5 !shadow-none backdrop-blur-[12px] transition-transform duration-[400ms] ease-[var(--nx-ease-out)] min-[960px]:hidden",
          showBar ? "translate-y-0" : "translate-y-[110%]",
        )}
      >
        <div className="min-w-0 leading-tight">
          <small className="block font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--acc)]">Thrive {TIERS[effective].name}</small>
          <b className="font-display text-xl font-bold tabular-nums">{effective === "essential" ? "Gratis" : formatUSD(quote.monthly)}</b>
          {effective !== "essential" ? <span className="text-xs text-muted-foreground"> /mes</span> : null}
        </div>
        <Link href={ctaHref} className={cn(styles.cta, "inline-flex h-[42px] items-center gap-2 rounded-md px-4 text-[13.5px] font-semibold")}>
          Elegir <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </>
  );
}

/**
 * Configurador de precios: nivel, rubro, clientes y módulos a la izquierda;
 * resumen con el precio a la derecha (debajo en móvil, con una barra fija
 * mientras no se ve). Toda la aritmética vive en lib/pricing (probada); aquí
 * solo hay estado e interfaz. La configuración se recuerda en el navegador.
 */
export function PricingConfigurator() {
  return (
    <ToastProvider>
      <Configurator />
    </ToastProvider>
  );
}

