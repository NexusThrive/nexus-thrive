#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/07381774a799e22873af0cbf20aff2bc46ae1d20c2bd9e6b63a27eb935c8c335/contract';
import startContract from '../../snapshots/07381774a799e22873af0cbf20aff2bc46ae1d20c2bd9e6b63a27eb935c8c335/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8b0874c717256d26943471f07112dc2dd3e70f25bf387ef575153deb478762e4/contract';
import endContract from '../../snapshots/8b0874c717256d26943471f07112dc2dd3e70f25bf387ef575153deb478762e4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'BudgetLockEvent',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('budgetId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetLockEvent',
        index: 'BudgetLockEvent_budgetId_createdAt_idx_81273a2c',
        columns: ['budgetId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetLockEvent',
        index: 'BudgetLockEvent_budgetId_idx_abbf614c',
        columns: ['budgetId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetLockEvent',
        index: 'BudgetLockEvent_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetLockEvent',
        foreignKey: {
          name: 'BudgetLockEvent_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetLockEvent',
        foreignKey: {
          name: 'BudgetLockEvent_budgetId_fkey',
          columns: ['budgetId'],
          references: { schema: 'public', table: 'ProjectBudget', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
