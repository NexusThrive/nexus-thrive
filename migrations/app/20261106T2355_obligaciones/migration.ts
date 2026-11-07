#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/74edc8efd274a0096cccffaa9480fda48511c122b0307360432c0778a154409e/contract';
import endContract from '../../snapshots/74edc8efd274a0096cccffaa9480fda48511c122b0307360432c0778a154409e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fbe4a87ab93b742a4693ff5c0c38c3298161bfc6048ebf61ac2309e6605547cf/contract';
import startContract from '../../snapshots/fbe4a87ab93b742a4693ff5c0c38c3298161bfc6048ebf61ac2309e6605547cf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Obligation',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('debtorName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('dueDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('originId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('originType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paidTotal', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Obligation',
        constraint: 'Obligation_tenantId_originType_originId_key',
        columns: ['tenantId', 'originType', 'originId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Obligation',
        index: 'Obligation_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Obligation',
        index: 'Obligation_tenantId_status_dueDate_idx_8121dcd9',
        columns: ['tenantId', 'status', 'dueDate'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Obligation',
        foreignKey: {
          name: 'Obligation_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Obligation' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
