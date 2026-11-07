"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import { createFormAction, rotateKeyAction, toggleFormAction, type FormResult } from "@/app/[tenant]/(app)/formularios/actions";
import { embedSnippet } from "@/lib/business/growth/lead-capture";
import type { LeadFormRow } from "@/lib/business/growth/lead-forms-db";

/** Formularios de captura: crear con sus dominios permitidos, copiar el código, apagar o cambiar la clave. */
export default function FormsView({ slug, forms, appUrl }: { slug: string; forms: LeadFormRow[]; appUrl: string }) {
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState<LeadFormRow | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const act = async (fn: () => Promise<FormResult>) => {
    const r = await fn();
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) router.refresh();
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Código copiado", "success");
    } catch {
      toast("No se pudo copiar: selecciónalo y cópialo a mano", "error");
    }
  };
  return (
    <div className="grid gap-4">
      <Alert tone="info">La clave del formulario es pública: va en tu web y cualquiera puede verla. Por eso solo acepta envíos desde los dominios que registres, con límite de envíos y sin guardar spam.</Alert>
      <div className="flex">
        <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ className: "ml-auto" })}>
          <Plus aria-hidden="true" className="size-4" /> Nuevo formulario
        </button>
      </div>
      {forms.length === 0 ? (
        <EmptyState title="Aún no tienes formularios" description="Crea uno, copia su código en tu web y los interesados llegarán a Oportunidades." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {forms.map((f) => (
            <li key={f.id} className="grid gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <b className="min-w-0 break-words text-ui font-medium">{f.name}</b>
                <Badge variant={f.enabled ? "success" : "secondary"}>{f.enabled ? "Encendido" : "Apagado"}</Badge>
                {f.campaign ? <Badge variant="outline">Campaña: {f.campaign}</Badge> : null}
              </div>
              <p className="break-all text-xs text-muted-foreground">Dominios: {f.allowedOrigins.join(", ")}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setCode(f)} className={buttonVariants({ variant: "outline", size: "sm" })}>Ver código</button>
                <button type="button" onClick={() => act(() => toggleFormAction(slug, f.id, !f.enabled))} className={buttonVariants({ variant: "ghost", size: "sm" })}>{f.enabled ? "Apagar" : "Encender"}</button>
                <button
                  type="button"
                  onClick={async () => {
                    if (await confirm({ title: "¿Cambiar la clave?", description: "La clave anterior deja de funcionar al instante: tendrás que actualizar el código en tu web.", confirmLabel: "Cambiar clave", tone: "danger" })) await act(() => rotateKeyAction(slug, f.id));
                  }}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Cambiar clave
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nuevo formulario"
        description="Escribe los dominios desde los que se enviará (por ejemplo https://mitienda.com), separados por espacios."
        submitLabel="Crear"
        pendingLabel="Creando…"
        onSubmit={async (d) => {
          const r = await createFormAction(slug, { name: String(d.get("name") ?? ""), origins: String(d.get("origins") ?? ""), campaign: String(d.get("campaign") ?? "") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { name: r.message } };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Nombre" required error={fieldErrors.name}>{(c) => <input {...c} name="name" autoComplete="off" maxLength={80} className={inputClasses} placeholder="Landing de camisetas" />}</Field>
            <Field label="Dominios permitidos" required hint="Con https://, sin ruta. Uno o varios.">{(c) => <input {...c} name="origins" autoComplete="off" className={inputClasses} placeholder="https://mitienda.com https://www.mitienda.com" />}</Field>
            <Field label="Campaña (opcional)">{(c) => <input {...c} name="campaign" autoComplete="off" maxLength={80} className={inputClasses} placeholder="lanzamiento-noviembre" />}</Field>
          </div>
        )}
      </FormDialog>

      <FormDialog open={code !== null} onOpenChange={(o) => !o && setCode(null)} title="Código para tu web" description={code ? `${code.name} · pégalo donde quieras el formulario.` : undefined} submitLabel="Listo" onSubmit={() => ({ ok: true })}>
        {() =>
          code ? (
            <div className="grid gap-2">
              <textarea readOnly aria-label="Código del formulario" rows={10} value={embedSnippet(appUrl, code.publicKey)} className={`${inputClasses} font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" onClick={() => copy(embedSnippet(appUrl, code.publicKey))} className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}><Copy aria-hidden="true" className="size-3.5" /> Copiar código</button>
            </div>
          ) : null
        }
      </FormDialog>
      {confirmDialog}
    </div>
  );
}
