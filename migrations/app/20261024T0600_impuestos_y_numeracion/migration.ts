#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/ce8102383574e467af1bd700279b74f5c2e184c88398de66b05b7273b722cee0/contract';
import startContract from '../../snapshots/ce8102383574e467af1bd700279b74f5c2e184c88398de66b05b7273b722cee0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f64f52cd3e517b822dd8cae378a5000d223f0dd188d7c3e52deac8c31a8ebff4/contract';
import endContract from '../../snapshots/f64f52cd3e517b822dd8cae378a5000d223f0dd188d7c3e52deac8c31a8ebff4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'NumberingResolution',
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
          col('documentKind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nextNumber', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('prefix', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('rangeFrom', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rangeTo', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('resolutionNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('validFrom', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('validTo', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TaxRate',
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
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('minBase', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ratePct', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('validFrom', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('validTo', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('prefix', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('resolutionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('withholdingTotal', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('withholdings', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'NumberingResolution',
        index: 'NumberingResolution_tenantId_documentKind_idx_c74e69cb',
        columns: ['tenantId', 'documentKind'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'NumberingResolution',
        index: 'NumberingResolution_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TaxRate',
        index: 'TaxRate_tenantId_code_idx_84f464d7',
        columns: ['tenantId', 'code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TaxRate',
        index: 'TaxRate_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TaxRate',
        index: 'TaxRate_tenantId_kind_idx_1e76dd5c',
        columns: ['tenantId', 'kind'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'NumberingResolution',
        foreignKey: {
          name: 'NumberingResolution_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TaxRate',
        foreignKey: {
          name: 'TaxRate_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'NumberingResolution' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'TaxRate' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
