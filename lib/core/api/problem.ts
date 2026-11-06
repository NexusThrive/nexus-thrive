/**
 * Errores de la API según RFC 9457 (`application/problem+json`): `type`, `title`,
 * `status`, `detail`, `code` estable y `request_id` para soporte.
 */
export type ProblemCode =
  | "unauthorized"
  | "key_expired"
  | "key_revoked"
  | "ip_not_allowed"
  | "scope_denied"
  | "forbidden"
  | "module_inactive"
  | "not_found"
  | "method_not_allowed"
  | "invalid_input"
  | "rule_violation"
  | "idempotency_key_required"
  | "idempotency_conflict"
  | "idempotency_in_progress"
  | "rate_limited"
  | "quota_exceeded"
  | "tenant_inactive"
  | "internal";

const TITLES: Record<ProblemCode, string> = {
  unauthorized: "No autenticado",
  key_expired: "La llave venció",
  key_revoked: "La llave fue revocada",
  ip_not_allowed: "Dirección IP no permitida",
  scope_denied: "La llave no tiene este alcance",
  forbidden: "Sin permiso",
  module_inactive: "Módulo inactivo",
  not_found: "No encontrado",
  method_not_allowed: "Método no permitido",
  invalid_input: "Datos inválidos",
  rule_violation: "Regla de negocio",
  idempotency_key_required: "Falta la Idempotency-Key",
  idempotency_conflict: "Idempotency-Key ya usada con otros datos",
  idempotency_in_progress: "Petición en curso",
  rate_limited: "Demasiadas peticiones",
  quota_exceeded: "Cupo mensual agotado",
  tenant_inactive: "Negocio inactivo",
  internal: "Error interno",
};

/**
 * Respuesta de error en formato «problem details»: estado, código, título, detalle, id de petición y, si aplica, los errores por campo.
 */
export function problem(
  status: number,
  code: ProblemCode,
  detail: string,
  requestId: string,
  extra: { headers?: Record<string, string>; errors?: unknown } = {},
): Response {
  const body = {
    type: `https://nexusthrive.co/errors/${code}`,
    title: TITLES[code],
    status,
    detail,
    code,
    request_id: requestId,
    ...(extra.errors ? { errors: extra.errors } : {}),
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/problem+json; charset=utf-8", "x-request-id": requestId, "cache-control": "no-store", ...extra.headers },
  });
}
