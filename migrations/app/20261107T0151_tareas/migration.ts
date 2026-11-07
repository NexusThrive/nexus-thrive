#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/138a345014a8fb658a06e23a7bb305a6d650968ed2f1564ca3dc4c909f7177af/contract';
import endContract from '../../snapshots/138a345014a8fb658a06e23a7bb305a6d650968ed2f1564ca3dc4c909f7177af/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fca68f7fb259f2a3cb8e56480adfd48b98b5249c9c99dbaf1259d061448d158d/contract';
import startContract from '../../snapshots/fca68f7fb259f2a3cb8e56480adfd48b98b5249c9c99dbaf1259d061448d158d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Task',
        columns: [
          col('assigneeId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('doneAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('doneById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('dueDay', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('opportunityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Task',
        index: 'Task_tenantId_assigneeId_status_idx_580462e1',
        columns: ['tenantId', 'assigneeId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Task',
        index: 'Task_tenantId_customerId_idx_302ad259',
        columns: ['tenantId', 'customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Task',
        index: 'Task_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Task',
        index: 'Task_tenantId_status_dueDay_idx_d302ca36',
        columns: ['tenantId', 'status', 'dueDay'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Task',
        foreignKey: {
          name: 'Task_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Task' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
