import { Check, Gift, Sparkles } from "lucide-react";
import { benefitCopy } from "@/lib/benefits/benefits";

/**
 * Tarjeta del paso "Elige cómo empezar" cuando hay un código de acceso (de la
 * tarjeta NFC/QR o tecleado). El texto depende del tipo de código: un regalo
 * se anuncia como "N días gratis"; un acceso pagado se anuncia como "cuenta
 * activada" (nunca "gratis", porque ya se pagó).
 */
export function BenefitCard({
  planName,
  durationDays,
  code,
  kind = "PROMO",
}: {
  planName: string;
  durationDays: number;
  code: string;
  kind?: "PROMO" | "PAID";
}) {
  const copy = benefitCopy(kind, { planName, durationDays });
  const paid = kind === "PAID";

  return (
    <div className="overflow-hidden rounded-lg border border-gold-300 bg-surface">
      <div className="flex items-center gap-3 bg-gold-100 px-5 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-500 text-ink">
          <Gift aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="font-display text-[17px] font-bold">{copy.title}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {copy.subtitle} · código <span className="font-mono">{code}</span>
          </p>
        </div>
      </div>
      <ul className="grid gap-2 px-5 py-4 text-[13px]">
        <li className="flex items-center gap-2">
          <Check aria-hidden="true" className="size-4 text-accent-text" />
          {paid
            ? `Tu acceso quedó activo y lasts ${durationDays} días.`
            : `Empiezas hoy y no pagas nada durante ${durationDays} días.`}
        </li>
        <li className="flex items-center gap-2">
          <Check aria-hidden="true" className="size-4 text-accent-text" />
          Todos los módulos de tu rubro incluidos en el plan {planName}.
        </li>
        <li className="flex items-center gap-2">
          <Check aria-hidden="true" className="size-4 text-accent-text" />
          {paid
            ? "Sin tarjeta de crédito: el acceso se activa al crear tu negocio."
            : "Sin tarjeta de crédito: el regalo se activa solo al crear tu negocio."}
        </li>
      </ul>
      <p className="flex items-center gap-2 border-t border-border px-5 py-3 text-[12px] text-muted-foreground">
        <Sparkles aria-hidden="true" className="size-3.5 text-gold-600" />
        {paid
          ? "Si necesitas más tiempo, escríbenos y lo extendemos."
          : "Al terminar el mes puedes seguir con este plan o cambiar al que prefieras."}
      </p>
    </div>
  );
}
