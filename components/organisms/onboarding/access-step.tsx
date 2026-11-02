"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Gift, KeyRound, Loader2, MessageCircle, X } from "lucide-react";
import { claimAccessCodeAction, clearAccessCodeAction } from "@/app/onboarding/actions";
import type { OnboardingBenefit } from "@/lib/core/tenancy/onboarding/types";
import { Field } from "@/components/molecules/field";
import { FormDialog } from "@/components/organisms/form-sheet";
import { inputClasses } from "@/components/atoms/input";
import { cn } from "@/lib/utils";
import { accessRequestMessage, whatsappLink } from "@/lib/foundation/contact";
import { BenefitCard } from "./benefit-card";

type Mode = "free" | "paid";

export type AccessPlan = {
  key: string;
  name: string;
  tagline: string;
};

/**
 * Paso "Elige cómo empezar" del piloto: sin precios a la vista y tres opciones.
 *
 * 1. Probar 15 días gratis (por defecto) → sin tarjeta; la prueba se activa al crear el negocio.
 * 2. Código de acceso (promocional o pagado) → se escribe en un diálogo y lo reconoce el sistema.
 * 3. Quiero un plan → se coordina el pago por WhatsApp con NEXUS (aquí no
 *    hay cobro automático) y NEXUS entrega un código con los días pagados.
 *
 * El código tecleado solo se valida y deja la cookie `nx_benefit`; el canje y
 * el plan definitivo los decide el servidor al crear el negocio.
 */
export function AccessStep({
  planName,
  plans,
  businessName,
  city,
  benefit,
  onBenefit,
}: {
  planName: string;
  plans: AccessPlan[];
  businessName?: string;
  city?: string;
  benefit: OnboardingBenefit | null;
  onBenefit: (benefit: OnboardingBenefit | null) => void;
}) {
  const [mode, setMode] = useState<Mode>("free");
  const [codeOpen, setCodeOpen] = useState(false);
  const [busy, startTransition] = useTransition();

  function dropCode() {
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
          Quitar el código y probar 15 días gratis
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <OptionCard
        active={mode === "free"}
        onSelect={() => setMode("free")}
        icon={<Gift aria-hidden="true" className="size-4" />}
        title="Quiero probar 15 días gratis"
        detail="Sin tarjeta y sin compromiso. Puedes usar un código o activar un plan cuando quieras."
      />
      <OptionCard
        active={false}
        popup
        onSelect={() => setCodeOpen(true)}
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

      <FormDialog
        open={codeOpen}
        onOpenChange={setCodeOpen}
        title="Código de acceso"
        description="Escríbelo tal como te lo entregó NEXUS."
        submitLabel="Validar código"
        pendingLabel="Validando…"
        size="sm"
        onSubmit={async (formData) => {
          const result = await claimAccessCodeAction(String(formData.get("code") ?? ""));
          if (!result.ok) return { ok: false, message: result.message, fieldErrors: { code: result.message } };
          onBenefit({ code: result.code, plan: result.plan, kind: result.kind, durationDays: result.durationDays });
          return { ok: true };
        }}
      >
        {({ fieldErrors }) => (
          <Field label="Código" required error={fieldErrors.code}>
            {(control) => (
              <input
                {...control}
                name="code"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="Código"
                className={cn(inputClasses, "font-mono font-semibold uppercase tracking-[0.14em] placeholder:font-normal placeholder:normal-case placeholder:tracking-normal")}
              />
            )}
          </Field>
        )}
      </FormDialog>

      {mode === "paid" ? (
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
      ) : null}
    </div>
  );
}

function OptionCard({
  active,
  onSelect,
  icon,
  title,
  detail,
  popup = false,
}: {
  active: boolean;
  /** Abre un diálogo: sin estado «activo», para que el diálogo nazca del color neutro de la tarjeta. */
  popup?: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={popup ? undefined : active}
      aria-haspopup={popup ? "dialog" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-6 text-left transition-colors",
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
