#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/138a345014a8fb658a06e23a7bb305a6d650968ed2f1564ca3dc4c909f7177af/contract';
import startContract from '../../snapshots/138a345014a8fb658a06e23a7bb305a6d650968ed2f1564ca3dc4c909f7177af/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ba2fe6ffbf659f919f1bdf4a03ec8906251bdb5d4e33598a63a6709455452fe2/contract';
import endContract from '../../snapshots/ba2fe6ffbf659f919f1bdf4a03ec8906251bdb5d4e33598a63a6709455452fe2/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'SalesQuote',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('decidedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('decidedByName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('decisionNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('depositPct', 'numeric', {
            notNull: true,
            default: lit('50'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('number', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sentAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subtotal', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('taxTotal', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('total', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('validUntil', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SalesQuoteLine',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quoteId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('taxRatePct', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitPrice', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'StoreOrder',
        column: col('quoteId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'SalesQuote',
        constraint: 'SalesQuote_tenantId_number_key',
        columns: ['tenantId', 'number'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SalesQuote',
        index: 'SalesQuote_tenantId_customerId_idx_302ad259',
        columns: ['tenantId', 'customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SalesQuote',
        index: 'SalesQuote_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SalesQuote',
        index: 'SalesQuote_tenantId_status_idx_d3d04256',
        columns: ['tenantId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SalesQuoteLine',
        index: 'SalesQuoteLine_quoteId_idx_a7628ce5',
        columns: ['quoteId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SalesQuoteLine',
        index: 'SalesQuoteLine_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SalesQuote',
        foreignKey: {
          name: 'SalesQuote_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SalesQuoteLine',
        foreignKey: {
          name: 'SalesQuoteLine_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SalesQuoteLine',
        foreignKey: {
          name: 'SalesQuoteLine_quoteId_fkey',
          columns: ['quoteId'],
          references: { schema: 'public', table: 'SalesQuote', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'SalesQuote' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'SalesQuoteLine' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
