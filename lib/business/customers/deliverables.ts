import { createHash, randomBytes } from "node:crypto";

/**
 * Entregables (HU-entregables-01), reglas puras: estados, la decisión del cliente y el enlace de revisión. El enlace es de un solo
 * propósito (ver y decidir ese entregable), caduca y nunca se guarda en claro: solo su huella SHA-256.
 */
export const DELIVERABLE_STATES = ["DRAFT", "IN_REVIEW", "APPROVED", "CHANGES_REQUESTED"] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATES)[number];
export const DELIVERABLE_TEXT: Record<DeliverableStatus, string> = { DRAFT: "En preparación", IN_REVIEW: "En revisión del cliente", APPROVED: "Aprobado", CHANGES_REQUESTED: "Con cambios pedidos" };

/** Días que vive un enlace de revisión. */
export const REVIEW_LINK_DAYS = 30;

/** ¿Se puede enviar a revisión desde este estado? (preparado o devuelto con cambios). Un aprobado es final. */
export const canSend = (status: string): boolean => status === "DRAFT" || status === "CHANGES_REQUESTED";

export function validateDeliverable(i: { title: string; description?: string | null }): string | null {
  if (i.title.trim().length < 3) return "Ponle un nombre al entregable.";
  if (i.title.trim().length > 160) return "El nombre es muy largo (máximo 160 caracteres).";
  if ((i.description ?? "").length > 1000) return "La descripción es muy larga (máximo 1000 caracteres).";
  return null;
}

export type Decision = "APPROVED" | "CHANGES_REQUESTED";

/** Problema de la decisión del cliente por campo, o `null` si es válida. Pedir cambios exige decir cuáles. */
export function validateDecision(i: { decision: string; name: string; comment: string }): { field: "decision" | "name" | "comment"; message: string } | null {
  if (i.decision !== "APPROVED" && i.decision !== "CHANGES_REQUESTED") return { field: "decision", message: "Elige aprobar o pedir cambios." };
  if (i.name.trim().length < 2) return { field: "name", message: "Escribe tu nombre para dejar constancia." };
  if (i.decision === "CHANGES_REQUESTED" && i.comment.trim().length < 5) return { field: "comment", message: "Cuéntanos qué hay que cambiar." };
  return null;
}

/** Enlace nuevo: el secreto para el cliente y su huella para guardar. */
export function newReviewToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

/** Forma válida de un enlace (evita consultar la base con basura). */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
