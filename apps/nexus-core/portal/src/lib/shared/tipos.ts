/**
 * Tipos de vista para el portal. NINGÚN dato inventado acá:
 * todo se consulta desde la base (ver lib/gym.ts).
 */

export type MovementStatus = "approved" | "pending" | "rejected";

export interface Movement {
  id: string;
  date: string; // ISO (YYYY-MM-DD)
  concept: string;
  category: string;
  type: "income" | "expense";
  status: MovementStatus;
  amount: number; // siempre positivo; el signo lo da `type`
}

export interface MonthlyFlow {
  month: string; // etiqueta corta: "abr"
  income: number;
  expenses: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
}

export interface NegocioMetrics {
  cash: number;
  income: number;
  expenses: number;
  activeMembers: number;
}