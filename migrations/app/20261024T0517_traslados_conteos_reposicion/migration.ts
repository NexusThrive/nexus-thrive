#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/872b04caffe0db3459ddbe2438c59e6abc6848fde503322e39e0235e9be67ee0/contract';
import startContract from '../../snapshots/872b04caffe0db3459ddbe2438c59e6abc6848fde503322e39e0235e9be67ee0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ce8102383574e467af1bd700279b74f5c2e184c88398de66b05b7273b722cee0/contract';
import endContract from '../../snapshots/ce8102383574e467af1bd700279b74f5c2e184c88398de66b05b7273b722cee0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'StockCount',
        columns: [
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('number', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('warehouseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'StockCountLine',
        columns: [
          col('adjustment', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('countId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('counted', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('expected', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'StockTransfer',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fromWarehouseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('number', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('toWarehouseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'StockTransferLine',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('transferId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('variantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Product',
        column: col('maxStock', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Product',
        column: col('reorderPoint', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'StockCount',
        constraint: 'StockCount_tenantId_number_key',
        columns: ['tenantId', 'number'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'StockTransfer',
        constraint: 'StockTransfer_tenantId_number_key',
        columns: ['tenantId', 'number'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockCount',
        index: 'StockCount_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockCount',
        index: 'StockCount_tenantId_status_idx_d3d04256',
        columns: ['tenantId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockCount',
        index: 'StockCount_warehouseId_idx_8ff93e70',
        columns: ['warehouseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockCountLine',
        index: 'StockCountLine_countId_idx_825076b6',
        columns: ['countId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockCountLine',
        index: 'StockCountLine_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockCountLine',
        index: 'StockCountLine_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockTransfer',
        index: 'StockTransfer_fromWarehouseId_idx_4006b0b1',
        columns: ['fromWarehouseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockTransfer',
        index: 'StockTransfer_tenantId_createdAt_idx_88162366',
        columns: ['tenantId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockTransfer',
        index: 'StockTransfer_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockTransfer',
        index: 'StockTransfer_toWarehouseId_idx_f640a978',
        columns: ['toWarehouseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockTransferLine',
        index: 'StockTransferLine_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockTransferLine',
        index: 'StockTransferLine_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockTransferLine',
        index: 'StockTransferLine_transferId_idx_2ecab561',
        columns: ['transferId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockCount',
        foreignKey: {
          name: 'StockCount_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockCount',
        foreignKey: {
          name: 'StockCount_warehouseId_fkey',
          columns: ['warehouseId'],
          references: { schema: 'public', table: 'Warehouse', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockCountLine',
        foreignKey: {
          name: 'StockCountLine_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockCountLine',
        foreignKey: {
          name: 'StockCountLine_countId_fkey',
          columns: ['countId'],
          references: { schema: 'public', table: 'StockCount', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockCountLine',
        foreignKey: {
          name: 'StockCountLine_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'Product', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockTransfer',
        foreignKey: {
          name: 'StockTransfer_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockTransfer',
        foreignKey: {
          name: 'StockTransfer_fromWarehouseId_fkey',
          columns: ['fromWarehouseId'],
          references: { schema: 'public', table: 'Warehouse', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockTransfer',
        foreignKey: {
          name: 'StockTransfer_toWarehouseId_fkey',
          columns: ['toWarehouseId'],
          references: { schema: 'public', table: 'Warehouse', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockTransferLine',
        foreignKey: {
          name: 'StockTransferLine_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockTransferLine',
        foreignKey: {
          name: 'StockTransferLine_transferId_fkey',
          columns: ['transferId'],
          references: { schema: 'public', table: 'StockTransfer', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockTransferLine',
        foreignKey: {
          name: 'StockTransferLine_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'Product', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'StockCount' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'StockCountLine' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'StockTransfer' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'StockTransferLine' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
