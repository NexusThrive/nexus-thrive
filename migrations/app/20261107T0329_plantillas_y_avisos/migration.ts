#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7ca85a657075cbc98dd866cda4f1c89583287f6f9b9844cc562ad2d1d0247e00/contract';
import startContract from '../../snapshots/7ca85a657075cbc98dd866cda4f1c89583287f6f9b9844cc562ad2d1d0247e00/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/94d21b5a060af17494f5e25390e85b2cb3e5fc03b396d2d5cb7206425cf07c55/contract';
import endContract from '../../snapshots/94d21b5a060af17494f5e25390e85b2cb3e5fc03b396d2d5cb7206425cf07c55/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'MessageTemplate',
        columns: [
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('enabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('event', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('language', 'text', {
            notNull: true,
            default: lit('es'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('metaName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('metaStatus', 'text', {
            notNull: true,
            default: lit('NONE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'WhatsappNotice',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('event', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('messageId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('processedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('templateKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('variables', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('optOutAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'MessageTemplate',
        constraint: 'MessageTemplate_tenantId_key_key',
        columns: ['tenantId', 'key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'WhatsappNotice',
        constraint: 'WhatsappNotice_tenantId_event_sourceId_key',
        columns: ['tenantId', 'event', 'sourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MessageTemplate',
        index: 'MessageTemplate_tenantId_event_idx_a78823f0',
        columns: ['tenantId', 'event'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MessageTemplate',
        index: 'MessageTemplate_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WhatsappNotice',
        index: 'WhatsappNotice_tenantId_customerId_idx_302ad259',
        columns: ['tenantId', 'customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WhatsappNotice',
        index: 'WhatsappNotice_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WhatsappNotice',
        index: 'WhatsappNotice_tenantId_status_createdAt_idx_c3c853c4',
        columns: ['tenantId', 'status', 'createdAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MessageTemplate',
        foreignKey: {
          name: 'MessageTemplate_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WhatsappNotice',
        foreignKey: {
          name: 'WhatsappNotice_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'MessageTemplate' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'WhatsappNotice' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
