#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7924e5f7554e644ee55d4df116e037b3d915ce4a48cb87cce6dfa264a92be4f2/contract';
import startContract from '../../snapshots/7924e5f7554e644ee55d4df116e037b3d915ce4a48cb87cce6dfa264a92be4f2/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/796e292566b480742876e769b42829e657742201c2e498c0d86f0fd86311058a/contract';
import endContract from '../../snapshots/796e292566b480742876e769b42829e657742201c2e498c0d86f0fd86311058a/contract.json' with { type: 'json' };
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
        table: 'ApuActivity',
        columns: [
          col('code', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ApuActivityComposition',
        columns: [
          col('activityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('consumption', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('itemId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('wastePercent', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ApuItem',
        columns: [
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('code', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitPrice', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ApuItem_category_check_cb615411',
            "\"category\" IN ('MATERIAL', 'MANO_DE_OBRA', 'EQUIPO', 'TRANSPORTE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Quote',
        columns: [
          col('adminPercent', 'numeric', {
            notNull: true,
            default: lit('15'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('directCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('imprevPercent', 'numeric', {
            notNull: true,
            default: lit('5'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('taxPercent', 'numeric', {
            notNull: true,
            default: lit('19'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('totalAmount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('utilPercent', 'numeric', {
            notNull: true,
            default: lit('10'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Quote_status_check_58e78406',
            "\"status\" IN ('DRAFT', 'SENT', 'APPROVED', 'REJECTED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'QuoteItem',
        columns: [
          col('activityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('apuSnapshot', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('quoteId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('totalCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('unit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ApuActivity',
        constraint: 'ApuActivity_tenantId_code_key',
        columns: ['tenantId', 'code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ApuActivityComposition',
        constraint: 'ApuActivityComposition_activityId_itemId_key',
        columns: ['activityId', 'itemId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ApuItem',
        constraint: 'ApuItem_tenantId_code_key',
        columns: ['tenantId', 'code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Quote',
        constraint: 'Quote_tenantId_code_key',
        columns: ['tenantId', 'code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuActivity',
        index: 'ApuActivity_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuActivityComposition',
        index: 'ApuActivityComposition_activityId_idx_bf2a659e',
        columns: ['activityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuActivityComposition',
        index: 'ApuActivityComposition_itemId_idx_41357140',
        columns: ['itemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuItem',
        index: 'ApuItem_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_tenantId_status_idx_d3d04256',
        columns: ['tenantId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'QuoteItem',
        index: 'QuoteItem_activityId_idx_bf2a659e',
        columns: ['activityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'QuoteItem',
        index: 'QuoteItem_quoteId_idx_a7628ce5',
        columns: ['quoteId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuActivity',
        foreignKey: {
          name: 'ApuActivity_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuActivityComposition',
        foreignKey: {
          name: 'ApuActivityComposition_activityId_fkey',
          columns: ['activityId'],
          references: { schema: 'public', table: 'ApuActivity', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuActivityComposition',
        foreignKey: {
          name: 'ApuActivityComposition_itemId_fkey',
          columns: ['itemId'],
          references: { schema: 'public', table: 'ApuItem', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuItem',
        foreignKey: {
          name: 'ApuItem_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Quote',
        foreignKey: {
          name: 'Quote_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Quote',
        foreignKey: {
          name: 'Quote_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'Customer', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'QuoteItem',
        foreignKey: {
          name: 'QuoteItem_quoteId_fkey',
          columns: ['quoteId'],
          references: { schema: 'public', table: 'Quote', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'QuoteItem',
        foreignKey: {
          name: 'QuoteItem_activityId_fkey',
          columns: ['activityId'],
          references: { schema: 'public', table: 'ApuActivity', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
