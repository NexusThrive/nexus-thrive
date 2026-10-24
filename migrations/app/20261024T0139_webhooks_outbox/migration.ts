#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/cc24854806689dd427b75f8507abc0584c00f554c22fd521a60dc6d9fb3354a7/contract';
import endContract from '../../snapshots/cc24854806689dd427b75f8507abc0584c00f554c22fd521a60dc6d9fb3354a7/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e89c55b53d36de86c2915169334dfeec7940e7cc68d368f828b417865c3951b7/contract';
import startContract from '../../snapshots/e89c55b53d36de86c2915169334dfeec7940e7cc68d368f828b417865c3951b7/contract.json' with { type: 'json' };
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
        table: 'OutboxEvent',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('payload', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('processedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('resourceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resourceType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('version', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'WebhookDelivery',
        columns: [
          col('attempt', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('deliveredAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('durationMs', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('endpointId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nextAttemptAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('responseExcerpt', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('responseStatus', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'WebhookEndpoint',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('consecutiveFailures', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('disabledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('disabledReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eventTypes', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('previousSecretEnc', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('previousSecretUntil', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('secretEnc', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'WebhookEndpoint_eventTypes_elem_not_null_9d7fdd2b',
            'array_position("eventTypes", NULL) IS NULL',
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'WebhookDelivery',
        constraint: 'WebhookDelivery_endpointId_eventId_key',
        columns: ['endpointId', 'eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OutboxEvent',
        index: 'OutboxEvent_processedAt_createdAt_idx_cbbcce26',
        columns: ['processedAt', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OutboxEvent',
        index: 'OutboxEvent_tenantId_createdAt_idx_88162366',
        columns: ['tenantId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OutboxEvent',
        index: 'OutboxEvent_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebhookDelivery',
        index: 'WebhookDelivery_endpointId_createdAt_idx_6af13a6b',
        columns: ['endpointId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebhookDelivery',
        index: 'WebhookDelivery_endpointId_idx_48273c15',
        columns: ['endpointId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebhookDelivery',
        index: 'WebhookDelivery_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebhookDelivery',
        index: 'WebhookDelivery_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebhookDelivery',
        index: 'WebhookDelivery_tenantId_status_nextAttemptAt_idx_925e31da',
        columns: ['tenantId', 'status', 'nextAttemptAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebhookEndpoint',
        index: 'WebhookEndpoint_tenantId_active_idx_35aa10e5',
        columns: ['tenantId', 'active'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebhookEndpoint',
        index: 'WebhookEndpoint_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OutboxEvent',
        foreignKey: {
          name: 'OutboxEvent_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WebhookDelivery',
        foreignKey: {
          name: 'WebhookDelivery_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WebhookDelivery',
        foreignKey: {
          name: 'WebhookDelivery_endpointId_fkey',
          columns: ['endpointId'],
          references: { schema: 'public', table: 'WebhookEndpoint', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WebhookDelivery',
        foreignKey: {
          name: 'WebhookDelivery_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'OutboxEvent', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WebhookEndpoint',
        foreignKey: {
          name: 'WebhookEndpoint_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'OutboxEvent' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'WebhookDelivery' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'WebhookEndpoint' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
