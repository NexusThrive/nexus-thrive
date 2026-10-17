"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { textareaClasses } from "@/components/atoms/input";
import { SCORE_LABELS } from "@/lib/ops/satisfaction-rules";
import { cn } from "@/lib/utils";
import { answerSurveyAction } from "./actions";

export default function SurveyForm({ token }: { token: string }) {
  const [score, setScore] = useState(0);
  const [nps, setNps] = useState("");
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done)
    return (
      <div className="nx-rise grid justify-items-center gap-3 py-6 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-success-subtle text-success">
          <Check aria-hidden="true" className="size-6" />
        </span>
        <p className="font-display text-xl font-bold">¡Gracias!</p>
        <p className="text-sm text-muted-foreground">Tu respuesta nos ayuda a mejorar el soporte de NEXUS.</p>
      </div>
    );

  return (
    <div className="grid gap-6">
      <fieldset className="grid gap-2.5">
        <legend className="mb-2 text-[15px] font-semibold">¿Cómo calificas la atención que recibiste?</legend>
        <div role="radiogroup" className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              aria-label={`${n} · ${SCORE_LABELS[n]}`}
              onClick={() => setScore(n)}
              data-press=""
              className={cn("grid aspect-square place-items-center rounded-lg border font-display text-xl font-bold transition-colors", score === n ? "border-accent bg-accent-subtle" : "border-border-input bg-surface hover:border-border-input-hover")}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="h-4 text-center text-xs text-muted-foreground">{score ? SCORE_LABELS[score] : ""}</p>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13.5px] font-medium">¿Qué tan probable es que recomiendes NEXUS? (opcional)</legend>
        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} type="button" aria-pressed={nps === String(n)} onClick={() => setNps(nps === String(n) ? "" : String(n))} className={cn("rounded-md border py-1.5 font-mono text-xs", nps === String(n) ? "border-foreground bg-foreground text-background" : "border-border-input")}>
              {n}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-1.5 text-[13.5px] font-medium">
        ¿Algo que quieras contarnos? (opcional)
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className={textareaClasses} />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="button"
        disabled={!score || pending}
        onClick={() =>
          start(async () => {
            const r = await answerSurveyAction(token, { score, nps, comment });
            if (r.ok) setDone(true);
            else setError(r.message ?? "No se pudo enviar.");
          })
        }
        className={buttonVariants({ size: "lg" })}
      >
        {pending ? "Enviando…" : "Enviar respuesta"}
      </button>
    </div>
  );
}
