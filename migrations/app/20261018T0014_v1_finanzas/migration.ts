#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4d479615e0086909de7d497934e19f33bcc4486ef01df3b954278498796f6fba/contract';
import startContract from '../../snapshots/4d479615e0086909de7d497934e19f33bcc4486ef01df3b954278498796f6fba/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e1669d18d84d2e44337ff86c43b5a7d4fcba93f74b4f12aaeb47c31e7656d87f/contract';
import endContract from '../../snapshots/e1669d18d84d2e44337ff86c43b5a7d4fcba93f74b4f12aaeb47c31e7656d87f/contract.json' with { type: 'json' };
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
        table: 'Attachment',
        columns: [
          col('byteSize', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('data', 'bytea', { notNull: true, codecRef: { codecId: 'pg/bytea@1' } }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mimeType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sha256', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('uploadedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'CashBox',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fundAmount', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('responsibleUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'CashMovement',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('beneficiary', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expenseId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paymentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sessionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'CashMovement_kind_check_a2f7cbee',
            "\"kind\" IN ('OPENING', 'INCOME', 'EXPENSE', 'VOUCHER', 'REPLENISH', 'ADJUST')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'CashSession',
        columns: [
          col('boxId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('closedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('closedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('closingNotes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('countedAmount', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('difference', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('expectedAmount', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('openedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('openedById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('openingAmount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Invoice',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerDoc', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('dueDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('issueDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('number', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ISSUED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('total', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('voidReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Invoice_status_check_e10bd6e9',
            "\"status\" IN ('ISSUED', 'PAID', 'VOID')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'InvoiceLine',
        columns: [
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invoiceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('total', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('unitPrice', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Product',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('capacity', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('category', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('cost', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('durationDays', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('durationMinutes', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', {
            notNull: true,
            default: lit('PRODUCT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('minStock', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('sku', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stock', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('trackStock', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('unit', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Product_kind_check_63510ff3',
            "\"kind\" IN ('PRODUCT', 'SERVICE', 'PLAN', 'TICKET', 'TOUR')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'StockMovement',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Expense',
        column: col('cashSessionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Expense',
        column: col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Expense',
        column: col('paidFrom', 'text', {
          notNull: true,
          default: lit('BANK'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Expense',
        column: col('projectId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Expense',
        column: col('supplier', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Expense',
        column: col('voidReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Expense',
        column: col('voidedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('cashSessionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('invoiceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('receiptNumber', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('sourceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('sourceType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('voidReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('voidedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'Invoice',
        constraint: 'Invoice_tenantId_kind_number_key',
        columns: ['tenantId', 'kind', 'number'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Payment',
        constraint: 'Payment_tenantId_receiptNumber_key',
        columns: ['tenantId', 'receiptNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Attachment',
        index: 'Attachment_tenantId_kind_ownerId_idx_b6da39dc',
        columns: ['tenantId', 'kind', 'ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CashBox',
        index: 'CashBox_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CashMovement',
        index: 'CashMovement_sessionId_idx_29f415d4',
        columns: ['sessionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CashSession',
        index: 'CashSession_boxId_idx_63a016fa',
        columns: ['boxId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CashSession',
        index: 'CashSession_tenantId_boxId_idx_9abd5c49',
        columns: ['tenantId', 'boxId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Invoice',
        index: 'Invoice_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'InvoiceLine',
        index: 'InvoiceLine_invoiceId_idx_d5c4f70e',
        columns: ['invoiceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Product',
        index: 'Product_tenantId_kind_idx_1e76dd5c',
        columns: ['tenantId', 'kind'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StockMovement',
        index: 'StockMovement_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CashMovement',
        foreignKey: {
          name: 'CashMovement_sessionId_fkey',
          columns: ['sessionId'],
          references: { schema: 'public', table: 'CashSession', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CashSession',
        foreignKey: {
          name: 'CashSession_boxId_fkey',
          columns: ['boxId'],
          references: { schema: 'public', table: 'CashBox', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'InvoiceLine',
        foreignKey: {
          name: 'InvoiceLine_invoiceId_fkey',
          columns: ['invoiceId'],
          references: { schema: 'public', table: 'Invoice', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StockMovement',
        foreignKey: {
          name: 'StockMovement_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'Product', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
