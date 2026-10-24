#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/71ace5dfb84fb9f5cb2047694abcf7ac3ff948d4a58421e95753e84700a01656/contract';
import startContract from '../../snapshots/71ace5dfb84fb9f5cb2047694abcf7ac3ff948d4a58421e95753e84700a01656/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a1e900ea93e9219b8a1d5b0e2dbb14409bfbb2e19e0d79bd37fb989b7ef1da45/contract';
import endContract from '../../snapshots/a1e900ea93e9219b8a1d5b0e2dbb14409bfbb2e19e0d79bd37fb989b7ef1da45/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ExternalConnection',
        columns: [
          col('config', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('credentialsEnc', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('credentialsKeyId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('environment', 'text', {
            notNull: true,
            default: lit('sandbox'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastCheckedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('lastError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DISCONNECTED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
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
        table: 'ProviderEvent',
        columns: [
          col('connectionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('externalId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('processedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rawBody', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ExternalConnection',
        constraint: 'ExternalConnection_tenantId_kind_provider_environment_key',
        columns: ['tenantId', 'kind', 'provider', 'environment'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProviderEvent',
        constraint: 'ProviderEvent_tenantId_provider_externalId_key',
        columns: ['tenantId', 'provider', 'externalId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ExternalConnection',
        index: 'ExternalConnection_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ExternalConnection',
        index: 'ExternalConnection_tenantId_kind_idx_1e76dd5c',
        columns: ['tenantId', 'kind'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProviderEvent',
        index: 'ProviderEvent_connectionId_idx_b3eeb6ac',
        columns: ['connectionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProviderEvent',
        index: 'ProviderEvent_processedAt_idx_e83f4a54',
        columns: ['processedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProviderEvent',
        index: 'ProviderEvent_tenantId_createdAt_idx_88162366',
        columns: ['tenantId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProviderEvent',
        index: 'ProviderEvent_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ExternalConnection',
        foreignKey: {
          name: 'ExternalConnection_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProviderEvent',
        foreignKey: {
          name: 'ProviderEvent_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProviderEvent',
        foreignKey: {
          name: 'ProviderEvent_connectionId_fkey',
          columns: ['connectionId'],
          references: { schema: 'public', table: 'ExternalConnection', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ExternalConnection' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'ProviderEvent' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
