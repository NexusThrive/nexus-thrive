"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { NLoader } from "@/components/atoms/n-loader";
import { DateInput } from "@/components/molecules/date-input";
import { Field } from "@/components/molecules/field";
import type { RegistrationActionResult, RegistrationFieldErrors } from "./actions";

const noop = () => () => undefined;

type Values = { name: string; phone: string; email: string; documentId: string; birthDate: string; city: string };

const EMPTY: Values = { name: "", phone: "", email: "", documentId: "", birthDate: "", city: "" };

/** Formulario público: sin sesión, sin elección de plan y con consentimiento explícito. */
export default function RegistrationForm({ slug, business, preview = false }: { slug: string; business: string; preview?: boolean }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<RegistrationFieldErrors>({});
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<{ alreadyRegistered: boolean; name: string } | null>(null);
  const [pending, start] = useTransition();
  // Los gestores de contraseñas (Proton Pass, 1Password…) insertan controles dentro del HTML del servidor antes de
  // hidratar, y eso rompe la hidratación. El formulario se pinta tras montar; mientras, un hueco del mismo alto.
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  const set = (key: keyof Values) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = () =>
    preview ? undefined : start(async () => {
      setMessage("");
      let result: RegistrationActionResult;
      try {
        const response = await fetch(`/api/registro/${encodeURIComponent(slug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, consent }),
        });
        result = (await response.json()) as RegistrationActionResult;
      } catch {
        setMessage("No pudimos enviar tus datos. Revisa tu conexión e inténtalo de nuevo.");
        return;
      }
      if (result.ok) {
        setDone({ alreadyRegistered: result.alreadyRegistered, name: result.name });
        return;
      }
      setErrors(result.errors ?? {});
      setMessage(result.message);
    });

  if (!mounted) return <div aria-hidden="true" className="min-h-[28rem] rounded-lg bg-surface-muted" />;

  if (done) {
    return (
      <div role="status" className="grid gap-3 text-center">
        <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-success" />
        <h2 className="font-display text-lg font-semibold text-foreground">
          {done.alreadyRegistered ? "Ya te tenemos registrado" : `¡Bienvenido, ${done.name.split(" ")[0]}!`}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {done.alreadyRegistered
            ? `Tus datos ya estaban en ${business}. El equipo te contactará para continuar.`
            : `Recibimos tus datos. El equipo de ${business} te contactará para activar tu membresía.`}
        </p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <fieldset disabled={preview} className="contents">
      <Field label="Nombre completo" required error={errors.name}>
        {(c) => <input {...c} autoFocus={!preview} value={values.name} onChange={set("name")} className={inputClasses} autoComplete="name" placeholder="Tu nombre" />}
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="WhatsApp / teléfono" required error={errors.phone}>
          {(c) => <input {...c} type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} className={inputClasses} autoComplete="tel" placeholder="300 000 0000" />}
        </Field>
        <Field label="Correo" error={errors.email}>
          {(c) => <input {...c} type="email" value={values.email} onChange={set("email")} className={inputClasses} autoComplete="email" placeholder="tu@correo.com" />}
        </Field>
        <Field label="Documento" required error={errors.documentId}>
          {(c) => <input {...c} value={values.documentId} onChange={set("documentId")} className={inputClasses} placeholder="Cédula" />}
        </Field>
        <Field label="Fecha de nacimiento" error={errors.birthDate}>
          {(c) => <DateInput {...c} name="birthDate" value={values.birthDate} onChange={(e) => { setValues((v) => ({ ...v, birthDate: e.target.value })); }} />}
        </Field>
        <Field label="Ciudad" error={errors.city} className="sm:col-span-2">
          {(c) => <input {...c} value={values.city} onChange={set("city")} className={inputClasses} autoComplete="address-level2" />}
        </Field>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => {
            setConsent(event.target.checked);
            setErrors((current) => ({ ...current, consent: undefined }));
          }}
          className="mt-0.5 size-4 rounded border-border accent-primary"
          aria-invalid={Boolean(errors.consent)}
        />
        <span className="text-muted-foreground">
          Acepto que {business} use mis datos para contactarme y gestionar mi registro.
          {errors.consent ? <span className="mt-1 block text-xs font-medium text-destructive">{errors.consent}</span> : null}
        </span>
      </label>

      {message ? (
        <p role="alert" className="rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-sm text-danger">
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={buttonVariants()}>
        {pending ? <NLoader size={16} className="text-current" /> : null}
        {pending ? "Enviando…" : "Quiero registrarme"}
      </button>
      </fieldset>
    </form>
  );
}
