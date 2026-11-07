#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/075110c693a9bbee2030000e222dc3a901cc14843336cbd786b6afd0284e7c07/contract';
import startContract from '../../snapshots/075110c693a9bbee2030000e222dc3a901cc14843336cbd786b6afd0284e7c07/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/0e2cdf9de1498e23c2426a80e6d107464e1b77ea51f8aa42a5daf74206c07922/contract';
import endContract from '../../snapshots/0e2cdf9de1498e23c2426a80e6d107464e1b77ea51f8aa42a5daf74206c07922/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Deliverable',
        columns: [
          col('clientComment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('decidedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('decidedByName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('projectId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reviewTokenExpiresAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('reviewTokenHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sentAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('taskId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Deliverable',
        constraint: 'Deliverable_reviewTokenHash_key',
        columns: ['reviewTokenHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Deliverable',
        index: 'Deliverable_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Deliverable',
        index: 'Deliverable_tenantId_projectId_idx_e88197e4',
        columns: ['tenantId', 'projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Deliverable',
        index: 'Deliverable_tenantId_status_idx_d3d04256',
        columns: ['tenantId', 'status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Deliverable',
        foreignKey: {
          name: 'Deliverable_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Deliverable' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
