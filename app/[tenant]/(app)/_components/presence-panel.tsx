"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowUpRight, Globe, RefreshCw } from "lucide-react";

import { Badge, StatusDot } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ProgressBar } from "@/components/atoms/progress-bar";
import { SocialIcon, type SocialName } from "@/components/atoms/social-icon";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { PRESENCE_STATES, type PresenceCheck } from "@/lib/presence/presence";
import type { PresenceSnapshot } from "@/lib/presence/load";
import { scanPresenceAction } from "../_actions/presence";

/**
 * Presence Thrive: puntaje de presencia digital del negocio. Va arriba del
 * panel, a lo ancho, por encima de las tarjetas. Muestra el puntaje verificado
 * o declarado, los canales (web, Instagram, Google, WhatsApp) y el detalle por
 * criterio. El botón "Analizar" vuelve a escanear el sitio y guarda la foto.
 */

type Channel = {
  key: "web" | SocialName;
  label: string;
  value: string;
  href: string | null;
  connected: boolean;
};

function Chequeo({ check }: { check: PresenceCheck }) {
  return (
    <li className="flex items-start gap-2.5">
      <StatusDot tone={check.done ? "success" : "muted"} className="mt-1.5" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[13px] font-medium", check.done ? "text-foreground" : "text-muted-foreground")}>
          {check.label}
        </p>
        <p className="truncate text-xs text-muted-foreground">{check.hint}</p>
      </div>
      <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
        {check.earned}/{check.weight}
      </span>
    </li>
  );
}

function Canal({ channel }: { channel: Channel }) {
  const inner = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-surface-muted text-foreground">
        {channel.key === "web" ? (
          <Globe className="size-4" aria-hidden="true" />
        ) : (
          <SocialIcon name={channel.key} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-foreground">{channel.label}</span>
        <span className={cn("block truncate text-xs", channel.connected ? "text-muted-foreground" : "text-muted-foreground/70")}>
          {channel.value}
        </span>
      </span>
      {channel.href ? <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
    </>
  );

  const classes =
    "flex items-center gap-2.5 rounded-md border border-border bg-background p-2.5 transition-colors";

  if (channel.href) {
    return (
      <Link href={channel.href} target={channel.key === "web" ? undefined : "_blank"} className={cn(classes, "hover:border-border-input hover:bg-surface-muted")}>
        {inner}
      </Link>
    );
  }
  return <div className={classes}>{inner}</div>;
}

export function PresencePanel({
  tenantSlug,
  presence,
  settingsHref,
}: {
  tenantSlug: string;
  presence: PresenceSnapshot;
  settingsHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const meta = PRESENCE_STATES[presence.state];

  const handle = presence.instagramHandle?.trim().replace(/^@+/, "") ?? "";
  const waDigits = (presence.whatsappNumber ?? "").replace(/\D+/g, "");
  const siteHost = presence.siteUrl
    ? presence.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : null;
  const previewReady = Boolean(presence.website?.reachable && presence.siteUrl);

  const channels: Channel[] = [
    {
      key: "web",
      label: "Sitio web",
      value: siteHost ?? (presence.requestStatus ? `Solicitud ${presence.requestStatus.toLowerCase()}` : "Sin sitio"),
      href: presence.siteUrl,
      connected: Boolean(presence.siteUrl),
    },
    {
      key: "instagram",
      label: "Instagram",
      value: handle ? `@${handle}` : "Sin conectar",
      href: handle ? `https://instagram.com/${handle}` : null,
      connected: Boolean(handle),
    },
    {
      key: "google",
      label: "Ficha de Google",
      value: presence.googleBusinessUrl ? "Vinculada" : "Sin conectar",
      href: presence.googleBusinessUrl ?? null,
      connected: Boolean(presence.googleBusinessUrl),
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      value: presence.whatsappNumber ?? "Sin conectar",
      href: waDigits ? `https://wa.me/${waDigits}` : null,
      connected: Boolean(presence.whatsappNumber),
    },
  ];

  const analizar = () => {
    startTransition(async () => {
      const result = await scanPresenceAction(tenantSlug);
      if (result.ok) router.refresh();
    });
  };

  return (
    <section
      aria-label="Presence Thrive"
      className="relative overflow-hidden rounded-lg border border-border bg-surface"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-[18px] py-4">
        <div className="flex items-center gap-2.5">
          <span className="nx-slash" aria-hidden="true" />
          <div>
            <h2 className="font-display text-[15px] font-semibold">Presence Thrive</h2>
            <p className="text-xs text-muted-foreground">
              Tu presencia digital de un vistazo.
              {presence.scannedAt
                ? ` Analizado ${formatRelativeTime(presence.scannedAt).toLowerCase()}.`
                : " Aún sin analizar."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={analizar}
          disabled={pending}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <RefreshCw className={cn("size-3.5", pending && "animate-spin")} aria-hidden="true" />
          {pending ? "Analizando…" : "Analizar ahora"}
        </button>
      </div>

      <div className="grid gap-5 px-[18px] py-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <span className="font-display text-5xl font-semibold leading-none tabular-nums">{presence.score}</span>
            <span className="pb-1 text-sm text-muted-foreground">/100</span>
            <Badge tone={meta.tone} className="mb-1 ml-auto">
              {meta.label}
            </Badge>
          </div>
          <ProgressBar value={presence.score / 100} tone={meta.bar} label="Presencia digital" className="h-2" />
          <p className="text-[13px] text-muted-foreground">{meta.tagline}</p>

          <ul className="mt-1 grid gap-2.5 sm:grid-cols-2">
            {presence.checks.map((check) => (
              <Chequeo key={check.key} check={check} />
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            {channels.map((channel) => (
              <Canal key={channel.key} channel={channel} />
            ))}
          </div>

          {previewReady ? (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-muted px-3 py-1.5">
                <span className="truncate text-xs text-muted-foreground">{siteHost}</span>
                {presence.siteUrl ? (
                  <Link href={presence.siteUrl} target="_blank" className="text-xs font-semibold text-accent-text">
                    Abrir →
                  </Link>
                ) : null}
              </div>
              <iframe
                src={presence.siteUrl ?? undefined}
                title="Vista previa del sitio"
                loading="lazy"
                sandbox="allow-scripts"
                className="h-44 w-full bg-background"
              />
            </div>
          ) : (
            <div className="flex flex-col items-start gap-1.5 rounded-md border border-dashed border-border-strong bg-background p-3">
              <p className="text-[13px] font-medium">Tu página con Presence Thrive</p>
              <p className="text-xs text-muted-foreground">
                Te la diseñamos, la publicamos y aparece aquí mismo. También suma a tu puntaje.
              </p>
              <Link href={settingsHref} className="mt-1 text-xs font-semibold text-accent-text">
                Solicitar mi página →
              </Link>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {presence.instagramHandle || presence.googleBusinessUrl
              ? "Edita tus canales en "
              : "Conecta tus canales en "}
            <Link href={settingsHref} className="font-semibold text-accent-text">
              Ajustes → Perfil
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

export default PresencePanel;
