#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/59fdc0abebafd593ad3630fbe2448f921141c3f7155c7b77a74d2fcf9e502398/contract';
import endContract from '../../snapshots/59fdc0abebafd593ad3630fbe2448f921141c3f7155c7b77a74d2fcf9e502398/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/953e4d106a57aefda8e12e3671823b2b7ac1df966b02bc1ccf71bda6764f4935/contract';
import startContract from '../../snapshots/953e4d106a57aefda8e12e3671823b2b7ac1df966b02bc1ccf71bda6764f4935/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PaymentAttempt',
        columns: [
          col('amount', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('externalId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('intentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('result', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PaymentAttempt',
        constraint: 'PaymentAttempt_tenantId_intentId_externalId_key',
        columns: ['tenantId', 'intentId', 'externalId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentAttempt',
        index: 'PaymentAttempt_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentAttempt',
        index: 'PaymentAttempt_tenantId_intentId_idx_78c4c2b6',
        columns: ['tenantId', 'intentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PaymentAttempt',
        foreignKey: {
          name: 'PaymentAttempt_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PaymentAttempt' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
