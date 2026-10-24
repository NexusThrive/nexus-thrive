import { db } from "@/prisma/db";
import type { UsageSignals } from "./suggestions";

/** Qué hace ya el negocio (conteos baratos) para sugerir funciones. */
export async function usageSignals(tenantId: string): Promise<UsageSignals> {
  const [tracked, customers, withPhone, payments] = await Promise.all([
    db.orm.public.Product.where({ tenantId, trackStock: true, active: true }).aggregate((a) => ({ n: a.count() })),
    db.orm.public.Customer.where({ tenantId, active: true }).aggregate((a) => ({ n: a.count() })),
    db.orm.public.Customer.where({ tenantId, active: true }).where((c) => c.phone.isNotNull()).aggregate((a) => ({ n: a.count() })),
    db.orm.public.Payment.where({ tenantId }).aggregate((a) => ({ n: a.count() })),
  ]);
  return { trackedProducts: Number(tracked.n), customers: Number(customers.n), customersWithPhone: Number(withPhone.n), payments: Number(payments.n) };
}
