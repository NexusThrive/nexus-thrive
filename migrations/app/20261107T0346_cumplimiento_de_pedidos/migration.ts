#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/94d21b5a060af17494f5e25390e85b2cb3e5fc03b396d2d5cb7206425cf07c55/contract';
import startContract from '../../snapshots/94d21b5a060af17494f5e25390e85b2cb3e5fc03b396d2d5cb7206425cf07c55/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b115839d78e08ee65bc68952fc4c3565ab00c122dc57a6c3b712c3f296542cde/contract';
import endContract from '../../snapshots/b115839d78e08ee65bc68952fc4c3565ab00c122dc57a6c3b712c3f296542cde/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'OrderStatusChange',
        columns: [
          col('byId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fromStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('orderId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('toStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'StoreOrder',
        column: col('fulfillment', 'text', {
          notNull: true,
          default: lit('RECEIVED'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrderStatusChange',
        index: 'OrderStatusChange_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrderStatusChange',
        index: 'OrderStatusChange_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrderStatusChange',
        index: 'OrderStatusChange_tenantId_orderId_createdAt_idx_646b049b',
        columns: ['tenantId', 'orderId', 'createdAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrderStatusChange',
        foreignKey: {
          name: 'OrderStatusChange_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrderStatusChange',
        foreignKey: {
          name: 'OrderStatusChange_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'StoreOrder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'OrderStatusChange' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
