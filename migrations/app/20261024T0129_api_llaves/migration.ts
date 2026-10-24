#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/e89c55b53d36de86c2915169334dfeec7940e7cc68d368f828b417865c3951b7/contract';
import endContract from '../../snapshots/e89c55b53d36de86c2915169334dfeec7940e7cc68d368f828b417865c3951b7/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f2f656b7d59b51bb494e9ff10a2877f6d9edd97e616e457645f43f171ee40ea3/contract';
import startContract from '../../snapshots/f2f656b7d59b51bb494e9ff10a2877f6d9edd97e616e457645f43f171ee40ea3/contract.json' with { type: 'json' };
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
        table: 'ApiKey',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdByRole', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('environment', 'text', {
            notNull: true,
            default: lit('live'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ipAllowlist', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('keyHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('keyPrefix', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastUsedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('revokedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('scopes', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'ApiKey_ipAllowlist_elem_not_null_5be915d1',
            'array_position("ipAllowlist", NULL) IS NULL',
          ),
          checkExpression(
            'ApiKey_scopes_elem_not_null_de6fcc8e',
            'array_position("scopes", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ApiRequestLog',
        columns: [
          col('apiKeyId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('durationMs', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idempotencyKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ip', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('method', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('operationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('path', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('requestId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'IdempotencyRecord',
        columns: [
          col('apiKeyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('requestHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('responseBody', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('responseStatus', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ApiKey',
        constraint: 'ApiKey_keyHash_key',
        columns: ['keyHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'IdempotencyRecord',
        constraint: 'IdempotencyRecord_apiKeyId_key_key',
        columns: ['apiKeyId', 'key'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApiKey',
        index: 'ApiKey_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApiRequestLog',
        index: 'ApiRequestLog_apiKeyId_createdAt_idx_a8ac7019',
        columns: ['apiKeyId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApiRequestLog',
        index: 'ApiRequestLog_apiKeyId_idx_7bbbe9ea',
        columns: ['apiKeyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApiRequestLog',
        index: 'ApiRequestLog_tenantId_createdAt_idx_88162366',
        columns: ['tenantId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApiRequestLog',
        index: 'ApiRequestLog_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'IdempotencyRecord',
        index: 'IdempotencyRecord_apiKeyId_idx_7bbbe9ea',
        columns: ['apiKeyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'IdempotencyRecord',
        index: 'IdempotencyRecord_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'IdempotencyRecord',
        index: 'IdempotencyRecord_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApiKey',
        foreignKey: {
          name: 'ApiKey_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApiRequestLog',
        foreignKey: {
          name: 'ApiRequestLog_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApiRequestLog',
        foreignKey: {
          name: 'ApiRequestLog_apiKeyId_fkey',
          columns: ['apiKeyId'],
          references: { schema: 'public', table: 'ApiKey', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'IdempotencyRecord',
        foreignKey: {
          name: 'IdempotencyRecord_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'IdempotencyRecord',
        foreignKey: {
          name: 'IdempotencyRecord_apiKeyId_fkey',
          columns: ['apiKeyId'],
          references: { schema: 'public', table: 'ApiKey', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ApiKey' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ApiRequestLog' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'IdempotencyRecord' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
