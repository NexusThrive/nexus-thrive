"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy, KeyRound, Link2, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Alert } from "@/components/molecules/alert";
import { Field } from "@/components/molecules/field";
import { PageHeader } from "@/components/molecules/page-header";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { ContextHelp } from "@/components/molecules/context-help";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import type { PermissionKey } from "@/lib/ops/permissions";
import type { RoleRow, StaffRow } from "@/lib/ops/team";
import { changeStaffRoleAction, createStaffInviteAction, deleteRoleAction, inviteStaffAction, setStaffActiveAction, unlinkStaffAccountAction } from "../actions";
import RoleBuilder from "./role-builder";
import { Select } from "@/components/atoms/select";

const rel = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });
function seen(iso: string | null): string {
  if (!iso) return "Nunca";
  const min = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (Math.abs(min) < 60) return rel.format(min, "minute");
  if (Math.abs(min) < 1440) return rel.format(Math.round(min / 60), "hour");
  return rel.format(Math.round(min / 1440), "day");
}
const initials = (s: string) => s.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

/**
 * Equipo NEXUS: integrantes (invitar, cambiar rol, desactivar) y roles con
 * el constructor de permisos. Lo que cada quien puede hacer aquí depende de
 * su propio rol; el servidor lo vuelve a verificar.
 */
