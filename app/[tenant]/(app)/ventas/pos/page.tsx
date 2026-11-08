/**
 * El punto de venta vive en `/pos`. Esta ruta se conserva para los enlaces y marcadores de antes: muestra lo mismo en vez de
 * redirigir, porque los navegadores que guardaron la redirección permanente de `/pos` hacia aquí entrarían en bucle.
 */
export { default } from "@/app/[tenant]/(app)/pos/page";
