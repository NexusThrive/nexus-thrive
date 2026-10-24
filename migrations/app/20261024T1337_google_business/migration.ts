#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0f930250d7eff114cdcf04bfbb46515d468e5b033f320743078fdfd7707b4193/contract';
import endContract from '../../snapshots/0f930250d7eff114cdcf04bfbb46515d468e5b033f320743078fdfd7707b4193/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/99ab49758be2e61baf770a595e3535f809c1457099c0e87d4d60c465b92a9664/contract';
import startContract from '../../snapshots/99ab49758be2e61baf770a595e3535f809c1457099c0e87d4d60c465b92a9664/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'GoogleListing',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('placeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rating', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('ratingCount', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('syncedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('website', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'GoogleListing',
        constraint: 'GoogleListing_tenantId_key',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'GoogleListing',
        foreignKey: {
          name: 'GoogleListing_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'GoogleListing' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
