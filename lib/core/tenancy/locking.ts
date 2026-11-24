import { db } from "@/prisma/db";
import type { DbTransaction } from "@/lib/foundation/db/db-transaction";

/** All lifecycle mutations lock the tenant before touching invitations or members. */
export async function lockTenant(tx: DbTransaction, tenantId: string) {
  await tx.query(db.raw.sql`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`.returnsRow({ id: "pg/text@1" }).build());
  return tx.orm.public.Tenant.where({ id: tenantId }).first();
}
