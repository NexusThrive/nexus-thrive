#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/546dd5631604115982de3d6624bd201ec0a5535f1297145c7a2498c85574729c/contract';
import endContract from '../../snapshots/546dd5631604115982de3d6624bd201ec0a5535f1297145c7a2498c85574729c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/985cb4f27cce6a5f8048ccb570044afcd497859e90820d6c6c64a4b4e9e9cd18/contract';
import startContract from '../../snapshots/985cb4f27cce6a5f8048ccb570044afcd497859e90820d6c6c64a4b4e9e9cd18/contract.json' with { type: 'json' };
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
        table: 'BudgetChapter',
        columns: [
          col('budgetId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
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
        table: 'BudgetItem',
        columns: [
          col('chapterId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'int8', {
            notNull: true,
            default: lit('1000000'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('totalCostDirect', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('unit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitCostDirect', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'BudgetItemResource',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('itemId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('performance', 'int8', {
            notNull: true,
            default: lit('1000000'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('totalPrice', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitPrice', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'BudgetItemResource_type_check_13d76a3a',
            "\"type\" IN ('MATERIAL', 'LABOR', 'EQUIPMENT', 'TRANSPORT')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ProjectBudget',
        columns: [
          col('adminTotal', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('aiuAdminPct', 'int8', {
            notNull: true,
            default: lit('100000'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('aiuImprevPct', 'int8', {
            notNull: true,
            default: lit('50000'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('aiuUtilidadPct', 'int8', {
            notNull: true,
            default: lit('50000'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('directCostTotal', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('grandTotal', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('imprevTotal', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('isLocked', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('ivaUtilidadPct', 'int8', {
            notNull: true,
            default: lit('190000'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('ivaUtilidadTotal', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('projectId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('utilidadTotal', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BudgetChapter',
        constraint: 'BudgetChapter_budgetId_order_key',
        columns: ['budgetId', 'order'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BudgetItem',
        constraint: 'BudgetItem_chapterId_order_key',
        columns: ['chapterId', 'order'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProjectBudget',
        constraint: 'ProjectBudget_projectId_key',
        columns: ['projectId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProjectBudget',
        constraint: 'ProjectBudget_tenantId_code_key',
        columns: ['tenantId', 'code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetChapter',
        index: 'BudgetChapter_budgetId_idx_abbf614c',
        columns: ['budgetId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetChapter',
        index: 'BudgetChapter_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetItem',
        index: 'BudgetItem_chapterId_idx_411dd3d6',
        columns: ['chapterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetItem',
        index: 'BudgetItem_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetItemResource',
        index: 'BudgetItemResource_itemId_idx_41357140',
        columns: ['itemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetItemResource',
        index: 'BudgetItemResource_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProjectBudget',
        index: 'ProjectBudget_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetChapter',
        foreignKey: {
          name: 'BudgetChapter_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetChapter',
        foreignKey: {
          name: 'BudgetChapter_budgetId_fkey',
          columns: ['budgetId'],
          references: { schema: 'public', table: 'ProjectBudget', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetItem',
        foreignKey: {
          name: 'BudgetItem_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetItem',
        foreignKey: {
          name: 'BudgetItem_chapterId_fkey',
          columns: ['chapterId'],
          references: { schema: 'public', table: 'BudgetChapter', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetItemResource',
        foreignKey: {
          name: 'BudgetItemResource_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetItemResource',
        foreignKey: {
          name: 'BudgetItemResource_itemId_fkey',
          columns: ['itemId'],
          references: { schema: 'public', table: 'BudgetItem', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProjectBudget',
        foreignKey: {
          name: 'ProjectBudget_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProjectBudget',
        foreignKey: {
          name: 'ProjectBudget_projectId_fkey',
          columns: ['projectId'],
          references: { schema: 'public', table: 'Project', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
