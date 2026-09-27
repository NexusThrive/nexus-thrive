"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, FormField, Logo } from "@nexus/ui";
import { registrar } from "@/lib/core/acciones";

export const dynamic = "force-dynamic";

/**
 * REGISTRO — solo la CUENTA de usuario (nombre, email, contraseña).
 * El negocio se crea después, dentro del portal, en el onboarding
 * (/onboarding): ahí se preguntan nombre, rubro, país+moneda, equipo y
 * dolor primero, con la intro de visión (problema → NEXUS es la solución).
 */
export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-nexus-bg text-nexus-muted">Cargando…</div>}>
      <RegistroInner />
    </Suspense>
  );
}

function RegistroInner() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-nexus-bg px-4 py-12"
      style={{
         backgroundImage:
          "radial-gradient(800px 420px at 50% -20%, rgb(255 190 60 / 0.35), transparent 65%), radial-gradient(600px 320px at 50% -10%, rgb(201 130 26 / 0.25), transparent 70%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" />
          <p className="mt-4 text-sm text-nexus-muted">
            Creá tu cuenta — después armamos tu negocio en 5 minutos.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-nexus-border bg-nexus-surface/95 p-7 shadow-lg shadow-nexus-ink/5">
          <h1 className="text-lg font-semibold text-nexus-ink">Creá tu cuenta</h1>

          {error === "campos" && (
            <p className="mt-4 rounded-lg border border-nexus-red/20 bg-nexus-red-soft px-3 py-2 text-sm text-nexus-red-strong">
              Completá todos los campos.
            </p>
          )}
          {error === "password" && (
            <p className="mt-4 rounded-lg border border-nexus-red/20 bg-nexus-red-soft px-3 py-2 text-sm text-nexus-red-strong">
              La contraseña debe tener al menos 6 caracteres.
            </p>
          )}
          {error === "email" && (
            <p className="mt-4 rounded-lg border border-nexus-red/20 bg-nexus-red-soft px-3 py-2 text-sm text-nexus-red-strong">
              Ese email ya tiene una cuenta. Entrá con él.
            </p>
          )}

          <form action={registrar} className="mt-5">
            <FormField label="Tu nombre">
              <input
                name="nombre"
                type="text"
                required
                className="w-full rounded-md border border-nexus-border bg-nexus-surface px-3 py-2 text-sm text-nexus-ink focus:border-nexus-brand focus:outline-none focus:ring-2 focus:ring-nexus-brand/20"
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </FormField>

            <FormField label="Email">
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-nexus-border bg-nexus-surface px-3 py-2 text-sm text-nexus-ink focus:border-nexus-brand focus:outline-none focus:ring-2 focus:ring-nexus-brand/20"
                placeholder="correo@negocio.com"
                autoComplete="email"
              />
            </FormField>

            <FormField label="Contraseña">
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-md border border-nexus-border bg-nexus-surface px-3 py-2 text-sm text-nexus-ink focus:border-nexus-brand focus:outline-none focus:ring-2 focus:ring-nexus-brand/20"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </FormField>

            <Button type="submit" size="lg" className="mt-2 w-full">
              Crear cuenta
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-nexus-muted">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-medium text-nexus-brand hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
