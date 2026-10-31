/**
 * Interruptor de la V1 (piloto interno).
 *
 * Mientras no haya cobro automático (Wompi), los precios NO se muestran en el
 * onboarding ni en la app del negocio: el acceso se da con un código de uso
 * único (sistema de Beneficios) o con el plan gratuito Essential, y el equipo
 * NEXUS administra planes y tiempos a mano desde el Operations Center.
 *
 * Nada del diseño de cobros se elimina: al pasar a `true` vuelven a verse los
 * precios, el selector de planes y la página pública de precios.
 */
export const SHOW_PRICING = false;
