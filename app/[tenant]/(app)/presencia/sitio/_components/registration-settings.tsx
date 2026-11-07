"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ImagePlus } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Switch } from "@/components/atoms/switch";
import { useToast } from "@/components/molecules/toast";
import RegistrationCard from "@/app/registro/[tenant]/registration-card";
import { saveRegistrationSettingsAction, uploadTenantLogoAction } from "@/app/[tenant]/(app)/presencia/sitio/actions";

/**
 * Enlace público de registro de clientes del gimnasio: activarlo, poner el
 * logotipo y copiar la URL que se comparte. El alta solo guarda al cliente;
 * la membresía la asigna el personal después.
 */
export default function RegistrationSettings({
  slug,
  baseUrl,
  initialEnabled,
  initialLogoId,
  businessName,
}: {
  slug: string;
  baseUrl: string;
  initialEnabled: boolean;
  initialLogoId: string | null;
  businessName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [logoId, setLogoId] = useState(initialLogoId);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const publicUrl = `${baseUrl}/registro/${slug}`;
  const logoUrl = logoId ? `/api/files/${logoId}` : null;

  const toggle = (next: boolean) => {
    setEnabled(next);
    start(async () => {
      const result = await saveRegistrationSettingsAction(slug, next);
      if (!result.ok) {
        setEnabled(!next);
        toast({ title: "No se guardó", description: result.message, variant: "error" });
        return;
      }
      toast(result.message, "success");
      router.refresh();
    });
  };

  const upload = (file: File) => {
    const formData = new FormData();
    formData.set("logo", file);
    start(async () => {
      const result = await uploadTenantLogoAction(slug, formData);
      if (!result.ok) {
        toast({ title: "No se subió", description: result.message, variant: "error" });
        return;
      }
      setLogoId(result.logoId ?? null);
      toast(result.message, "success");
      router.refresh();
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "No se pudo copiar", description: "Selecciona el enlace y cópialo manualmente.", variant: "error" });
    }
  };

  return (
    <>
    <section aria-labelledby="site-registration" className="grid gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="site-registration" className="font-display text-base font-semibold">
            Panel de registro de cliente
          </h2>
          <p className="text-xs text-muted-foreground">Tus clientes se registran solos y tú les asignas la membresía después.</p>
        </div>
        <label className="flex items-center gap-2 text-ui">
          <Switch checked={enabled} onCheckedChange={toggle} disabled={pending} aria-label="Registro público activo" />
          {enabled ? "Activo" : "Inactivo"}
        </label>
      </div>

      <div className="flex items-center gap-3 rounded-md bg-surface-muted p-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logotipo del negocio" className="size-12 rounded-lg border border-border bg-card object-contain p-1" />
        ) : (
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-lg border border-dashed border-border bg-card text-muted-foreground">
            <ImagePlus className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-ui font-medium">Logotipo</p>
          <p className="text-xs text-muted-foreground">JPG, PNG o WEBP · hasta 8 MB.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {logoId ? "Cambiar" : "Subir"}
        </button>
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-medium text-muted-foreground">Enlace para compartir</p>
        <div className="flex items-center gap-2">
          <input readOnly value={publicUrl} onFocus={(event) => event.target.select()} className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 font-mono text-xs text-muted-foreground" aria-label="Enlace público de registro" />
          <button type="button" onClick={copy} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {copied ? <Check aria-hidden="true" className="size-4 text-success" /> : <Copy aria-hidden="true" className="size-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        {!enabled ? (
          <p className="text-xs text-muted-foreground">El enlace muestra “Registro no disponible” hasta que lo actives.</p>
        ) : null}
      </div>
    </section>

    <section aria-labelledby="registration-preview" className="grid gap-3 rounded-lg border border-border bg-surface-muted p-4 sm:p-6">
      <h2 id="registration-preview" className="font-display text-base font-semibold">Así lo ve tu cliente</h2>
      <RegistrationCard slug={slug} name={businessName} logoUrl={logoUrl} preview />
    </section>
    </>
  );
}
