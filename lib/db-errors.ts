/**
 * ¿El error es una violación de clave única (23505)? El driver lo expone en
 * `code`, `sqlState` o `cause.code` según la capa; el mensaje es el respaldo.
 */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as {
    code?: string;
    sqlState?: string;
    message?: string;
    cause?: { code?: string };
  };
  const code = e?.code ?? e?.sqlState ?? e?.cause?.code;
  if (code === "23505") return true;
  return typeof e?.message === "string" && /duplicate key value/i.test(e.message);
}
