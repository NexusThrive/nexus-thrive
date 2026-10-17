#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5c796da84a2812cda89958292183d686ab17b12ddac66c131b160f9cd9952792/contract';
import endContract from '../../snapshots/5c796da84a2812cda89958292183d686ab17b12ddac66c131b160f9cd9952792/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/acc73824552ea1f63e199492704a211eed0ab4eda1e20010f64e722d70fddc19/contract';
import startContract from '../../snapshots/acc73824552ea1f63e199492704a211eed0ab4eda1e20010f64e722d70fddc19/contract.json' with { type: 'json' };
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
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Quote',
        constraint: 'Quote_status_check_58e78406',
      }),
      this.createTable({
        schema: 'public',
        table: 'BudgetItemProgress',
        columns: [
          col('authorName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('budgetItemId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('cutoffDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('executedQuantity', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ProjectFollowUp',
        columns: [
          col('authorName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('projectId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quoteId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scheduledFor', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', {
            notNull: true,
            default: lit('NOTE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ProjectFollowUp_type_check_80a207bd',
            "\"type\" IN ('NOTE', 'CALL', 'EMAIL', 'MEETING', 'VISIT')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'FieldLogEntry',
        column: col('budgetItemId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'LookaheadTask',
        column: col('budgetItemId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Quote',
        column: col('budgetRevision', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Quote',
        column: col('decidedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Quote',
        column: col('decidedByName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Quote',
        column: col('decisionNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Quote',
        column: col('projectId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Quote',
        column: col('sentAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Quote',
        column: col('showApuDetail', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Quote',
        column: col('snapshot', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Quote',
        column: col('validUntil', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Quote',
        column: col('version', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'WeeklyCommitment',
        column: col('budgetItemId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Quote',
        constraint: 'Quote_status_check_27d93e38',
        expression: "\"status\" IN ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'SUPERSEDED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'Quote',
        constraint: 'Quote_projectId_version_key',
        columns: ['projectId', 'version'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetItemProgress',
        index: 'BudgetItemProgress_budgetItemId_cutoffDate_idx_c4d1637e',
        columns: ['budgetItemId', 'cutoffDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetItemProgress',
        index: 'BudgetItemProgress_budgetItemId_idx_39963a95',
        columns: ['budgetItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BudgetItemProgress',
        index: 'BudgetItemProgress_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FieldLogEntry',
        index: 'FieldLogEntry_budgetItemId_idx_39963a95',
        columns: ['budgetItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LookaheadTask',
        index: 'LookaheadTask_budgetItemId_idx_39963a95',
        columns: ['budgetItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProjectFollowUp',
        index: 'ProjectFollowUp_projectId_createdAt_idx_d2d6484f',
        columns: ['projectId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProjectFollowUp',
        index: 'ProjectFollowUp_projectId_idx_a96e4d92',
        columns: ['projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProjectFollowUp',
        index: 'ProjectFollowUp_quoteId_idx_a7628ce5',
        columns: ['quoteId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProjectFollowUp',
        index: 'ProjectFollowUp_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProjectFollowUp',
        index: 'ProjectFollowUp_tenantId_projectId_idx_e88197e4',
        columns: ['tenantId', 'projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Quote',
        index: 'Quote_projectId_idx_a96e4d92',
        columns: ['projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WeeklyCommitment',
        index: 'WeeklyCommitment_budgetItemId_idx_39963a95',
        columns: ['budgetItemId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetItemProgress',
        foreignKey: {
          name: 'BudgetItemProgress_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BudgetItemProgress',
        foreignKey: {
          name: 'BudgetItemProgress_budgetItemId_fkey',
          columns: ['budgetItemId'],
          references: { schema: 'public', table: 'BudgetItem', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'FieldLogEntry',
        foreignKey: {
          name: 'FieldLogEntry_budgetItemId_fkey',
          columns: ['budgetItemId'],
          references: { schema: 'public', table: 'BudgetItem', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LookaheadTask',
        foreignKey: {
          name: 'LookaheadTask_budgetItemId_fkey',
          columns: ['budgetItemId'],
          references: { schema: 'public', table: 'BudgetItem', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProjectFollowUp',
        foreignKey: {
          name: 'ProjectFollowUp_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProjectFollowUp',
        foreignKey: {
          name: 'ProjectFollowUp_projectId_fkey',
          columns: ['projectId'],
          references: { schema: 'public', table: 'Project', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProjectFollowUp',
        foreignKey: {
          name: 'ProjectFollowUp_quoteId_fkey',
          columns: ['quoteId'],
          references: { schema: 'public', table: 'Quote', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Quote',
        foreignKey: {
          name: 'Quote_projectId_fkey',
          columns: ['projectId'],
          references: { schema: 'public', table: 'Project', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WeeklyCommitment',
        foreignKey: {
          name: 'WeeklyCommitment_budgetItemId_fkey',
          columns: ['budgetItemId'],
          references: { schema: 'public', table: 'BudgetItem', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
