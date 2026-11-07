#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/afa78939f472d4222044ba2206a3803b8c8f2bea89c88dcfcb8796b2ba5cb085/contract';
import startContract from '../../snapshots/afa78939f472d4222044ba2206a3803b8c8f2bea89c88dcfcb8796b2ba5cb085/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fca68f7fb259f2a3cb8e56480adfd48b98b5249c9c99dbaf1259d061448d158d/contract';
import endContract from '../../snapshots/fca68f7fb259f2a3cb8e56480adfd48b98b5249c9c99dbaf1259d061448d158d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Opportunity',
        columns: [
          col('closedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('estimatedValue', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('interest', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('leadId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('lostReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('nextAction', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('nextActionAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('orderId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stage', 'text', {
            notNull: true,
            default: lit('NEW'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
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
      this.addUnique({
        schema: 'public',
        table: 'Opportunity',
        constraint: 'Opportunity_tenantId_leadId_key',
        columns: ['tenantId', 'leadId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Opportunity',
        index: 'Opportunity_tenantId_customerId_idx_302ad259',
        columns: ['tenantId', 'customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Opportunity',
        index: 'Opportunity_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Opportunity',
        index: 'Opportunity_tenantId_status_stage_idx_824e523e',
        columns: ['tenantId', 'status', 'stage'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Opportunity',
        foreignKey: {
          name: 'Opportunity_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Opportunity' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
