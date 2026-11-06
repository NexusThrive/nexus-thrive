/** Regla de negocio que impide una operación de dinero: aborta la transacción con un mensaje para la persona. */
export class MoneyError extends Error {}

/**
 * Corre una operación de dinero y convierte el rechazo de una regla (`MoneyError`: monto sobre el tope, cobro repetido,
 * saldo, caja cerrada…) en un resultado para mostrar en la interfaz. Cualquier otro error sigue siendo una falla real y se propaga.
 */
export async function moneyOutcome<T>(run: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    if (error instanceof MoneyError) return { ok: false, message: error.message };
    throw error;
  }
}
