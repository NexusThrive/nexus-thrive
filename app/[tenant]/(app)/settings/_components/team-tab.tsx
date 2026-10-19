"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, MoreHorizontal, UserMinus, UserPlus, UserRoundCheck, X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, selectClasses } from "@/components/atoms/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/molecules/dropdown-menu";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { BUSINESS_ROLES, roleLabel } from "@/lib/business/roles";
import type { PendingInvite, TeamMember } from "@/lib/business/team-db";
import { cn } from "@/lib/utils";
import { changeMemberRoleAction, inviteMemberAction, revokeInviteAction, setMemberActiveAction, updateMyProfileAction } from "../team-actions";
import { PhoneInput } from "@/components/molecules/phone-input";

export type Seats = { limit: number | null; used: number; planName: string };

/**
 * Equipo del negocio: quién entra, con qué rol, invitaciones pendientes y
 * cuántos usuarios quedan en el plan. Retirar a alguien no borra lo que hizo.
 */
export default function TeamTab({ slug, members, invites, seats, canManage, meRole }: { slug: string; members: TeamMember[]; invites: PendingInvite[]; seats: Seats; canManage: boolean; meRole: string }) {
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "RECEPTION" });
  const [showRemoved, setShowRemoved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const isOwner = meRole === "OWNER" || meRole === "SUPERADMIN";
  const full = seats.limit != null && seats.used >= seats.limit;
  const active = members.filter((m) => m.active);
  const me = members.find((m) => m.isMe);
  const [mine, setMine] = useState({ name: me?.name ?? "", title: me?.title ?? "", phone: me?.phone ?? "" });
  const removed = members.filter((m) => !m.active);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast({ title: r.message ?? "Listo", variant: "success" });
        after?.();
        router.refresh();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });

  const row = (m: TeamMember) => (
    <li key={m.id} className={cn("flex items-center gap-3 px-[18px] py-3", !m.active && "opacity-60")}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted font-display text-[13px] font-bold">{m.name.slice(0, 1).toUpperCase()}</span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] font-medium">
          {m.name}
          {m.isMe ? <span className="font-normal text-muted-foreground"> (tú)</span> : null}
        </b>
        <small className="block truncate text-xs text-muted-foreground">{m.email}</small>
      </span>
      <Badge tone={m.role === "OWNER" ? "success" : m.role === "SUPERADMIN" ? "warning" : "neutral"}>{roleLabel(m.role)}</Badge>
      {canManage && !m.isMe && m.role !== "SUPERADMIN" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`Opciones de ${m.name}`} className={buttonVariants({ variant: "ghost", size: "icon" })}>
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {m.active ? (
              <>
                <DropdownMenuLabel>Cambiar rol</DropdownMenuLabel>
                {BUSINESS_ROLES.filter((r) => r.value !== m.role && (isOwner || (r.value !== "OWNER" && m.role !== "OWNER"))).map((r) => (
                  <DropdownMenuItem key={r.value} onSelect={() => run(() => changeMemberRoleAction(slug, m.id, r.value))}>
                    {r.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => run(() => setMemberActiveAction(slug, m.id, false))} className="text-danger">
                  <UserMinus aria-hidden="true" /> Retirar del equipo
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => run(() => setMemberActiveAction(slug, m.id, true))}>
                <UserRoundCheck aria-hidden="true" /> Reactivar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );

  return (
    <section className="grid gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-[18px] py-3.5">
        <div>
          <h2 className="font-display text-[15px] font-semibold">Equipo</h2>
          <p className="text-xs text-muted-foreground">
            {seats.limit == null ? `${seats.used} personas · tu plan ${seats.planName} no tiene límite` : `${seats.used} de ${seats.limit} usuarios del plan ${seats.planName}`}
          </p>
        </div>
        {canManage ? (
          <button type="button" disabled={full} onClick={() => setInviting(true)} className={buttonVariants({ size: "sm" })} title={full ? "Tu plan no tiene cupos libres" : undefined}>
            <UserPlus aria-hidden="true" className="size-3.5" /> Invitar persona
          </button>
        ) : null}
      </div>
      {full && canManage ? <p className="rounded-md bg-accent-subtle px-3.5 py-2.5 text-[13px]">Usaste todos los usuarios de tu plan. Mejora tu plan en la pestaña Plan para sumar más personas.</p> : null}

      {me ? (
        <section className="grid gap-3 rounded-lg border border-border bg-surface p-[18px]">
          <div>
            <h3 className="text-[13px] font-semibold">Tu perfil</h3>
            <p className="text-xs text-muted-foreground">Así te saluda el Inicio y así te ve tu equipo.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Nombre">{(c) => <input {...c} value={mine.name} onChange={(e) => setMine({ ...mine, name: e.target.value })} className={inputClasses} />}</Field>
            <Field label="Cargo">{(c) => <input {...c} value={mine.title} onChange={(e) => setMine({ ...mine, title: e.target.value })} className={inputClasses} placeholder="Administradora" />}</Field>
            <Field label="Teléfono">{(c) => <PhoneInput id={c.id} value={mine.phone} onChange={(v) => setMine({ ...mine, phone: v })} />}</Field>
          </div>
          <button type="button" disabled={pending} onClick={() => run(() => updateMyProfileAction(slug, mine))} className={buttonVariants({ size: "sm", variant: "outline", className: "justify-self-start" })}>
            Guardar mi perfil
          </button>
        </section>
      ) : null}

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">{active.map(row)}</ul>

      {invites.length ? (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <h3 className="border-b border-border px-[18px] py-3 text-[13px] font-semibold">Invitaciones pendientes</h3>
          <ul className="divide-y divide-border">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-[18px] py-2.5">
                <Mail aria-hidden="true" className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13.5px] font-medium">{i.name ?? i.email}</b>
                  <small className="block truncate text-xs text-muted-foreground">
                    {i.email} · {roleLabel(i.role)} · vence {new Date(i.expiresAt).toLocaleDateString("es-CO")}
                  </small>
                </span>
                {canManage ? (
                  <button type="button" aria-label={`Cancelar invitación a ${i.email}`} onClick={() => run(() => revokeInviteAction(slug, i.id))} className={buttonVariants({ variant: "ghost", size: "icon" })}>
                    <X aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {removed.length ? (
        <div>
          <button type="button" onClick={() => setShowRemoved(!showRemoved)} className="text-[13px] text-muted-foreground underline-offset-2 hover:underline">
            {showRemoved ? "Ocultar" : "Ver"} personas retiradas ({removed.length})
          </button>
          {showRemoved ? <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">{removed.map(row)}</ul> : null}
        </div>
      ) : null}

      <div className="grid gap-1.5 rounded-lg border border-border bg-surface p-[18px] text-[13px]">
        <h3 className="font-semibold">Qué puede hacer cada rol</h3>
        {BUSINESS_ROLES.map((r) => (
          <p key={r.value}>
            <b className="font-medium">{r.label}:</b> <span className="text-muted-foreground">{r.hint}</span>
          </p>
        ))}
      </div>

      {inviting ? (
        <ResponsiveSheet
          open
          onOpenChange={(o) => !o && setInviting(false)}
          title="Invitar persona"
          description="Cuando entre a NEXUS con este correo, queda en tu equipo con el rol que elijas."
          footer={
            <>
              <button type="button" onClick={() => setInviting(false)} className={buttonVariants({ variant: "outline" })}>
                Cancelar
              </button>
              <button type="button" disabled={pending} onClick={() => run(() => inviteMemberAction(slug, form), () => { setInviting(false); setForm({ email: "", name: "", role: "RECEPTION" }); })} className={buttonVariants()}>
                Invitar
              </button>
            </>
          }
        >
          <div className="grid gap-4">
            <Field label="Correo" required>{(c) => <input {...c} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClasses} placeholder="recepcion@tunegocio.com" />}</Field>
            <Field label="Nombre">{(c) => <input {...c} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClasses} />}</Field>
            <Field label="Rol" hint={BUSINESS_ROLES.find((r) => r.value === form.role)?.hint}>
              {(c) => (
                <select {...c} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={selectClasses}>
                  {BUSINESS_ROLES.filter((r) => isOwner || r.value !== "OWNER").map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        </ResponsiveSheet>
      ) : null}
    </section>
  );
}
