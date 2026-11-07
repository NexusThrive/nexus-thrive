"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Star, X } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { connectGoogleAction, disconnectGoogleAction, syncGoogleAction, type GoogleResult } from "@/app/[tenant]/(app)/presencia/google/actions";
import type { ListingView } from "@/lib/integrations/google/google-db";

export default function GoogleView({ slug, listing }: { slug: string; listing: ListingView }) {
  const router = useRouter();
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<GoogleResult>) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    toast(r.message, r.ok ? "success" : "error");
    router.refresh();
  };
  const connect = (
    <FormDialog
      open={connecting}
      onOpenChange={setConnecting}
      title="Conectar tu ficha de Google"
      description="Usamos la API Places de Google con TU llave; NEXUS solo lee, no edita tu ficha. La llave se guarda cifrada."
      submitLabel="Conectar y sincronizar"
      pendingLabel="Conectando…"
      onSubmit={async (d) => {
        const r = await connectGoogleAction(slug, String(d.get("placeId") ?? ""), String(d.get("apiKey") ?? ""));
        return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { placeId: r.message } };
      }}
      onSuccess={({ message }) => {
        if (message) toast(message, "success");
        router.refresh();
      }}
    >
      {({ fieldErrors }) => (
        <div className="grid gap-3">
          <Field label="ID de lugar" required error={fieldErrors.placeId} hint="Empieza por «ChIJ». Se busca en el «Place ID Finder» de Google.">{(c) => <input {...c} name="placeId" autoComplete="off" className={`${inputClasses} font-mono`} placeholder="ID del lugar" />}</Field>
          <Field label="Llave de API de Google" required hint="Con «Places API (New)» activada.">{(c) => <input {...c} name="apiKey" type="password" autoComplete="off" className={inputClasses} />}</Field>
        </div>
      )}
    </FormDialog>
  );

  if (!listing.connected) {
    return (
      <section aria-labelledby="g-title" className="grid max-w-xl gap-3 rounded-lg border border-border bg-surface p-5">
        <h2 id="g-title" className="font-display text-[15px] font-semibold">Aún no conectas tu ficha</h2>
        <p className="text-ui text-muted-foreground">Conéctala para verificar que Google muestre tu nombre, dirección, teléfono y sitio como tú los tienes, y para ver tu calificación y tus reseñas. Esto mejora tu presencia verificada.</p>
        <button type="button" onClick={() => setConnecting(true)} className={buttonVariants({ className: "justify-self-start" })}>Conectar mi ficha</button>
        {connect}
      </section>
    );
  }
  return (
    <div className="grid gap-4">
      <section aria-labelledby="g-state" className="grid gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="g-state" className="font-display text-[15px] font-semibold">Tu ficha</h2>
          <Badge variant={listing.status === "OK" ? "success" : listing.status === "ERROR" ? "destructive" : "warning"}>{listing.status === "OK" ? "Sincronizada" : listing.status === "ERROR" ? "Con error" : "Pendiente"}</Badge>
          {listing.syncedAt ? <span className="text-xs text-muted-foreground">Última lectura {listing.syncedAt.slice(0, 16).replace("T", " ")}</span> : null}
          <span className="ml-auto flex gap-2">
            <button type="button" disabled={busy} onClick={() => run(() => syncGoogleAction(slug))} className={buttonVariants({ size: "sm" })}>{busy ? "Leyendo…" : "Sincronizar ahora"}</button>
            <button type="button" disabled={busy} onClick={() => setConnecting(true)} className={buttonVariants({ variant: "outline", size: "sm" })}>Cambiar</button>
            <button type="button" disabled={busy} onClick={() => run(() => disconnectGoogleAction(slug))} className={buttonVariants({ variant: "ghost", size: "sm" })}>Desconectar</button>
          </span>
        </div>
        {listing.status === "ERROR" && listing.lastError ? <Alert tone="danger">{listing.lastError}</Alert> : null}
        {listing.place ? (
          <p className="flex items-center gap-2 text-sm">
            <Star aria-hidden="true" className="size-4 fill-accent text-accent" />
            <b>{listing.place.rating?.toFixed(1) ?? "—"}</b>
            <span className="text-muted-foreground">{listing.place.ratingCount ?? 0} reseñas en Google</span>
            {listing.mapsUrl ? <a href={listing.mapsUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-ui underline underline-offset-2">Ver en Google Maps</a> : null}
          </p>
        ) : null}
      </section>
      {listing.nap.length ? (
        <section aria-labelledby="g-nap" className="grid gap-2 rounded-lg border border-border bg-surface p-4">
          <h2 id="g-nap" className="font-display text-[15px] font-semibold">¿Coincide con lo que dices? · {listing.napMatches} de {listing.nap.length}</h2>
          <AdaptiveTable
            caption="Lo que dice tu negocio frente a lo que muestra Google"
            rows={listing.nap}
            getRowId={(r) => r.field}
            columns={[
              { key: "label", header: "Dato", role: "primary", cell: (r) => r.label },
              { key: "nexus", header: "Tu negocio", role: "detail", cell: (r) => r.nexus ?? <span className="text-muted-foreground">Sin dato</span> },
              { key: "google", header: "Google", role: "detail", cell: (r) => r.google ?? <span className="text-muted-foreground">Sin dato</span> },
              {
                key: "match",
                header: "Estado",
                role: "status",
                cell: (r) =>
                  r.match ? (
                    <span className="inline-flex items-center gap-1"><Check aria-hidden="true" className="size-4 text-success" /> Coincide</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium"><X aria-hidden="true" className="size-4 text-danger" /> Corrige uno de los dos</span>
                  ),
              },
            ]}
          />
          <p className="text-xs text-muted-foreground">Si algo no coincide, corrígelo en tu perfil de NEXUS o directamente en Google Business Profile (NEXUS no edita tu ficha).</p>
        </section>
      ) : null}
      {connect}
    </div>
  );
}
