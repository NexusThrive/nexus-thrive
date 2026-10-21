import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Ruta del proxy de la Frontend API de Clerk. Solo se usa si el dominio de
 * Clerk no es alcanzable (DNS, certificado o red): en ese caso el script de
 * ClerkJS se pide a `{base}/__clerk/...` y el middleware lo reenvía a Clerk.
 * Se activa con `NEXT_PUBLIC_CLERK_PROXY_URL` (ver `.env.example`).
 */
const CLERK_PROXY_PATH = "/__clerk";

export default clerkMiddleware(
  async (auth, request) => {
    const url = request.nextUrl;
    const pathname = url.pathname;

    // Rutas reservadas que pasan directo
    const isReservedRoute =
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith(CLERK_PROXY_PATH) ||
      pathname.includes(".");

    if (isReservedRoute) {
      return NextResponse.next();
    }

    // Admin panel: /admin/*
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return NextResponse.next();
    }

    // Onboarding top-level
    if (pathname === "/onboarding") {
      return NextResponse.next();
    }

    // Tenant routes: /{tenant}/* pasan tal cual; el layout `[tenant]` valida
    // sesión y membresía (y cada server action lo revalida).

    // Raíz: si hay sesión, la decisión de destino se toma en /auth/callback
    // (equipo de NEXUS → panel, invitación → su negocio, nuevo → onboarding).
    // Sin sesión, al acceso.
    if (pathname === "/") {
      const { userId } = await auth();
      return NextResponse.redirect(
        new URL(userId ? "/auth/callback" : "/sign-in", request.url),
      );
    }

    return NextResponse.next();
  },
  // Proxy de la Frontend API: solo si está configurado el proxy en el
  // entorno. Con él, ClerkJS se carga desde nuestro propio dominio.
  process.env.NEXT_PUBLIC_CLERK_PROXY_URL
    ? { frontendApiProxy: { enabled: true, path: CLERK_PROXY_PATH } }
    : {},
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
