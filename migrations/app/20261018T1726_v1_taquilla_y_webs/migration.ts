#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/47c8b990d1bc508088a7d5b550b9db62cf5cc222ada84264356f77b0e869640a/contract';
import startContract from '../../snapshots/47c8b990d1bc508088a7d5b550b9db62cf5cc222ada84264356f77b0e869640a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/78cb411e53926df1cd9fa9e8caf90edb51601f66d99d9f5c4a7f96e720de2477/contract';
import endContract from '../../snapshots/78cb411e53926df1cd9fa9e8caf90edb51601f66d99d9f5c4a7f96e720de2477/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'WebsiteRequest',
        columns: [
          col('businessName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('colors', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contactEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contactName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contactPhone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('domain', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paidAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('paymentMethod', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentRef', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('priceCop', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('publishedUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('slogan', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('staffNotes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
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
        table: 'TicketSale',
        column: col('bookingId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebsiteRequest',
        index: 'WebsiteRequest_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebsiteRequest',
        index: 'WebsiteRequest_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
