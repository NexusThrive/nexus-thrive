import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, request) => {
  const url = request.nextUrl;
  const pathname = url.pathname;
  const hostname = request.headers.get("host") || "";
  const host = hostname.split(":")[0];

  let subdomain: string | null = null;

  if (host.endsWith(".lvh.me")) {
    subdomain = host.replace(".lvh.me", "");
  } else if (host.endsWith(".localhost")) {
    subdomain = host.replace(".localhost", "");
  }

  const isReservedRoute =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".");

  if (isReservedRoute) {
    return NextResponse.next();
  }

  if (subdomain === "admin") {
    return NextResponse.rewrite(
      new URL(`/admin${pathname}`, request.url)
    );
  }

  if (
    subdomain &&
    subdomain !== "app" &&
    subdomain !== "www"
  ) {
    // Los enlaces internos del shell siempre son /{tenant}/... (multi-tenant).
    // Si la ruta ya viene espaciada por el tenant, no se reescribe de nuevo:
    // evita /gymcarlos/gymcarlos/crm (404) cuando se navega desde el
    // subdominio. Cualquier otra ruta conserva la reescritura original.
    const isTenantScoped =
      pathname === `/${subdomain}` ||
      pathname.startsWith(`/${subdomain}/`);

    if (isTenantScoped) {
      return NextResponse.next();
    }

    return NextResponse.rewrite(
      new URL(`/${subdomain}${pathname}`, request.url)
    );
  }

  if (!subdomain && pathname === "/") {
    return NextResponse.redirect(
      new URL("/sign-in", request.url)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
