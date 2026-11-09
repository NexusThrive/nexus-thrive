#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/953e4d106a57aefda8e12e3671823b2b7ac1df966b02bc1ccf71bda6764f4935/contract';
import endContract from '../../snapshots/953e4d106a57aefda8e12e3671823b2b7ac1df966b02bc1ccf71bda6764f4935/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9ed1f54e32ae6c51941d0175744c5cd16cd77ba61fba583b31b1c5581e04956e/contract';
import startContract from '../../snapshots/9ed1f54e32ae6c51941d0175744c5cd16cd77ba61fba583b31b1c5581e04956e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PaymentAllocation',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paymentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('targetId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('targetType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentAllocation',
        index: 'PaymentAllocation_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentAllocation',
        index: 'PaymentAllocation_tenantId_paymentId_idx_5dee2bd2',
        columns: ['tenantId', 'paymentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentAllocation',
        index: 'PaymentAllocation_tenantId_targetType_targetId_idx_aa5024a9',
        columns: ['tenantId', 'targetType', 'targetId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PaymentAllocation',
        foreignKey: {
          name: 'PaymentAllocation_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PaymentAllocation' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
