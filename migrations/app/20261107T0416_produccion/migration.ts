#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3aca39e5ff3919caa942258f02c8eeee94f91e826925129490c8fa6e40c1059b/contract';
import endContract from '../../snapshots/3aca39e5ff3919caa942258f02c8eeee94f91e826925129490c8fa6e40c1059b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b115839d78e08ee65bc68952fc4c3565ab00c122dc57a6c3b712c3f296542cde/contract';
import startContract from '../../snapshots/b115839d78e08ee65bc68952fc4c3565ab00c122dc57a6c3b712c3f296542cde/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ProductionOrder',
        columns: [
          col('assigneeId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('doneAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('orderId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('orderLineId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('stage', 'text', {
            notNull: true,
            default: lit('QUEUED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('startedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProductionOrder',
        constraint: 'ProductionOrder_tenantId_orderLineId_key',
        columns: ['tenantId', 'orderLineId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductionOrder',
        index: 'ProductionOrder_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductionOrder',
        index: 'ProductionOrder_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductionOrder',
        index: 'ProductionOrder_tenantId_orderId_idx_095ca8c4',
        columns: ['tenantId', 'orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductionOrder',
        index: 'ProductionOrder_tenantId_stage_createdAt_idx_99f08344',
        columns: ['tenantId', 'stage', 'createdAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductionOrder',
        foreignKey: {
          name: 'ProductionOrder_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductionOrder',
        foreignKey: {
          name: 'ProductionOrder_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'StoreOrder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ProductionOrder' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
