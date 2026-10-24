#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8288b50d0b1468636868c169926e7292ece34ebd659818feec25d333d3028a93/contract';
import startContract from '../../snapshots/8288b50d0b1468636868c169926e7292ece34ebd659818feec25d333d3028a93/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/dd56633c277604483ea709e355b291eeda810165528f2c8e4d3355e6fa47d398/contract';
import endContract from '../../snapshots/dd56633c277604483ea709e355b291eeda810165528f2c8e4d3355e6fa47d398/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'FiscalDocument',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('cufe', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invoiceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastAttemptAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('payload', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('provider', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('providerRef', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('rejectReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING_PROVIDER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('supplierInvoiceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'Tenant',
        column: col('einvoiceEnabled', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'FiscalDocument',
        constraint: 'FiscalDocument_tenantId_invoiceId_key',
        columns: ['tenantId', 'invoiceId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'FiscalDocument',
        constraint: 'FiscalDocument_tenantId_supplierInvoiceId_key',
        columns: ['tenantId', 'supplierInvoiceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FiscalDocument',
        index: 'FiscalDocument_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FiscalDocument',
        index: 'FiscalDocument_tenantId_status_idx_d3d04256',
        columns: ['tenantId', 'status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'FiscalDocument',
        foreignKey: {
          name: 'FiscalDocument_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'FiscalDocument' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
