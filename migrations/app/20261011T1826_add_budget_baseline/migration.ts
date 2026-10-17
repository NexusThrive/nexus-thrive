#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/07381774a799e22873af0cbf20aff2bc46ae1d20c2bd9e6b63a27eb935c8c335/contract';
import endContract from '../../snapshots/07381774a799e22873af0cbf20aff2bc46ae1d20c2bd9e6b63a27eb935c8c335/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/77c8ba7395a5ab33bb41159f8d3003dbd2bcaf220a24a16e2efaae30235dd4d8/contract';
import startContract from '../../snapshots/77c8ba7395a5ab33bb41159f8d3003dbd2bcaf220a24a16e2efaae30235dd4d8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'BudgetBaseline',
        columns: [
          col('adminTotal', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('approvedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('approvedByName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('budgetId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('budgetRevision', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('chapterCount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('directCostTotal', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('grandTotal', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('imprevTotal', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('itemCount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('ivaUtilidadTotal', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('snapshot', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('utilidadTotal', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('version', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BudgetBaseline',
        constraint: 'BudgetBaseline_budgetId_version_key',
        columns: ['budgetId', 'version'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetBaseline',
        index: 'BudgetBaseline_budgetId_idx_abbf614c',
        columns: ['budgetId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetBaseline',
        index: 'BudgetBaseline_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetBaseline',
        foreignKey: {
          name: 'BudgetBaseline_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetBaseline',
        foreignKey: {
          name: 'BudgetBaseline_budgetId_fkey',
          columns: ['budgetId'],
          references: { schema: 'public', table: 'ProjectBudget', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
