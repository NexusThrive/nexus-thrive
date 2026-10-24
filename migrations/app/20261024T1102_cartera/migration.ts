#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/35370b0e28c7b144871c24d4b6596e4c51189286990e98b31bb6bb39ed51a3ae/contract';
import endContract from '../../snapshots/35370b0e28c7b144871c24d4b6596e4c51189286990e98b31bb6bb39ed51a3ae/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f64f52cd3e517b822dd8cae378a5000d223f0dd188d7c3e52deac8c31a8ebff4/contract';
import startContract from '../../snapshots/f64f52cd3e517b822dd8cae378a5000d223f0dd188d7c3e52deac8c31a8ebff4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'SupplierPayment',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('method', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('supplierInvoiceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('paidTotal', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'SupplierInvoice',
        column: col('paidTotal', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'SupplierPayment',
        index: 'SupplierPayment_supplierInvoiceId_idx_7f6ba885',
        columns: ['supplierInvoiceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SupplierPayment',
        index: 'SupplierPayment_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SupplierPayment',
        index: 'SupplierPayment_tenantId_supplierInvoiceId_idx_ed90e67e',
        columns: ['tenantId', 'supplierInvoiceId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SupplierPayment',
        foreignKey: {
          name: 'SupplierPayment_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SupplierPayment',
        foreignKey: {
          name: 'SupplierPayment_supplierInvoiceId_fkey',
          columns: ['supplierInvoiceId'],
          references: { schema: 'public', table: 'SupplierInvoice', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'SupplierPayment' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
