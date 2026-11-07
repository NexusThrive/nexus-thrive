#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/532d872de56d4f11ee0d5960adea95bc2530e42fd9e8d16cc4117d7838ce7953/contract';
import endContract from '../../snapshots/532d872de56d4f11ee0d5960adea95bc2530e42fd9e8d16cc4117d7838ce7953/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/953cde49823fad6a8729c7eeb33c8233e1d6df02658b323794e1a0f2356cdcac/contract';
import startContract from '../../snapshots/953cde49823fad6a8729c7eeb33c8233e1d6df02658b323794e1a0f2356cdcac/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ProviderSettlement',
        columns: [
          col('accounted', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('day', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('difference', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('externalRef', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('feeEstimated', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('feeReal', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('gross', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('itemCount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('netReceived', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'PaymentIntent',
        column: col('settlementId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProviderSettlement',
        constraint: 'ProviderSettlement_tenantId_provider_externalRef_key',
        columns: ['tenantId', 'provider', 'externalRef'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProviderSettlement',
        index: 'ProviderSettlement_tenantId_createdAt_idx_88162366',
        columns: ['tenantId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProviderSettlement',
        index: 'ProviderSettlement_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProviderSettlement',
        foreignKey: {
          name: 'ProviderSettlement_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ProviderSettlement' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
