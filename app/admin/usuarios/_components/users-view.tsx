"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { PageHeader } from "@/components/molecules/page-header";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { createUserOrganizationAction, setUserLimitAction } from "@/app/admin/usuarios/actions";
import type { PlatformUser } from "@/lib/admin/users-db";

type Dialog = { kind: "limit" | "create"; user: PlatformUser } | null;

export default function UsersView({ users, total, q, canEdit, canCreate, verticals }: { users: PlatformUser[]; total: number; q: string; canEdit: boolean; canCreate: boolean; verticals: { value: string; label: string }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [vertical, setVertical] = useState("general");
  const close = (open: boolean) => { if (!open) setDialog(null); };
  const done = (message?: string) => { if (message) toast(message, "success"); router.refresh(); };
  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Cuentas" title="Usuarios" description={`${total} ${total === 1 ? "persona" : "personas"}. Cuántos negocios tiene cada una, su límite, y crea un negocio para ella.`} />
      <form role="search" className="flex max-w-md gap-2" action="/admin/usuarios">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={q} aria-label="Buscar persona o negocio" placeholder="Correo, nombre o negocio" className={`${inputClasses} pl-9`} />
        </div>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>Buscar</button>
      </form>
      {users.length === 0 ? <EmptyState title="Nadie coincide" description="Prueba con otro correo, nombre o negocio." /> : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {users.map((u) => {
            const over = u.limit !== null && u.owned >= u.limit;
            return (
              <li key={u.email} className="grid gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-[14px] font-medium">{u.name ?? u.email}</b>
                  {u.name ? <span className="text-[12.5px] text-muted-foreground">{u.email}</span> : null}
                  <Badge variant={over ? "destructive" : "outline"}>{u.owned} {u.owned === 1 ? "negocio propio" : "negocios propios"} · {u.limit === null ? "sin límite" : `límite ${u.limit}`}</Badge>
                  <span className="ml-auto flex gap-2">
                    {canEdit ? <button type="button" aria-label={`Límite de ${u.email}`} onClick={() => setDialog({ kind: "limit", user: u })} className={buttonVariants({ variant: "outline", size: "sm" })}>Límite</button> : null}
                    {canCreate ? <button type="button" aria-label={`Crear negocio para ${u.email}`} disabled={over} onClick={() => setDialog({ kind: "create", user: u })} className={buttonVariants({ size: "sm" })}><Plus aria-hidden="true" className="size-3.5" /> Crear negocio</button> : null}
                  </span>
                </div>
                {u.orgs.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {u.orgs.map((o) => (
                      <li key={`${o.tenantId}-${o.role}`} className="rounded-md border border-border px-2 py-0.5 text-[12.5px]">
                        {o.name} <span className="text-muted-foreground">· {o.role === "OWNER" ? "dueño" : o.role.toLowerCase()}{!o.tenantActive ? " · suspendido" : !o.active ? " · retirado" : ""}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-[12.5px] text-muted-foreground">Aún no tiene negocios.{u.note ? ` Nota: ${u.note}` : ""}</p>}
                {u.note && u.orgs.length ? <p className="text-[12.5px] text-muted-foreground">Nota: {u.note}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
      {total > users.length ? <p className="text-xs text-muted-foreground">Se muestran las primeras {users.length}. Afina la búsqueda para ver el resto.</p> : null}

      <FormDialog open={dialog?.kind === "limit"} onOpenChange={close} title={`Límite de negocios · ${dialog?.user.email ?? ""}`} description="Cuántos negocios puede tener como dueña. Déjalo vacío para quitar el límite." submitLabel="Guardar límite" pendingLabel="Guardando…"
        onSubmit={async (d) => { const r = await setUserLimitAction(dialog!.user.email, String(d.get("limit") ?? ""), String(d.get("note") ?? "")); return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { limit: r.message } }; }}
        onSuccess={({ message }) => { setDialog(null); done(message); }}>
        {({ fieldErrors }) => (
          <div className="grid gap-3" key={dialog?.user.email}>
            <Field label="Máximo de negocios" optional error={fieldErrors.limit} hint={`Ahora tiene ${dialog?.user.owned ?? 0}.`}>{(c) => <input {...c} name="limit" inputMode="numeric" autoComplete="off" defaultValue={dialog?.user.limit ?? ""} className={inputClasses} placeholder="Sin límite" />}</Field>
            <Field label="Nota interna" optional>{(c) => <input {...c} name="note" autoComplete="off" defaultValue={dialog?.user.note ?? ""} className={inputClasses} placeholder="Plan acordado, motivo…" />}</Field>
          </div>
        )}
      </FormDialog>

      <FormDialog open={dialog?.kind === "create"} onOpenChange={close} title={`Crear un negocio para ${dialog?.user.email ?? ""}`} description="Nace con las funciones de su rubro y con una invitación de dueño: la persona lo reclama al entrar con ese correo." submitLabel="Crear negocio" pendingLabel="Creando…"
        onSubmit={async (d) => { const r = await createUserOrganizationAction(dialog!.user.email, String(d.get("name") ?? ""), vertical); return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { name: r.message } }; }}
        onSuccess={({ message }) => { setDialog(null); done(message); }}>
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Nombre del negocio" required error={fieldErrors.name}>{(c) => <input {...c} name="name" autoComplete="off" className={inputClasses} />}</Field>
            <Field label="Rubro" required>{(c) => <Select {...c} value={vertical} onChange={(e) => setVertical(e.target.value)}>{verticals.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}</Select>}</Field>
          </div>
        )}
      </FormDialog>
    </div>
  );
}
