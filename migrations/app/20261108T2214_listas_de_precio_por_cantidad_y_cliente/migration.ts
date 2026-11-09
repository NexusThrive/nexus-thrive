#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/9ccd58adc7f56a676810c7e9f65af930aa7f6ba7c70dc54877c6968fdd3abcb1/contract';
import startContract from '../../snapshots/9ccd58adc7f56a676810c7e9f65af930aa7f6ba7c70dc54877c6968fdd3abcb1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d4a32467582e5fd89e4b4995660b52ce94c7db188c63688668a231d31acd5d12/contract';
import endContract from '../../snapshots/d4a32467582e5fd89e4b4995660b52ce94c7db188c63688668a231d31acd5d12/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PriceTier',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('minQty', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('price', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('priceListId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'Customer',
        column: col('priceListId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'CustomerGroup',
        column: col('priceListId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'PriceTier',
        constraint: 'PriceTier_priceListId_productId_minQty_key',
        columns: ['priceListId', 'productId', 'minQty'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PriceTier',
        index: 'PriceTier_priceListId_idx_43057e0f',
        columns: ['priceListId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PriceTier',
        index: 'PriceTier_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PriceTier',
        index: 'PriceTier_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PriceTier',
        foreignKey: {
          name: 'PriceTier_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PriceTier',
        foreignKey: {
          name: 'PriceTier_priceListId_fkey',
          columns: ['priceListId'],
          references: { schema: 'public', table: 'PriceList', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PriceTier',
        foreignKey: {
          name: 'PriceTier_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'Product', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PriceTier' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
