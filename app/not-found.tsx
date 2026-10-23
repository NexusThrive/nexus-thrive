import type { Metadata } from "next";
import Link from "next/link";
import { N_PATH } from "@/components/atoms/n-path";
import { NotFoundBack, NotFoundPath } from "@/components/molecules/not-found-bits";
import "../packages/brand/css/not-found.css";

export const metadata: Metadata = {
  title: "Página no encontrada · NEXUS THRIVE",
};

/**
 * 404 de NEXUS: la misma de la landing (nexus-thrive-web/src/pages/404.astro),
 * con el CSS compartido de packages/brand/css/not-found.css.
 */
export default function NotFound() {
  return (
    <main className="nf" aria-labelledby="nf-title">
      <div className="nf-grid" aria-hidden="true" />
      <div className="nf-beam" aria-hidden="true" />
      <section className="nf-card">
        <p className="nf-eyebrow">
          <span className="nf-dot" aria-hidden="true" />
          Error 404 · Ruta no encontrada
        </p>
        <div className="nf-code" role="img" aria-label="404">
          <span className="nf-digit" aria-hidden="true">4</span>
          <svg className="nf-n" viewBox="380 225 765 665" aria-hidden="true">
            <path className="o" d={N_PATH} pathLength={1} />
            <path className="f" d={N_PATH} />
            <path className="t" d={N_PATH} pathLength={1} />
          </svg>
          <span className="nf-digit" aria-hidden="true">4</span>
        </div>
        <h1 id="nf-title" className="nf-title">Esta ruta no está en el sistema.</h1>
        <p className="nf-text">
          La página que buscas no existe o cambió de lugar. Todo lo demás sigue funcionando.
        </p>
        <div className="nf-actions">
          <Link href="/" className="nf-btn nf-btn--primary">
            Volver al inicio
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </Link>
          <NotFoundBack />
        </div>
        <p className="nf-trace">
          <span>GET</span>
          <NotFoundPath />
          <span className="nf-trace-code">404</span>
        </p>
      </section>
    </main>
  );
}
