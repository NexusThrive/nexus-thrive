#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/35f49d1db560ddae70a4f93360841ef22a1c5b80ff57c763c78ce1a901fedb0a/contract';
import endContract from '../../snapshots/35f49d1db560ddae70a4f93360841ef22a1c5b80ff57c763c78ce1a901fedb0a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/3aca39e5ff3919caa942258f02c8eeee94f91e826925129490c8fa6e40c1059b/contract';
import startContract from '../../snapshots/3aca39e5ff3919caa942258f02c8eeee94f91e826925129490c8fa6e40c1059b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Delivery',
        columns: [
          col('carrier', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('deliveredAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('method', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('orderId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('receivedBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scheduledFor', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('trackingCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Delivery',
        constraint: 'Delivery_orderId_key',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Delivery',
        index: 'Delivery_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Delivery',
        index: 'Delivery_tenantId_scheduledFor_idx_c01a0bda',
        columns: ['tenantId', 'scheduledFor'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Delivery',
        foreignKey: {
          name: 'Delivery_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Delivery',
        foreignKey: {
          name: 'Delivery_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'StoreOrder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Delivery' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
