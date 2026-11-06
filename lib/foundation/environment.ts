/**
 * La pasarela de pagos de prueba no mueve dinero: en producción solo se usa si se habilita a propósito
 * (`ALLOW_SANDBOX_PAYMENTS=true`, para una demo). Sin eso, un negocio real nunca cobra con ella.
 */
export function sandboxPaymentsAllowed(env: { NODE_ENV?: string; ALLOW_SANDBOX_PAYMENTS?: string } = process.env): boolean {
  return env.NODE_ENV !== "production" || env.ALLOW_SANDBOX_PAYMENTS === "true";
}
