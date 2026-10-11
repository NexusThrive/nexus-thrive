#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/23b06a7ddc83c4726d6553b837b7b732ab230aa02bc4a6d536ec8719f4a5ec48/contract';
import startContract from '../../snapshots/23b06a7ddc83c4726d6553b837b7b732ab230aa02bc4a6d536ec8719f4a5ec48/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/390db12f061cf04fdfa355f9ec66c1e262cbe1756bc23119b3163cd5321c5011/contract';
import endContract from '../../snapshots/390db12f061cf04fdfa355f9ec66c1e262cbe1756bc23119b3163cd5321c5011/contract.json' with { type: 'json' };
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
        table: 'FieldLog',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', {
            notNull: true,
            default: lit('Diario Oficial de Obra'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('projectId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'FieldLogEntry',
        columns: [
          col('authorName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('authorRole', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entryDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('laborCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('logId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('photoUrls', 'text[]', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', {
            notNull: true,
            default: lit('ADVANCE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('weather', 'text', {
            notNull: true,
            default: lit('SUNNY'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'FieldLogEntry_photoUrls_elem_not_null_ad9c6091',
            'array_position("photoUrls", NULL) IS NULL',
          ),
          checkExpression(
            'FieldLogEntry_type_check_41da5313',
            "\"type\" IN ('ADVANCE', 'OBSERVATION', 'AUTHORIZATION', 'INCIDENT')",
          ),
          checkExpression(
            'FieldLogEntry_weather_check_f78e4aba',
            "\"weather\" IN ('SUNNY', 'CLOUDY', 'RAIN_LIGHT', 'RAIN_HEAVY')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'FieldLog',
        constraint: 'FieldLog_projectId_key',
        columns: ['projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FieldLog',
        index: 'FieldLog_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FieldLog',
        index: 'FieldLog_tenantId_projectId_idx_e88197e4',
        columns: ['tenantId', 'projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FieldLogEntry',
        index: 'FieldLogEntry_logId_idx_602c1cfa',
        columns: ['logId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FieldLogEntry',
        index: 'FieldLogEntry_tenantId_entryDate_idx_d9bd4790',
        columns: ['tenantId', 'entryDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FieldLogEntry',
        index: 'FieldLogEntry_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'FieldLog',
        foreignKey: {
          name: 'FieldLog_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'FieldLog',
        foreignKey: {
          name: 'FieldLog_projectId_fkey',
          columns: ['projectId'],
          references: { schema: 'public', table: 'Project', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'FieldLogEntry',
        foreignKey: {
          name: 'FieldLogEntry_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'FieldLogEntry',
        foreignKey: {
          name: 'FieldLogEntry_logId_fkey',
          columns: ['logId'],
          references: { schema: 'public', table: 'FieldLog', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
