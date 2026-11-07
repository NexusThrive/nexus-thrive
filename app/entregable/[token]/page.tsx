import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/atoms/wordmark";
import { DELIVERABLE_TEXT } from "@/lib/business/customers/deliverables";
import { getForReview } from "@/lib/business/customers/deliverables-db";
import ReviewForm from "./review-form";

export const metadata: Metadata = { title: "Revisar entrega · NEXUS THRIVE", robots: { index: false } };

/** Revisión pública de un entregable: el cliente ve los archivos y aprueba o pide cambios, sin sesión (solo con el enlace). */
export default async function DeliverableReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getForReview(token);
  if (!view) notFound();
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <Wordmark size={22} className="mb-6" />
        <p className="text-sm text-muted-foreground">{view.businessName}</p>
        <h1 className="mt-1 break-words font-display text-xl font-bold leading-tight">{view.title}</h1>
        {view.description ? <p className="mt-2 break-words text-sm">{view.description}</p> : null}
        <ul className="mt-4 grid gap-2">
          {view.files.map((f) => (
            <li key={f.id}>
              <a href={`/entregable/${token}/archivo/${f.id}`} target="_blank" rel="noopener noreferrer" className="break-all text-sm underline underline-offset-2">{f.fileName}</a>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          {view.status === "IN_REVIEW" ? (
            <ReviewForm token={token} />
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              {DELIVERABLE_TEXT[view.status]}
              {view.decidedByName ? ` por ${view.decidedByName}` : ""}
              {view.decidedAt ? ` el ${view.decidedAt.slice(0, 10)}` : ""}.
              {view.clientComment ? ` «${view.clientComment}»` : ""}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
