#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/97b51e19ef09af1e7fe107a52cbeb34ef38a00a1481aa56983a9572d4c72ba1b/contract';
import endContract from '../../snapshots/97b51e19ef09af1e7fe107a52cbeb34ef38a00a1481aa56983a9572d4c72ba1b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e637309ac408074848369fc3aec9650f621a188d2ce07176dbbdef00453130af/contract';
import startContract from '../../snapshots/e637309ac408074848369fc3aec9650f621a188d2ce07176dbbdef00453130af/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'StockLevel',
        columns: [
          col('avgCost', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('variantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('warehouseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Warehouse',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('code', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isDefault', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'StockMovement',
        column: col('balanceAfter', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'StockMovement',
        column: col('documentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'StockMovement',
        column: col('documentType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'StockMovement',
        column: col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'StockMovement',
        column: col('unitCost', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'StockMovement',
        column: col('variantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'StockMovement',
        column: col('warehouseId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('costingMethod', 'text', {
          notNull: true,
          default: lit('AVG'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'Warehouse',
        constraint: 'Warehouse_tenantId_name_key',
        columns: ['tenantId', 'name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockLevel',
        index: 'StockLevel_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockLevel',
        index: 'StockLevel_product_key_d6b3c447',
        columns: ['warehouseId', 'productId'],
        extras: { where: '"variantId" IS NULL', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockLevel',
        index: 'StockLevel_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockLevel',
        index: 'StockLevel_tenantId_productId_idx_b55a019b',
        columns: ['tenantId', 'productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockLevel',
        index: 'StockLevel_variantId_idx_e16bb45d',
        columns: ['variantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockLevel',
        index: 'StockLevel_variant_key_666fadbc',
        columns: ['warehouseId', 'productId', 'variantId'],
        extras: { where: '"variantId" IS NOT NULL', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockLevel',
        index: 'StockLevel_warehouseId_idx_8ff93e70',
        columns: ['warehouseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockMovement',
        index: 'StockMovement_documentType_documentId_idx_b8a84a62',
        columns: ['documentType', 'documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockMovement',
        index: 'StockMovement_warehouseId_idx_8ff93e70',
        columns: ['warehouseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Warehouse',
        index: 'Warehouse_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockLevel',
        foreignKey: {
          name: 'StockLevel_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockLevel',
        foreignKey: {
          name: 'StockLevel_warehouseId_fkey',
          columns: ['warehouseId'],
          references: { schema: 'public', table: 'Warehouse', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockLevel',
        foreignKey: {
          name: 'StockLevel_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'Product', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockLevel',
        foreignKey: {
          name: 'StockLevel_variantId_fkey',
          columns: ['variantId'],
          references: { schema: 'public', table: 'ProductVariant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Warehouse',
        foreignKey: {
          name: 'Warehouse_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockMovement',
        foreignKey: {
          name: 'StockMovement_warehouseId_fkey',
          columns: ['warehouseId'],
          references: { schema: 'public', table: 'Warehouse', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'StockLevel' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Warehouse' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
