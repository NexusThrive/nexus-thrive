#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/45c5cc2af8378c4ffe212ee6f3afa72956c4ef4b87820b7be018d2c1a5e19c12/contract';
import endContract from '../../snapshots/45c5cc2af8378c4ffe212ee6f3afa72956c4ef4b87820b7be018d2c1a5e19c12/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/83f21004c2a7e93bc0f80dd61a41375c9949309808334ed8f281eca35699ea26/contract';
import startContract from '../../snapshots/83f21004c2a7e93bc0f80dd61a41375c9949309808334ed8f281eca35699ea26/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PresenceSnapshot',
        columns: [
          col('coverage', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('day', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phase', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pillars', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('score', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
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
        table: 'PresenceSnapshot',
        constraint: 'PresenceSnapshot_tenantId_day_key',
        columns: ['tenantId', 'day'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PresenceSnapshot',
        index: 'PresenceSnapshot_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PresenceSnapshot',
        foreignKey: {
          name: 'PresenceSnapshot_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PresenceSnapshot' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
