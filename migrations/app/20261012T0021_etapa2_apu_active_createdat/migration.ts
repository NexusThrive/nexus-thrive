#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/07381774a799e22873af0cbf20aff2bc46ae1d20c2bd9e6b63a27eb935c8c335/contract';
import startContract from '../../snapshots/07381774a799e22873af0cbf20aff2bc46ae1d20c2bd9e6b63a27eb935c8c335/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b100b157f7297f6043043d056fafc20140e29a737cec0d416fb9862d89abf4e7/contract';
import endContract from '../../snapshots/b100b157f7297f6043043d056fafc20140e29a737cec0d416fb9862d89abf4e7/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

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
      this.addColumn({
        schema: 'public',
        table: 'ApuActivity',
        column: col('active', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuItem',
        column: col('active', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuItem',
        column: col('createdAt', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuItem',
        column: col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
