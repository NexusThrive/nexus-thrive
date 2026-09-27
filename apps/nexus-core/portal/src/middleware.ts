export { default } from "next-auth/middleware";

/**
 * Núcleo Nexus (rama core/base): todo lo privado requiere sesión.
 * Público: /login, /registro, /api.
 * Las páginas (protected) re-verifican sesión + org activa + onboarding
 * en el layout, y cada módulo verifica su propia habilitación.
 */
export const config = {
  matcher: ["/", "/onboarding", "/plantillas/:path*", "/modulos/:path*"],
};