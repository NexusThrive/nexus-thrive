"use server";

import { headers } from "next/headers";
import { allowAttempt, recordAttempt } from "@/lib/rate-limit";
import { placeOrder, type PlaceResult } from "@/lib/store/store-db";
import type { CartLine, CustomerData } from "@/lib/store/cart";

/**
 * Pedido de la tienda pública (sin sesión). Se limita por dirección IP para que nadie llene de pedidos falsos
 * un negocio ajeno; precios y existencias salen de la base, no de lo que mande el navegador.
 */
export async function placeOrderAction(siteSlug: string, customer: CustomerData, lines: CartLine[]): Promise<PlaceResult> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "desconocida";
  const key = `store:${siteSlug}:${ip}`;
  if (!allowAttempt(key, 6)) return { ok: false, message: "Hiciste varios pedidos seguidos. Espera unos minutos o escríbenos por WhatsApp." };
  recordAttempt(key, 6);
  return placeOrder(siteSlug, { customer, lines });
}
