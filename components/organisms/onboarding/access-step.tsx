"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Gift, KeyRound, Loader2, MessageCircle, X } from "lucide-react";
import { claimAccessCodeAction, clearAccessCodeAction } from "@/app/onboarding/actions";
import type { OnboardingBenefit } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";
import { accessRequestMessage, whatsappLink } from "@/lib/contact";
import { BenefitCard } from "./benefit-card";

type Mode = "code" | "paid" | "free";

export type AccessPlan = {
  key: string;
  name: string;
  tagline: string;
};

/**
 * Paso "Elige cómo empezar" del piloto: sin precios a la vista y tres caminos.
 *
 * 1. Código de acceso (promocional o pagado) → lo reconoce el sistema.
 * 2. Quiero un plan → se coordina el pago por WhatsApp con NEXUS (aquí no
 *    hay cobro automático) y NEXUS entrega un código con los días pagados.
 * 3. Probar gratis → el plan Essential, sin costo.
 *
 * El código tecleado solo se valida y deja la cookie `nx_benefit`; el canje y
 * el plan definitivo los decide el servidor al crear el negocio.
 */
export function AccessStep({
  planName,
  freePlanName,
  plans,
  businessName,
  city,
  benefit,
  onBenefit,
}: {
  planName: string;
  freePlanName: string;
  plans: AccessPlan[];
  businessName?: string;
  city?: string;
  benefit: OnboardingBenefit | null;
  onBenefit: (benefit: OnboardingBenefit | null) => void;
}) {
  const [mode, setMode] = useState<Mode>("code");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function validate(event: FormEvent) {
    event.preventDefault();
    if (busy || !raw.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await claimAccessCodeAction(raw);
      if (result.ok) {
        onBenefit({
          code: result.code,
          plan: result.plan,
          kind: result.kind,
          durationDays: result.durationDays,
        });
        setRaw("");
        return;
      }
      setError(result.message);
    });
  }

  function dropCode() {
    setError(null);
    startTransition(async () => {
      await clearAccessCodeAction();
      onBenefit(null);
    });
  }

  if (benefit) {
    return (
      <div className="grid gap-3">
        <BenefitCard
          planName={planName}
          durationDays={benefit.durationDays}
          code={benefit.code}
          kind={benefit.kind}
        />
        <button
          type="button"
          onClick={dropCode}
          disabled={busy}
          className="inline-flex items-center gap-2 justify-self-start rounded-sm border border-border px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {busy ? (
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          ) : (
            <X aria-hidden="true" className="size-3.5" />
          )}
          Quitar el código y empezar gratis
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <OptionCard
        active={mode === "code"}
        onSelect={() => setMode("code")}
        icon={<KeyRound aria-hidden="true" className="size-4" />}
        title="Tengo un código de acceso"
        detail="Te lo entrega NEXUS con la tarjeta o al confirmar tu pago."
      />
      <OptionCard
        active={mode === "paid"}
        onSelect={() => setMode("paid")}
        icon={<MessageCircle aria-hidden="true" className="size-4" />}
        title="Quiero activar un plan"
        detail="Coordinamos el pago por WhatsApp y te damos un código con los días."
      />
      <OptionCard
        active={mode === "free"}
        onSelect={() => setMode("free")}
        icon={<Gift aria-hidden="true" className="size-4" />}
        title="Quiero probar gratis"
        detail={`Empiezas con Thrive ${freePlanName}, sin límite de tiempo y sin tarjeta.`}
      />

      {mode === "code" ? (
        <form onSubmit={validate} className="grid gap-2">
          <label
            htmlFor="nx-access-code"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Código de acceso
          </label>
          <input
            id="nx-access-code"
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value.toUpperCase());
              if (error) setError(null);
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="ELITE30"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "nx-access-code-error" : undefined}
            className="w-full rounded-sm border border-border bg-surface px-3 py-2.5 font-mono text-[16px] font-semibold uppercase tracking-[0.14em] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/70 focus:border-accent focus:outline-none"
          />
          {error ? (
            <p id="nx-access-code-error" className="text-[13px] text-destructive">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !raw.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {busy ? "Validando…" : "Validar código"}
          </button>
        </form>
      ) : mode === "paid" ? (
        <div className="grid gap-2">
          <p className="text-[13px] text-muted-foreground">
            Todavía no hay pago en línea: escríbenos, confirmamos el pago y te entregamos un
            código con los días que contrataste.
          </p>
          <ul className="grid gap-2">
            {plans.map((plan) => (
              <li
                key={plan.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-surface px-3.5 py-3"
              >
                <span className="grid gap-0.5">
                  <span className="font-display text-[14.5px] font-bold">Thrive {plan.name}</span>
                  <span className="text-[12.5px] text-muted-foreground">{plan.tagline}</span>
                </span>
                <a
                  href={whatsappLink(
                    accessRequestMessage({ planName: plan.name, businessName, city }),
                  )}
                  target="_blank"
                  rel="noreferrer"
                  data-mag=""
                  className="inline-flex items-center gap-1.5 rounded-sm border border-accent px-3 py-1.5 text-[13px] font-semibold text-accent-text transition-colors hover:bg-accent-subtle/40"
                >
                  <MessageCircle aria-hidden="true" className="size-3.5" />
                  Coordinar pago
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-sm border border-dashed border-border bg-surface-muted px-3.5 py-3 text-[13px] text-muted-foreground">
          Perfecto: eliges el rubro, los módulos y terminas con Thrive {freePlanName}. NEXUS
          administra los planes por ti; no se cobra nada.
        </p>
      )}
    </div>
  );
}

function OptionCard({
  active,
  onSelect,
  icon,
  title,
  detail,
}: {
  active: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-left transition-colors",
        active ? "border-accent bg-accent-subtle/50" : "border-border bg-surface hover:border-muted-foreground/40",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          active ? "bg-accent text-accent-foreground" : "bg-surface-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="grid gap-1">
        <span className="font-display text-[15px] font-bold leading-tight">{title}</span>
        <span className="text-[12.5px] text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}
