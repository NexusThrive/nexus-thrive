import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, request) => {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Rutas reservadas que pasan directo
  const isReservedRoute =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/__clerk") ||
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

  // Tenant routes: /{tenant}/*
  // Detecta primer segmento como tenant slug
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment) {
    // Rutas conocidas que NO son tenants
    const nonTenantRoutes = ["admin", "onboarding", "sign-in", "sign-up", "api", "_next", "__clerk"];
    
    if (!nonTenantRoutes.includes(firstSegment)) {
      // Es un tenant: /gymcarlos/... → reescribe a /gymcarlos/...
      // Si ya viene con el tenant, pasa directo
      const isTenantScoped = pathname === `/${firstSegment}` || pathname.startsWith(`/${firstSegment}/`);
      
      if (isTenantScoped) {
        return NextResponse.next();
      }
      
      // Reescribe añadiendo el tenant prefix
      return NextResponse.rewrite(
        new URL(`/${firstSegment}${pathname}`, request.url)
      );
    }
  }

  // Root → sign-in
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