export default function TeamView({
  me,
  staff,
  roles,
  permissions,
}: {
  me: string;
  staff: StaffRow[];
  roles: RoleRow[];
  permissions: PermissionKey[];
}) {
  const can = (p: PermissionKey) => permissions.includes(p);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { toast } = useToast();
  const [view, setView] = useState<"members" | "roles">("members");
  const [inviteOpen, setInviteOpen] = useState(false);
  const showInvite = inviteOpen || sp.get("invitar") === "1";
  const [invite, setInvite] = useState({ email: "", name: "", title: "", roleId: roles.find((r) => r.key === "support")?.id ?? roles[0]?.id ?? "" });
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [roleEditing, setRoleEditing] = useState<RoleRow | "new" | null>(null);
  const [pending, start] = useTransition();
  const [confirm, confirmDialog] = useConfirm();

  const closeInvite = () => {
    setInviteOpen(false);
    if (sp.get("invitar")) router.replace(pathname, { scroll: false });
  };
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, done: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast(done, "success");
        router.refresh();
      } else toast({ title: "No se pudo completar", description: r.message, variant: "error" });
    });

  // Enlace de invitación generado (se muestra para copiar y mandar).
  const [inviteLink, setInviteLink] = useState<{ email: string; url: string } | null>(null);

  const makeInvite = (m: StaffRow) =>
    start(async () => {
      const r = await createStaffInviteAction(m.id);
      if (!r.ok) {
        toast({ title: "No se pudo generar el enlace", description: r.message, variant: "error" });
        return;
      }
      const url = `${window.location.origin}/invitacion/${r.token ?? ""}`;
      setInviteLink({ email: m.email, url });
      toast("Enlace generado. Cópialo y mándaselo.", "success");
    });

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Plataforma"
        title="Equipo y permisos"
        description="Quién está en NEXUS, con qué rol y qué puede hacer cada rol. Cada permiso se verifica en el servidor."
        actions={
          <div className="flex flex-wrap gap-2">
            {can("team.permissions") ? (
              <button type="button" onClick={() => setRoleEditing("new")} className={buttonVariants({ variant: "outline" })}>
                <KeyRound aria-hidden="true" className="size-4" /> Nuevo rol
              </button>
            ) : null}
            {can("team.invite") ? (
              <button type="button" onClick={() => setInviteOpen(true)} className={buttonVariants({ variant: "accent" })} data-mag="">
                <UserPlus aria-hidden="true" className="size-4" /> Invitar integrante
              </button>
            ) : null}
          </div>
        }
      />

      <SegmentedControl
        ariaLabel="Vista"
        value={view}
        onChange={setView}
        options={[
          { value: "members", label: "Integrantes", count: staff.length },
          { value: "roles", label: "Roles", count: roles.length },
        ]}
      />

      {view === "members" ? (
        <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {staff.map((m) => {
            const isMe = m.id === me;
            return (
              <li key={m.id} className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">{initials(m.name ?? m.email)}</span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate font-medium">
                      {m.name ?? m.email} {isMe ? <span className="text-xs font-normal text-muted-foreground">(tú)</span> : null}
                    </b>
                    <small className="block truncate text-xs text-muted-foreground">{m.title ? `${m.title} · ` : ""}{m.email}</small>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={m.roleKey === "owner" ? "warning" : "neutral"}>{m.roleName}</Badge>
                  {m.pending ? <Badge tone="warning" pulse>Invitación pendiente</Badge> : null}
                  {!m.active ? <Badge tone="danger">Desactivado</Badge> : null}
                  <span className="ml-auto text-xs text-muted-foreground">Último acceso: {seen(m.lastSeenAt)}</span>
                </div>
                {can("team.roles") && !isMe ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <Select
                      aria-label={`Rol de ${m.name ?? m.email}`}
                      value={m.roleId}
                      disabled={pending}
                      onChange={(e) => run(() => changeStaffRoleAction(m.id, e.target.value), "Rol actualizado")}
                      className="h-8 w-auto flex-1 text-[13px]"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setStaffActiveAction(m.id, !m.active), m.active ? "Integrante desactivado" : "Integrante reactivado")}
                      className={buttonVariants({ variant: m.active ? "ghost" : "outline", size: "sm" })}
                    >
                      {m.active ? "Desactivar" : "Reactivar"}
                    </button>
                    {m.linked ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={async () => {
                          const ok = await confirm({
                            title: `¿Desvincular la cuenta de ${m.email}?`,
                            description: "Se suelta la cuenta de Clerk vinculada. La próxima vez que entre con ese correo se enlazará de nuevo.",
                            confirmLabel: "Desvincular cuenta",
                            tone: "default",
                          });
                          if (ok) run(() => unlinkStaffAccountAction(m.id), "Cuenta desvinculada");
                        }}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Desvincular cuenta
                      </button>
                    ) : null}
                    {can("team.invite") ? (
                      <span className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => makeInvite(m)}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Link2 aria-hidden="true" className="size-3.5" /> Enlace de invitación
                        </button>
                        <ContextHelp topic="el enlace de invitación">
                          Genera un enlace de un solo uso: la persona entra con él y queda en el panel, con el correo que use.
                        </ContextHelp>
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {inviteLink?.email === m.email ? (
                  <div className="grid gap-1.5 rounded-md border border-border bg-surface-muted p-2.5">
                    <p className="text-[12px] text-muted-foreground">
                      Mándale este enlace (WhatsApp o correo). Sirve una vez y ata su cuenta al panel:
                    </p>
                    <code className="block break-all font-mono text-[11px]">{inviteLink.url}</code>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(inviteLink.url);
                          toast("Enlace copiado", "success");
                        }}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <Copy aria-hidden="true" className="size-3.5" /> Copiar enlace
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Te Tough ${inviteLink.email} — entra al equipo de NEXUS con este enlace: ${inviteLink.url}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Abrir WhatsApp
                      </a>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => (
            <li key={r.id} className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="size-4 text-accent-text" />
                <b className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold">{r.name}</b>
                {r.system ? <Badge tone="neutral">Base</Badge> : <Badge variant="gold">Personalizado</Badge>}
              </div>
              <p className="text-[13px] text-muted-foreground">{r.description ?? "Sin descripción."}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {r.permissions.length} permisos · {r.members} {r.members === 1 ? "integrante" : "integrantes"}
              </p>
              <div className="mt-auto flex gap-2 border-t border-border pt-3">
                <button type="button" onClick={() => setRoleEditing(r)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {can("team.permissions") && r.key !== "owner" ? "Editar permisos" : "Ver permisos"}
                </button>
                {can("team.permissions") && !r.system ? (
                  <button type="button" aria-label={`Eliminar ${r.name}`} disabled={pending} onClick={() => run(() => deleteRoleAction(r.id), "Rol eliminado")} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
          {can("team.permissions") ? (
            <li>
              <button type="button" onClick={() => setRoleEditing("new")} className="grid h-full min-h-32 w-full place-items-center rounded-lg border border-dashed border-border-strong text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                <span className="flex items-center gap-2">
                  <Plus aria-hidden="true" className="size-4" /> Crear rol personalizado
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      )}

      <ResponsiveSheet
        open={showInvite}
        onOpenChange={(o) => (o ? setInviteOpen(true) : closeInvite())}
        title="Invitar integrante"
        description="Entra con este correo en NEXUS y queda vinculado al equipo con el rol elegido."
        footer={
          <>
            <button type="button" onClick={closeInvite} className={buttonVariants({ variant: "outline" })}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await inviteStaffAction(invite);
                  if (r.ok) {
                    toast({ title: "Invitación creada", description: `${invite.email} ya puede entrar con su correo.`, variant: "success" });
                    setInvite({ ...invite, email: "", name: "", title: "" });
                    closeInvite();
                    router.refresh();
                  } else {
                    setInviteErrors(r.errors ?? {});
                    setInviteMsg(r.message);
                  }
                })
              }
              className={buttonVariants()}
            >
              {pending ? "Invitando…" : "Invitar"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label="Correo" required error={inviteErrors.email}>
            {(c) => <input {...c} type="email" autoFocus value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="nombre@nexusthrive.com.co" className={inputClasses} />}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre" error={inviteErrors.name}>{(c) => <input {...c} value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} className={inputClasses} />}</Field>
            <Field label="Cargo" hint="Ej. CFO, Founder, Soporte" error={inviteErrors.title}>{(c) => <input {...c} value={invite.title} onChange={(e) => setInvite({ ...invite, title: e.target.value })} className={inputClasses} />}</Field>
          </div>
          <Field label="Rol" hint="El cargo es solo un nombre; lo que puede hacer lo define el rol." error={inviteErrors.roleId}>
            {(c) => (
              <Select {...c} value={invite.roleId} onChange={(e) => setInvite({ ...invite, roleId: e.target.value })}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.permissions.length} permisos
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {inviteMsg ? <Alert tone="danger">{inviteMsg}</Alert> : null}
        </div>
      </ResponsiveSheet>

      {roleEditing ? (
        <RoleBuilder
          key={roleEditing === "new" ? "new" : roleEditing.id}
          open
          onOpenChange={(o) => !o && setRoleEditing(null)}
          role={roleEditing === "new" ? null : roleEditing}
          editorPermissions={permissions}
        />
      ) : null}
      {confirmDialog}
    </div>
  );
}
