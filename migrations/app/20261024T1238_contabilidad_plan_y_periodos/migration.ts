#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/dd56633c277604483ea709e355b291eeda810165528f2c8e4d3355e6fa47d398/contract';
import startContract from '../../snapshots/dd56633c277604483ea709e355b291eeda810165528f2c8e4d3355e6fa47d398/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e327c70d8bf1838fec907ec41a06d0064552fddb7ffd2adddaae24705bfcb13a/contract';
import endContract from '../../snapshots/e327c70d8bf1838fec907ec41a06d0064552fddb7ffd2adddaae24705bfcb13a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Account',
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
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nature', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('postable', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AccountingPeriod',
        columns: [
          col('closedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('closedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('month', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reopenedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('year', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AccountingRule',
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
          col('event', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lines', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'CostCenter',
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
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', {
            notNull: true,
            default: lit('CENTER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Account',
        constraint: 'Account_tenantId_code_key',
        columns: ['tenantId', 'code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AccountingPeriod',
        constraint: 'AccountingPeriod_tenantId_year_month_key',
        columns: ['tenantId', 'year', 'month'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AccountingRule',
        constraint: 'AccountingRule_tenantId_event_key',
        columns: ['tenantId', 'event'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'CostCenter',
        constraint: 'CostCenter_tenantId_code_key',
        columns: ['tenantId', 'code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Account',
        index: 'Account_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AccountingPeriod',
        index: 'AccountingPeriod_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AccountingRule',
        index: 'AccountingRule_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CostCenter',
        index: 'CostCenter_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Account',
        foreignKey: {
          name: 'Account_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AccountingPeriod',
        foreignKey: {
          name: 'AccountingPeriod_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AccountingRule',
        foreignKey: {
          name: 'AccountingRule_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CostCenter',
        foreignKey: {
          name: 'CostCenter_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Account' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'AccountingPeriod' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'AccountingRule' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'CostCenter' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
