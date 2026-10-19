#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/23a070c5985cb96091dd3bf742eb907b59cfbd7d0f3fc2ee153ba3d7f9405546/contract';
import endContract from '../../snapshots/23a070c5985cb96091dd3bf742eb907b59cfbd7d0f3fc2ee153ba3d7f9405546/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/422e6cab8258d84d99cbb4b2b30d5b9c4009204497eae06972736c0930b73a0c/contract';
import startContract from '../../snapshots/422e6cab8258d84d99cbb4b2b30d5b9c4009204497eae06972736c0930b73a0c/contract.json' with { type: 'json' };
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
      this.dropTable({ schema: 'public', table: 'WebsiteRequest' }),
      this.createTable({
        schema: 'public',
        table: 'PresenceRequest',
        columns: [
          col('businessName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('colors', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contactEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contactName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contactPhone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('domain', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paidAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('paymentMethod', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentRef', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('priceCop', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('publishedUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('services', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
          col('slogan', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('staffNotes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'PresenceRequest_services_elem_not_null_4d2c6c0f',
            'array_position("services", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'PresenceScan',
        columns: [
          col('breakdown', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('score', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('source', 'text', {
            notNull: true,
            default: lit('MANUAL'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('state', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('website', 'json', { codecRef: { codecId: 'pg/json@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PresenceRequest',
        index: 'PresenceRequest_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PresenceRequest',
        index: 'PresenceRequest_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PresenceScan',
        index: 'PresenceScan_tenantId_createdAt_idx_88162366',
        columns: ['tenantId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PresenceScan',
        index: 'PresenceScan_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PresenceScan',
        foreignKey: {
          name: 'PresenceScan_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
