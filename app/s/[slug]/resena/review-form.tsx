"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { createReviewAction } from "@/app/s/[slug]/actions";

/** Reseña pública: 1 a 5 estrellas y un comentario. 4–5 invitan a dejarla también en Google; 1–2 se tratan como una queja privada. */
export default function ReviewForm({ slug, business, accent, onAccent }: { slug: string; business: string; accent: string; onAccent: string }) {
  const [rating, setRating] = useState(0);
  const [v, setV] = useState({ comment: "", name: "", contact: "" });
  const [state, setState] = useState<{ status: "idle" | "busy" | "error" | "ok"; message?: string; low?: boolean; google?: string | null }>({ status: "idle" });
  if (state.status === "ok")
    return (
      <div role="status" className="grid gap-3 text-[15px]">
        <p className="font-semibold">{state.low ? "Lamentamos tu experiencia." : "¡Gracias por tu opinión!"}</p>
        <p>{state.low ? `${business} recibió tu comentario y te contactará para resolverlo.` : `Nos ayuda a mejorar en ${business}.`}</p>
        {state.google ? <a href={state.google} target="_blank" rel="noopener noreferrer" style={{ background: accent, color: onAccent }} className="inline-flex h-12 items-center justify-center rounded-md font-semibold">Déjanos tu reseña también en Google</a> : null}
      </div>
    );
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ status: "busy" });
        const r = await createReviewAction(slug, { rating, ...v });
        setState(r.ok ? { status: "ok", low: r.low, google: r.googleReviewUrl } : { status: "error", message: r.message });
      }}
      className="grid gap-4"
    >
      <fieldset className="grid gap-2">
        <legend className="text-[14px] font-semibold">¿Cómo fue tu experiencia?</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <Star aria-hidden="true" className={`size-9 ${n <= rating ? "fill-[#D4AF37] text-[#D4AF37]" : "text-[#8A8A8A]"}`} />
              <span className="sr-only">{n} {n === 1 ? "estrella" : "estrellas"}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-1 text-[13px] font-medium">Cuéntanos más (opcional)<textarea value={v.comment} onChange={(e) => setV((p) => ({ ...p, comment: e.target.value }))} rows={3} maxLength={600} className="w-full rounded-md border border-[#C9C6BE] bg-white px-3 py-2 text-[15px] text-black" /></label>
      <label className="grid gap-1 text-[13px] font-medium">Tu nombre (opcional)<input value={v.name} onChange={(e) => setV((p) => ({ ...p, name: e.target.value }))} autoComplete="name" className="h-11 w-full rounded-md border border-[#C9C6BE] bg-white px-3 text-[15px] text-black" /></label>
      <label className="grid gap-1 text-[13px] font-medium">Celular o correo para responderte (opcional)<input value={v.contact} onChange={(e) => setV((p) => ({ ...p, contact: e.target.value }))} className="h-11 w-full rounded-md border border-[#C9C6BE] bg-white px-3 text-[15px] text-black" /></label>
      {state.status === "error" ? <p role="alert" className="text-[13px] text-[#9B2C2C]">{state.message}</p> : null}
      <button type="submit" disabled={state.status === "busy" || rating === 0} style={{ background: accent, color: onAccent }} className="h-12 rounded-md text-[15px] font-semibold disabled:opacity-60">{state.status === "busy" ? "Enviando…" : "Enviar reseña"}</button>
    </form>
  );
}
