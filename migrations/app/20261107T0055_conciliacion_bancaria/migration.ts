#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/532d872de56d4f11ee0d5960adea95bc2530e42fd9e8d16cc4117d7838ce7953/contract';
import startContract from '../../snapshots/532d872de56d4f11ee0d5960adea95bc2530e42fd9e8d16cc4117d7838ce7953/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/84495926b9da9545f54ee11e6bd9013f75730f1829380511a67a333495497017/contract';
import endContract from '../../snapshots/84495926b9da9545f54ee11e6bd9013f75730f1829380511a67a333495497017/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'BankStatementLine',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('batch', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('confirmedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('confirmedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('day', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fingerprint', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('matchConfidence', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('matchId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('matchType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('UNMATCHED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BankStatementLine',
        constraint: 'BankStatementLine_tenantId_fingerprint_key',
        columns: ['tenantId', 'fingerprint'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BankStatementLine',
        index: 'BankStatementLine_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BankStatementLine',
        index: 'BankStatementLine_tenantId_status_day_idx_0d0f6919',
        columns: ['tenantId', 'status', 'day'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BankStatementLine',
        foreignKey: {
          name: 'BankStatementLine_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'BankStatementLine' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
