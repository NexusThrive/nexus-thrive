#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/71ace5dfb84fb9f5cb2047694abcf7ac3ff948d4a58421e95753e84700a01656/contract';
import endContract from '../../snapshots/71ace5dfb84fb9f5cb2047694abcf7ac3ff948d4a58421e95753e84700a01656/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cc24854806689dd427b75f8507abc0584c00f554c22fd521a60dc6d9fb3354a7/contract';
import startContract from '../../snapshots/cc24854806689dd427b75f8507abc0584c00f554c22fd521a60dc6d9fb3354a7/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'UsageCounter',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('limitQuantity', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('meter', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('period', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'AuditLog',
        column: col('actorType', 'text', {
          notNull: true,
          default: lit('USER'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'AuditLog',
        column: col('apiKeyId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'AuditLog',
        column: col('requestId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'UsageCounter',
        constraint: 'UsageCounter_tenantId_meter_period_key',
        columns: ['tenantId', 'meter', 'period'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_apiKeyId_idx_7bbbe9ea',
        columns: ['apiKeyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UsageCounter',
        index: 'UsageCounter_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UsageCounter',
        index: 'UsageCounter_tenantId_period_idx_f0994702',
        columns: ['tenantId', 'period'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UsageCounter',
        foreignKey: {
          name: 'UsageCounter_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'UsageCounter' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
