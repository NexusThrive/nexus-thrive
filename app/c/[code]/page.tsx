import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Wordmark } from "@/components/atoms/wordmark";
import { homeTenantFor } from "@/lib/tenant/membership";
import { normalizeBenefitCode } from "@/lib/benefits/benefits";
import { getBenefitByCode } from "@/lib/benefits/benefits-db";
import { claimBenefitAction, redeemBenefitAction } from "./actions";

export const metadata: Metadata = {
  title: "Reclama tu mes gratis · NEXUS THRIVE",
  robots: { index: false },
};

const PLAN_LABELS: Record<string, string> = {
  ESSENTIAL: "Esencial",
  ELITE: "Elite",
  SIGNATURE: "Signature",
};

/**
 * Página pública de la tarjeta NFC/QR. Es el destino de la URL grabada en la
 * tarjeta física: `/{base}/c/{code}`. Muestra el acceso y el botón para
 * reclamarlo, resolviendo el caso según haya sesión y negocio. El texto
 * depende del tipo: un regalo se anuncia como "gratis" y un acceso pagado como
 * "cuenta activada".
 */
export default async function BenefitPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ estado?: string }>;
}) {
  const { code: raw } = await params;
  const { estado } = await searchParams;
  const code = normalizeBenefitCode(raw);
  const benefit = code ? await getBenefitByCode(code) : null;
  const paid = benefit?.kind === "PAID";
  const planLabel = benefit ? (PLAN_LABELS[benefit.plan] ?? benefit.plan) : "";

  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 py-10">
      <article className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white text-ink shadow-xl">
        <header className="grid justify-items-center gap-2 border-b border-black/5 bg-paper px-6 py-6 text-center">
          <Wordmark size={18} />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {paid ? "Código de acceso" : "Tarjeta de beneficio"}
          </p>
        </header>

        {!benefit ? (
          <Body title="Código no encontrado">
            <p className="text-sm text-muted-foreground">
              Revisa el enlace de la tarjeta o pide uno nuevo. Si crees que es un
              error, escríbenos.
            </p>
          </Body>
        ) : estado === "ok" ? (
          <Body title={paid ? "¡Cuenta activada!" : "¡Beneficio activado!"}>
            <p className="text-sm text-muted-foreground">
              Tu negocio ya tiene{" "}
              <span className="font-semibold text-ink">
                {benefit.durationDays} días de {planLabel} {paid ? "de acceso" : "gratis"}
              </span>
              . Ya puedes usar todos los módulos del plan.
            </p>
            <Link
              href="/auth/callback"
              className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-ink px-6 text-sm font-semibold text-white transition hover:bg-black"
            >
              Entrar a mi negocio
            </Link>
          </Body>
        ) : benefit.status !== "active" ? (
          <Body title="Acceso no disponible">
            <p className="text-sm text-muted-foreground">{benefit.message}</p>
          </Body>
        ) : (
          <ActiveBenefit
            code={code}
            plan={benefit.plan}
            days={benefit.durationDays}
            paid={paid}
          />
        )}

        <footer className="flex items-center justify-center gap-2 border-t border-black/5 bg-paper px-6 py-3 text-[11px] text-muted-foreground">
          Hecho con <Wordmark size={12} />
        </footer>
      </article>
    </main>
  );
}

function Body({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 px-6 py-7 text-center">
      <h1 className="font-display text-xl font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

async function ActiveBenefit({
  code,
  plan,
  days,
  paid,
}: {
  code: string;
  plan: string;
  days: number;
  paid: boolean;
}) {
  const { userId } = await auth();
  let hasTenant = false;
  if (userId) {
    hasTenant = (await homeTenantFor(userId)) !== null;
  }
  const planLabel = PLAN_LABELS[plan] ?? plan;

  return (
    <div className="grid gap-4 px-6 py-7 text-center">
      <h1 className="font-display text-xl font-bold tracking-tight">
        {paid
          ? `Activa tu cuenta en ${planLabel}`
          : `${days} días de ${planLabel} gratis`}
      </h1>
      <p className="text-sm text-muted-foreground">
        {paid
          ? "Tu pago ya está confirmado: activa el acceso y empieza a usar NEXUS."
          : !userId
            ? "Crea tu cuenta en minutos y reclama el mes de regalo. No pedimos tarjeta."
            : hasTenant
              ? "Aplica el mes de regalo a tu negocio ahora mismo."
              : "Termina de crear tu negocio y reclama el mes de regalo."}
      </p>
      <form action={hasTenant ? redeemBenefitAction : claimBenefitAction}>
        <input type="hidden" name="code" value={code} />
        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-ink px-6 text-sm font-semibold text-white transition hover:bg-black"
        >
          {paid
            ? "Activar mi cuenta"
            : hasTenant
              ? "Activar mi mes gratis"
              : userId
                ? "Terminar registro y reclamar"
                : "Crear cuenta y reclamar"}
        </button>
      </form>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Código {code}
      </p>
    </div>
  );
}
