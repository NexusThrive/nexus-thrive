#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8288b50d0b1468636868c169926e7292ece34ebd659818feec25d333d3028a93/contract';
import endContract from '../../snapshots/8288b50d0b1468636868c169926e7292ece34ebd659818feec25d333d3028a93/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c64fb7aa0031082c2b69496d95068f5860f317eb47193e31da424bb2d4cc2dfb/contract';
import startContract from '../../snapshots/c64fb7aa0031082c2b69496d95068f5860f317eb47193e31da424bb2d4cc2dfb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PaymentIntent',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('channel', 'text', {
            notNull: true,
            default: lit('LINK'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('confirmedBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('evidence', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invoiceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paidAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('paymentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('provider', 'text', {
            notNull: true,
            default: lit('sandbox'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('providerRefId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reference', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('refundedTotal', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PaymentRefund',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('intentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ReconciliationRun',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('day', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('differences', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('expected', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('matched', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reported', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PaymentIntent',
        constraint: 'PaymentIntent_reference_key',
        columns: ['reference'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentIntent',
        index: 'PaymentIntent_tenantId_createdAt_idx_88162366',
        columns: ['tenantId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentIntent',
        index: 'PaymentIntent_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentIntent',
        index: 'PaymentIntent_tenantId_status_idx_d3d04256',
        columns: ['tenantId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentRefund',
        index: 'PaymentRefund_intentId_idx_e8967b69',
        columns: ['intentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentRefund',
        index: 'PaymentRefund_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentRefund',
        index: 'PaymentRefund_tenantId_intentId_idx_78c4c2b6',
        columns: ['tenantId', 'intentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ReconciliationRun',
        index: 'ReconciliationRun_tenantId_day_idx_4f30fc67',
        columns: ['tenantId', 'day'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ReconciliationRun',
        index: 'ReconciliationRun_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PaymentIntent',
        foreignKey: {
          name: 'PaymentIntent_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PaymentRefund',
        foreignKey: {
          name: 'PaymentRefund_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PaymentRefund',
        foreignKey: {
          name: 'PaymentRefund_intentId_fkey',
          columns: ['intentId'],
          references: { schema: 'public', table: 'PaymentIntent', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ReconciliationRun',
        foreignKey: {
          name: 'ReconciliationRun_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PaymentIntent' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PaymentRefund' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ReconciliationRun' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
