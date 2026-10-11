#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/23b06a7ddc83c4726d6553b837b7b732ab230aa02bc4a6d536ec8719f4a5ec48/contract';
import endContract from '../../snapshots/23b06a7ddc83c4726d6553b837b7b732ab230aa02bc4a6d536ec8719f4a5ec48/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/546dd5631604115982de3d6624bd201ec0a5535f1297145c7a2498c85574729c/contract';
import startContract from '../../snapshots/546dd5631604115982de3d6624bd201ec0a5535f1297145c7a2498c85574729c/contract.json' with { type: 'json' };
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
        table: 'LookaheadTask',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isRestricted', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('planId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('responsible', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('weekNumber', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ProjectPlan',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', {
            notNull: true,
            default: lit('Plan Operativo de Obra'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('projectId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('targetPpc', 'int4', {
            notNull: true,
            default: lit(85),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('windowStartDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'WeeklyCommitment',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('failureCause', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('failureNotes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('planId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('responsible', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('weekNumber', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('year', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'WeeklyCommitment_failureCause_check_8114adf5',
            "\"failureCause\" IN ('WEATHER', 'MATERIALS', 'LABOR', 'EQUIPMENT', 'DESIGN_CHANGE', 'PREVIOUS_WORK', 'OTHER')",
          ),
          checkExpression(
            'WeeklyCommitment_status_check_04ef721f',
            "\"status\" IN ('PENDING', 'COMPLETED', 'FAILED')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProjectPlan',
        constraint: 'ProjectPlan_projectId_key',
        columns: ['projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LookaheadTask',
        index: 'LookaheadTask_planId_idx_5b32079a',
        columns: ['planId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LookaheadTask',
        index: 'LookaheadTask_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LookaheadTask',
        index: 'LookaheadTask_tenantId_weekNumber_idx_bbf8add1',
        columns: ['tenantId', 'weekNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProjectPlan',
        index: 'ProjectPlan_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProjectPlan',
        index: 'ProjectPlan_tenantId_projectId_idx_e88197e4',
        columns: ['tenantId', 'projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WeeklyCommitment',
        index: 'WeeklyCommitment_planId_idx_5b32079a',
        columns: ['planId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WeeklyCommitment',
        index: 'WeeklyCommitment_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WeeklyCommitment',
        index: 'WeeklyCommitment_tenantId_weekNumber_year_idx_07f7a3c9',
        columns: ['tenantId', 'weekNumber', 'year'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LookaheadTask',
        foreignKey: {
          name: 'LookaheadTask_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LookaheadTask',
        foreignKey: {
          name: 'LookaheadTask_planId_fkey',
          columns: ['planId'],
          references: { schema: 'public', table: 'ProjectPlan', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProjectPlan',
        foreignKey: {
          name: 'ProjectPlan_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProjectPlan',
        foreignKey: {
          name: 'ProjectPlan_projectId_fkey',
          columns: ['projectId'],
          references: { schema: 'public', table: 'Project', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WeeklyCommitment',
        foreignKey: {
          name: 'WeeklyCommitment_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WeeklyCommitment',
        foreignKey: {
          name: 'WeeklyCommitment_planId_fkey',
          columns: ['planId'],
          references: { schema: 'public', table: 'ProjectPlan', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
