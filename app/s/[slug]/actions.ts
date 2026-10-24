"use server";

import { headers } from "next/headers";
import { allowAttempt, recordAttempt } from "@/lib/rate-limit";
import { createLead, createReview } from "@/lib/growth/growth-db";
import { placeOrder, type PlaceResult } from "@/lib/store/store-db";
import type { CartLine, CustomerData } from "@/lib/store/cart";

/**
 * Pedido de la tienda pública (sin sesión). Se limita por dirección IP para que nadie llene de pedidos falsos
 * un negocio ajeno; precios y existencias salen de la base, no de lo que mande el navegador.
 */
export async function placeOrderAction(siteSlug: string, customer: CustomerData, lines: CartLine[], origin?: unknown): Promise<PlaceResult> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "desconocida";
  const key = `store:${siteSlug}:${ip}`;
  if (!allowAttempt(key, 6)) return { ok: false, message: "Hiciste varios pedidos seguidos. Espera unos minutos o escríbenos por WhatsApp." };
  recordAttempt(key, 6);
  return placeOrder(siteSlug, { customer, lines, origin });
}

/** Formulario de contacto del sitio público (con el origen de la visita). */
export async function createLeadAction(siteSlug: string, input: { name: string; phone: string; email: string; message: string }, origin?: unknown) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "desconocida";
  const key = `lead:${siteSlug}:${ip}`;
  if (!allowAttempt(key, 5)) return { ok: false as const, message: "Enviaste varios mensajes seguidos. Espera unos minutos o escríbenos por WhatsApp." };
  recordAttempt(key, 5);
  return createLead(siteSlug, { ...input, origin });
}

/** Reseña desde el enlace público del negocio. */
export async function createReviewAction(siteSlug: string, input: { rating: number; comment: string; name: string; contact: string }) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "desconocida";
  const key = `review:${siteSlug}:${ip}`;
  if (!allowAttempt(key, 4)) return { ok: false as const, message: "Ya enviaste varias reseñas. Gracias, espera unos minutos para enviar otra." };
  recordAttempt(key, 4);
  return createReview(siteSlug, input);
}
