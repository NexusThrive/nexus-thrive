import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/atoms/wordmark";
import { getSurveyByToken } from "@/lib/ops/satisfaction";
import SurveyForm from "./survey-form";

export const metadata: Metadata = { title: "¿Cómo te atendimos? · NEXUS THRIVE", robots: { index: false } };

/** Encuesta pública de satisfacción de un ticket de soporte (sin sesión). */
export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const survey = await getSurveyByToken(token);
  if (!survey) notFound();
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <Wordmark size={22} className="mb-6" />
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-text">{survey.code}</p>
        <h1 className="mt-1 font-display text-[22px] font-bold leading-tight">{survey.subject}</h1>
        {survey.tenantName ? <p className="mt-1 text-sm text-muted-foreground">{survey.tenantName}</p> : null}
        <div className="mt-6">
          {survey.answered ? <p className="text-sm text-muted-foreground">Esta encuesta ya fue respondida. ¡Gracias por tu tiempo!</p> : <SurveyForm token={token} />}
        </div>
      </div>
    </main>
  );
}
