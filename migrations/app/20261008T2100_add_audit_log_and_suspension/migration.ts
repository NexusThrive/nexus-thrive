#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/796e292566b480742876e769b42829e657742201c2e498c0d86f0fd86311058a/contract';
import startContract from '../../snapshots/796e292566b480742876e769b42829e657742201c2e498c0d86f0fd86311058a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fdb9466b51a0aca5f38161535d1ec7c1cb57e791de0e41d9c27bbb4b00ba3855/contract';
import endContract from '../../snapshots/fdb9466b51a0aca5f38161535d1ec7c1cb57e791de0e41d9c27bbb4b00ba3855/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'AuditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('actorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ipAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('targetTenantId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('targetTenantName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userAgent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('suspendedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('suspendedReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_actorId_idx_a58f6b4b',
        columns: ['actorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_targetTenantId_idx_9ecf2d83',
        columns: ['targetTenantId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
