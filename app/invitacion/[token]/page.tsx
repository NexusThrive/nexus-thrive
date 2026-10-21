import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { LogIn, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { getStaffInvite, redeemStaffInvite } from "@/lib/ops/team";
import { InviteNotice } from "./_components/invite-notice";

/**
 * Enlace de invitación al equipo de NEXUS (un solo uso).
 *
 * Es la forma segura de dar de alta a alguien: la invitación ata una cuenta
 * concreta a la ficha, así que da igual con qué correo se registre la
 * persona. Al abrirla con la sesión iniciada, la ficha queda vinculada y
 * entra al panel.
 *
 * Todavía no se manda por correo (falta RESEND_API_KEY): el panel genera el
 * enlace para mandarlo a mano.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getStaffInvite(token);
  if (!invite) {
    return (
      <InviteNotice
        kind="invalid"
        title="Esta invitación no existe"
        text="El enlace puede estar mal copiado o la invitación se dio de baja. Pídele a tu equipo uno nuevo."
      />
    );
  }

  const { userId } = await auth();
  if (!userId) {
    // Todavía no hay sesión: primero crear la cuenta (o entrar) y luego
    // volver a este enlace.
    return (
      <InviteNotice
        kind="signin"
        title="Te invitaron al equipo de NEXUS"
        text={`Crea tu cuenta o entra con ${invite.email} y vuelve a este enlace para entrar al panel.`}
        email={invite.email}
        roleName={invite.roleName}
        token={token}
      />
    );
  }

  const result = await redeemStaffInvite(token, userId);
  if (result.ok) redirect("/admin");

  if (result.reason === "other_account") {
    return (
      <InviteNotice
        kind="other_account"
        title="Esta invitación ya está en uso"
        text={`${result.email ?? invite.email} ya está vinculado a otra cuenta de NEXUS. Entra con esa cuenta, o pídele a tu equipo que use "Desvincular cuenta" en Equipo.`}
        email={result.email ?? invite.email}
        roleName={result.roleName ?? invite.roleName}
        token={token}
      />
    );
  }

  if (result.reason === "expired" || result.reason === "used") {
    return (
      <InviteNotice
        kind="invalid"
        title={result.reason === "used" ? "Esta invitación ya se usó" : "Esta invitación venció"}
        text="Pídele a tu equipo una invitación nueva."
      />
    );
  }

  if (result.reason === "inactive") {
    return (
      <InviteNotice
        kind="inactive"
        title="Tu acceso está en pausa"
        text={`${result.email ?? invite.email} está en el equipo de NEXUS con el rol ${result.roleName ?? invite.roleName}, pero tu acceso está desactivado. Escríbenos para reactivarlo.`}
        email={result.email ?? invite.email}
        roleName={result.roleName ?? invite.roleName}
        token={token}
      />
    );
  }

  return (
    <InviteNotice
      kind="invalid"
      title="No pudimos vincular tu cuenta"
      text="Pide a tu equipo que revise la invitación en Operaciones Center → Equipo."
    />
  );
}

export const metadata = { title: "Invitación al equipo · NEXUS THRIVE" };

export function InviteCta({ href }: { href: string }) {
  return (
    <a href={href} className={buttonVariants({ size: "sm" })}>
      <LogIn aria-hidden="true" className="size-3.5" /> Entrar
    </a>
  );
}

export function InviteShield() {
  return <ShieldCheck aria-hidden="true" className="size-4" />;
}
