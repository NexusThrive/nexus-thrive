# Verificación 2: Clon limpio y esquema

## Consultas directas en clon limpio (nexus_migrate_test)

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('BudgetLockEvent', 'BudgetBaseline');
-- BudgetLockEvent | BudgetBaseline (2 rows)

SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='ApuItem' AND column_name IN ('active', 'imageUrl', 'createdAt');
-- active | createdAt | imageUrl (3 rows)

SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='ApuActivity' AND column_name='active';
-- active (1 row)
```

## Diff real pg_dump --schema-only (dev vs clon limpio)

Diferencias NO cosméticas (solo FK ON UPDATE CASCADE en dev):

```
- ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;
+ ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;

- ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;
+ ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;

- ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;
+ ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON DELETE SET NULL;

- ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;
+ ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;

- ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;
+ ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON DELETE CASCADE;
```

## Análisis

**Fuente de verdad:** El clon limpio (prisma db migrate) — reproduce el contrato final exactamente.

**Dev tiene deriva:** Las FK con `ON UPDATE CASCADE` provienen de migraciones incrementales históricas que Prisma 8 no reproduce en el plan de migración minimal. El contrato final (contract.prisma + contract.json) no las incluye.

**Tablas y columnas:** Coinciden exactamente (28 tablas, ApuItem.active/imageUrl/createdAt, ApuActivity.active, BudgetLockEvent, BudgetBaseline presentes).

**Migraciones aplicadas (11 de 15):**
1. 20261008T0438_baseline
2. 20261008T0439_migration
3. 20261008T2100_add_audit_log_and_suspension
4. 20261008T2202_add_adaptive_onboarding_profile
5. 20261011T0003_add_project_container
6. 20261011T0102_add_project_budget_apu
7. 20261011T0147_add_lean_planner
8. 20261011T0342_add_field_log
9. 20261011T1817_add_budget_revision
10. 20261011T1826_add_budget_baseline
11. 20261012T0021_etapa2_apu_active_createdat

**No aplicadas (4, historia consolidada):**
- 20261009173408_add_booking_model
- 20261009T2235_migration
- 20261010T0641_initial
- 20261011T2356_add_budget_lock_event (contenido ya en contrato final)
