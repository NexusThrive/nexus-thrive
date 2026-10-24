"use client";

import { useEffect, useState } from "react";
import { createLeadAction } from "@/app/s/[slug]/actions";
import { DIRECT, originFromParams, sanitizeOrigin, type Origin } from "@/lib/growth/growth";

/**
 * Atribución del sitio público: al llegar con `utm_*` en la URL se guarda el origen 30 días (el primero que trajo al
 * cliente se conserva) y se manda con el contacto o el pedido. Sin parámetros, la visita es «directa».
 */
const KEY = (slug: string) => `nx-origin-${slug}`;
const TTL = 30 * 86_400_000;

export function readOrigin(slug: string): Origin {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY(slug)) ?? "null") as { origin: Origin; at: number } | null;
    if (saved && Date.now() - saved.at < TTL) return sanitizeOrigin(saved.origin);
  } catch {
    /* sin almacenamiento */
  }
  return DIRECT;
}

export function AttributionCapture({ slug }: { slug: string }) {
  useEffect(() => {
    const found = originFromParams(new URLSearchParams(window.location.search));
    if (found.source === DIRECT.source) return;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY(slug)) ?? "null") as { at: number } | null;
      if (saved && Date.now() - saved.at < TTL) return; // el primer origen se conserva
      localStorage.setItem(KEY(slug), JSON.stringify({ origin: found, at: Date.now() }));
    } catch {
      /* no se recuerda */
    }
  }, [slug]);
  return null;
}

const FIELD = "h-11 w-full rounded-md border border-[#C9C6BE] bg-white px-3 text-[15px] text-black";

/** Formulario simple de contacto: nombre, celular, correo opcional y mensaje. */
export function ContactForm({ slug, accent, onAccent }: { slug: string; accent: string; onAccent: string }) {
  const [v, setV] = useState({ name: "", phone: "", email: "", message: "" });
  const [state, setState] = useState<{ status: "idle" | "busy" | "ok" | "error"; message?: string; fields?: Record<string, string> }>({ status: "idle" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  if (state.status === "ok") return <p role="status" className="rounded-md border border-[#C9C6BE] p-4 text-[14px]">¡Gracias! Recibimos tu mensaje y te escribimos pronto.</p>;
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ status: "busy" });
        const r = await createLeadAction(slug, v, readOrigin(slug));
        setState(r.ok ? { status: "ok" } : { status: "error", message: r.message, fields: "fields" in r ? r.fields : undefined });
      }}
      className="grid gap-3"
    >
      {([["name", "Nombre", "name"], ["phone", "Celular", "tel"], ["email", "Correo (opcional)", "email"]] as const).map(([k, label, ac]) => (
        <label key={k} className="grid gap-1 text-[13px] font-medium">
          {label}
          <input value={v[k]} onChange={set(k)} autoComplete={ac} aria-invalid={Boolean(state.fields?.[k])} aria-describedby={state.fields?.[k] ? `lead-${k}` : undefined} className={FIELD} />
          {state.fields?.[k] ? <span id={`lead-${k}`} role="alert" className="text-xs font-normal text-[#9B2C2C]">{state.fields[k]}</span> : null}
        </label>
      ))}
      <label className="grid gap-1 text-[13px] font-medium">Mensaje (opcional)<textarea value={v.message} onChange={set("message")} rows={3} maxLength={500} className={`${FIELD} h-auto py-2`} /></label>
      {state.status === "error" && !state.fields ? <p role="alert" className="text-[13px] text-[#9B2C2C]">{state.message}</p> : null}
      <button type="submit" disabled={state.status === "busy"} style={{ background: accent, color: onAccent }} className="h-12 rounded-md text-[15px] font-semibold disabled:opacity-60">{state.status === "busy" ? "Enviando…" : "Enviar mensaje"}</button>
    </form>
  );
}
