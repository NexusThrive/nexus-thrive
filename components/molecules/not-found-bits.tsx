"use client";

import { usePathname, useRouter } from "next/navigation";

/** Vuelve a la página anterior; sin historial, al inicio. */
export function NotFoundBack() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="nf-btn nf-btn--ghost"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="m11 18-6-6 6-6" />
      </svg>
      Página anterior
    </button>
  );
}

/** La ruta que se pidió, para la línea de registro. */
export function NotFoundPath() {
  const pathname = usePathname();
  return <span className="nf-trace-path">{pathname || "/"}</span>;
}
