import Link from "next/link";
import { Brand } from "@/components/atoms/logo";

/**
 * Página pública raíz: presentación de marca NEXUS THRIVE con acceso a
 * autenticación. El acceso real a cada negocio ocurre bajo /[tenant],
 * onboarding y admin; aquí solo se da la entrada.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 bg-ink px-6 py-20">
      <Brand tone="on-ink" className="scale-125" />

      <div className="max-w-xl text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
          El sistema operativo de tu negocio
        </h1>
        <p className="mt-3 text-base leading-7 text-paper/70">
          CRM, finanzas, membresías y cotizaciones con APU en un solo lugar.
          Nexus Thrive organiza la operación para que tú dirijas.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/sign-in"
          className="inline-flex h-11 items-center justify-center rounded-md bg-paper px-6 text-sm font-semibold text-ink transition hover:bg-paper/90"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex h-11 items-center justify-center rounded-md border border-paper/25 px-6 text-sm font-semibold text-paper transition hover:border-paper/50 hover:bg-paper/5"
        >
          Crear negocio
        </Link>
      </div>

      <p className="text-xs text-paper/40">
        © {new Date().getFullYear()} Nexus Thrive
      </p>
    </main>
  );
}