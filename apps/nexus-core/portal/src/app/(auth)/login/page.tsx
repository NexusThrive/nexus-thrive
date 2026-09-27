"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import { Button, FormField, Logo } from "@nexus/ui";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-nexus-bg text-nexus-muted">
          Cargando…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const ok = params.get("ok") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-nexus-bg px-4 py-12"
      style={{
        backgroundImage:
          "radial-gradient(800px 420px at 50% -20%, rgb(255 190 60 / 0.35), transparent 65%), radial-gradient(600px 320px at 50% -10%, rgb(201 130 26 / 0.25), transparent 70%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" />
          <p className="mt-4 text-sm text-nexus-muted">
            Soluciones para tu negocio, de principio a fin.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-nexus-border bg-nexus-surface/95 p-7 shadow-lg shadow-nexus-ink/5">
          <h1 className="text-lg font-semibold text-nexus-ink">Entrá a Nexus</h1>

          {ok && (
            <p className="mt-4 rounded-lg border border-nexus-green/20 bg-nexus-green-soft px-3 py-2 text-sm text-nexus-green-strong">
              Cuenta creada. Ahora entrá.
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-lg border border-nexus-red/20 bg-nexus-red-soft px-3 py-2 text-sm text-nexus-red-strong">
              {error}
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-5">
            <FormField label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-nexus-border bg-nexus-surface px-3 py-2 text-sm text-nexus-ink transition focus:border-nexus-brand focus:outline-none focus:ring-2 focus:ring-nexus-brand/20"
                placeholder="correo@negocio.com"
                autoComplete="email"
              />
            </FormField>

            <FormField label="Contraseña">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-nexus-border bg-nexus-surface px-3 py-2 text-sm text-nexus-ink transition focus:border-nexus-brand focus:outline-none focus:ring-2 focus:ring-nexus-brand/20"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </FormField>

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-nexus-muted">
            ¿No tenés cuenta?{" "}
            <Link
              href="/registro"
              className="font-medium text-nexus-brand hover:underline"
            >
              Creá tu negocio
            </Link>
          </p>
        </div>

        {/* Cuentas demo: las que `pnpm db:seed:demo` crea y mantiene. Antes
            apuntaba a laura@zonarosa.com, residuo de un seed viejo que ya no
            existe en el repo (mismo email en dos orgs) — con una base nueva
            ese hint no autenticaba nada. */}
        <div className="mt-6 text-center text-xs text-nexus-muted">
          <p>Demo · Admin123</p>
          <p className="mt-1">
            <span className="text-nexus-ink">yoli@zonarosa.com</span> (plantilla Gym) ·{" "}
            <span className="text-nexus-ink">profe@casamuseopozon.com</span> (Caja Menor)
          </p>
        </div>
      </div>
    </main>
  );
}
