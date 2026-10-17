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

  // Tenant routes: /{tenant}/* pasan tal cual; el layout `[tenant]` valida
  // sesión y membresía (y cada server action lo revalida).

  // Root → sign-in
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
