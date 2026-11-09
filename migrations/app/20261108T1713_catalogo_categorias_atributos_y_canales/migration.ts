#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3908437a901c6415b121b90f6a034d13b613bec8dcecbc396ff5a13bbc996e15/contract';
import endContract from '../../snapshots/3908437a901c6415b121b90f6a034d13b613bec8dcecbc396ff5a13bbc996e15/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d097893f3650380cb6adadcdd5fef74e0f737db9daa1ef0da782ee3d5487d1ad/contract';
import startContract from '../../snapshots/d097893f3650380cb6adadcdd5fef74e0f737db9daa1ef0da782ee3d5487d1ad/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ProductAttribute',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('display', 'text', {
            notNull: true,
            default: lit('SELECT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('variantMode', 'text', {
            notNull: true,
            default: lit('ALWAYS'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ProductAttributeLine',
        columns: [
          col('attributeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('valueIds', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ProductAttributeLine_valueIds_elem_not_null_7ec1b746',
            'array_position("valueIds", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ProductAttributeValue',
        columns: [
          col('attributeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('colorHex', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ProductCategory',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('parentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Product',
        column: col('categoryId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Product',
        column: col('customizable', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Product',
        column: col('favorite', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Product',
        column: col('internalNotes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Product',
        column: col('posEnabled', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Product',
        column: col('purchasable', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Product',
        column: col('sellable', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProductAttribute',
        constraint: 'ProductAttribute_tenantId_name_key',
        columns: ['tenantId', 'name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProductAttributeLine',
        constraint: 'ProductAttributeLine_productId_attributeId_key',
        columns: ['productId', 'attributeId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProductAttributeValue',
        constraint: 'ProductAttributeValue_attributeId_name_key',
        columns: ['attributeId', 'name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProductCategory',
        constraint: 'ProductCategory_tenantId_parentId_name_key',
        columns: ['tenantId', 'parentId', 'name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Product',
        index: 'Product_categoryId_idx_15c304f2',
        columns: ['categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Product',
        index: 'Product_tenantId_categoryId_idx_bf2f0555',
        columns: ['tenantId', 'categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductAttribute',
        index: 'ProductAttribute_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductAttributeLine',
        index: 'ProductAttributeLine_attributeId_idx_58ec5fae',
        columns: ['attributeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductAttributeLine',
        index: 'ProductAttributeLine_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductAttributeLine',
        index: 'ProductAttributeLine_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductAttributeValue',
        index: 'ProductAttributeValue_attributeId_idx_58ec5fae',
        columns: ['attributeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductAttributeValue',
        index: 'ProductAttributeValue_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductCategory',
        index: 'ProductCategory_parentId_idx_6a68f597',
        columns: ['parentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProductCategory',
        index: 'ProductCategory_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductAttribute',
        foreignKey: {
          name: 'ProductAttribute_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductAttributeLine',
        foreignKey: {
          name: 'ProductAttributeLine_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductAttributeLine',
        foreignKey: {
          name: 'ProductAttributeLine_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'Product', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductAttributeLine',
        foreignKey: {
          name: 'ProductAttributeLine_attributeId_fkey',
          columns: ['attributeId'],
          references: { schema: 'public', table: 'ProductAttribute', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductAttributeValue',
        foreignKey: {
          name: 'ProductAttributeValue_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductAttributeValue',
        foreignKey: {
          name: 'ProductAttributeValue_attributeId_fkey',
          columns: ['attributeId'],
          references: { schema: 'public', table: 'ProductAttribute', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductCategory',
        foreignKey: {
          name: 'ProductCategory_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProductCategory',
        foreignKey: {
          name: 'ProductCategory_parentId_fkey',
          columns: ['parentId'],
          references: { schema: 'public', table: 'ProductCategory', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Product',
        foreignKey: {
          name: 'Product_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'ProductCategory', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ProductAttribute' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ProductAttributeLine' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ProductAttributeValue' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ProductCategory' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
