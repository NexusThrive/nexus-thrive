#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4416dd35d6df9a2e3706cc8703bf36b34002c74bbc2bd8ffae3a4d204f694c67/contract';
import startContract from '../../snapshots/4416dd35d6df9a2e3706cc8703bf36b34002c74bbc2bd8ffae3a4d204f694c67/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/5102e126472fee6d7350ac798fd4bc06e65763a6cffc609a914d0462dd251bb9/contract';
import endContract from '../../snapshots/5102e126472fee6d7350ac798fd4bc06e65763a6cffc609a914d0462dd251bb9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PurchaseOrder',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('expectedDate', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('number', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subtotal', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('supplierPartyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('taxTotal', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('total', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('warehouseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PurchaseOrderLine',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('orderId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('receivedQuantity', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('taxRatePct', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('variantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SupplierInvoice',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('cufe', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('dueDate', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('issueDate', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('number', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('purchaseOrderId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('REGISTERED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subtotal', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('supplierPartyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('taxTotal', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('total', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PurchaseOrder',
        constraint: 'PurchaseOrder_tenantId_number_key',
        columns: ['tenantId', 'number'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'SupplierInvoice',
        constraint: 'SupplierInvoice_tenantId_supplierPartyId_number_key',
        columns: ['tenantId', 'supplierPartyId', 'number'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PurchaseOrder',
        index: 'PurchaseOrder_supplierPartyId_idx_65784de3',
        columns: ['supplierPartyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PurchaseOrder',
        index: 'PurchaseOrder_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PurchaseOrder',
        index: 'PurchaseOrder_tenantId_status_idx_d3d04256',
        columns: ['tenantId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PurchaseOrder',
        index: 'PurchaseOrder_warehouseId_idx_8ff93e70',
        columns: ['warehouseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PurchaseOrderLine',
        index: 'PurchaseOrderLine_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PurchaseOrderLine',
        index: 'PurchaseOrderLine_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PurchaseOrderLine',
        index: 'PurchaseOrderLine_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SupplierInvoice',
        index: 'SupplierInvoice_purchaseOrderId_idx_3e3a8c45',
        columns: ['purchaseOrderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SupplierInvoice',
        index: 'SupplierInvoice_supplierPartyId_idx_65784de3',
        columns: ['supplierPartyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SupplierInvoice',
        index: 'SupplierInvoice_tenantId_dueDate_idx_ab958bc0',
        columns: ['tenantId', 'dueDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SupplierInvoice',
        index: 'SupplierInvoice_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PurchaseOrder',
        foreignKey: {
          name: 'PurchaseOrder_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PurchaseOrder',
        foreignKey: {
          name: 'PurchaseOrder_supplierPartyId_fkey',
          columns: ['supplierPartyId'],
          references: { schema: 'public', table: 'Party', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PurchaseOrder',
        foreignKey: {
          name: 'PurchaseOrder_warehouseId_fkey',
          columns: ['warehouseId'],
          references: { schema: 'public', table: 'Warehouse', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PurchaseOrderLine',
        foreignKey: {
          name: 'PurchaseOrderLine_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PurchaseOrderLine',
        foreignKey: {
          name: 'PurchaseOrderLine_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'PurchaseOrder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PurchaseOrderLine',
        foreignKey: {
          name: 'PurchaseOrderLine_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'Product', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SupplierInvoice',
        foreignKey: {
          name: 'SupplierInvoice_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SupplierInvoice',
        foreignKey: {
          name: 'SupplierInvoice_supplierPartyId_fkey',
          columns: ['supplierPartyId'],
          references: { schema: 'public', table: 'Party', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SupplierInvoice',
        foreignKey: {
          name: 'SupplierInvoice_purchaseOrderId_fkey',
          columns: ['purchaseOrderId'],
          references: { schema: 'public', table: 'PurchaseOrder', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PurchaseOrder' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PurchaseOrderLine' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'SupplierInvoice' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
