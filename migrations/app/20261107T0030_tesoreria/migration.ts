#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/59fdc0abebafd593ad3630fbe2448f921141c3f7155c7b77a74d2fcf9e502398/contract';
import startContract from '../../snapshots/59fdc0abebafd593ad3630fbe2448f921141c3f7155c7b77a74d2fcf9e502398/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/953cde49823fad6a8729c7eeb33c8233e1d6df02658b323794e1a0f2356cdcac/contract';
import endContract from '../../snapshots/953cde49823fad6a8729c7eeb33c8233e1d6df02658b323794e1a0f2356cdcac/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'FinancialAccount',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('feeFixed', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('feePct', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('feeVatPct', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ledgerAccount', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('provider', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'PaymentIntent',
        column: col('feeEstimated', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'PaymentIntent',
        column: col('financialAccountId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'PaymentIntent',
        column: col('netExpected', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'FinancialAccount',
        constraint: 'FinancialAccount_tenantId_kind_name_key',
        columns: ['tenantId', 'kind', 'name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FinancialAccount',
        index: 'FinancialAccount_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FinancialAccount',
        index: 'FinancialAccount_tenantId_kind_idx_1e76dd5c',
        columns: ['tenantId', 'kind'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'FinancialAccount',
        foreignKey: {
          name: 'FinancialAccount_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'FinancialAccount' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
