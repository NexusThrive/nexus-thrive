#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/23a070c5985cb96091dd3bf742eb907b59cfbd7d0f3fc2ee153ba3d7f9405546/contract';
import startContract from '../../snapshots/23a070c5985cb96091dd3bf742eb907b59cfbd7d0f3fc2ee153ba3d7f9405546/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/76c9b229abe9b378da019eeb04959f533b5efdc7474d6b3bedfccd2f69e18bea/contract';
import endContract from '../../snapshots/76c9b229abe9b378da019eeb04959f533b5efdc7474d6b3bedfccd2f69e18bea/contract.json' with { type: 'json' };
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
        table: 'BenefitCode',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('durationDays', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxUses', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('plan', 'text', {
            notNull: true,
            default: lit('ELITE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('usedCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'BenefitCode_plan_check_f1a20b28',
            "\"plan\" IN ('ESSENTIAL', 'ELITE', 'SIGNATURE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'BenefitRedemption',
        columns: [
          col('clerkUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('codeId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('durationDays', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('endsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('plan', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BenefitCode',
        constraint: 'BenefitCode_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BenefitRedemption',
        constraint: 'BenefitRedemption_codeId_tenantId_key',
        columns: ['codeId', 'tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BenefitCode',
        index: 'BenefitCode_active_idx_8af4daed',
        columns: ['active'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BenefitRedemption',
        index: 'BenefitRedemption_codeId_idx_f2336e15',
        columns: ['codeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BenefitRedemption',
        index: 'BenefitRedemption_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BenefitRedemption',
        foreignKey: {
          name: 'BenefitRedemption_codeId_fkey',
          columns: ['codeId'],
          references: { schema: 'public', table: 'BenefitCode', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
