#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4aa52ec341dac041485eced2368f79ec15ba7bc410829df62c08324734d0d739/contract';
import endContract from '../../snapshots/4aa52ec341dac041485eced2368f79ec15ba7bc410829df62c08324734d0d739/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/95c4b8718be63ed4b0691ef122307affee2344865c14cdf8110dc094c60aa5b0/contract';
import startContract from '../../snapshots/95c4b8718be63ed4b0691ef122307affee2344865c14cdf8110dc094c60aa5b0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'StaffInvite',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('roleId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('usedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'StaffInvite',
        constraint: 'StaffInvite_token_key',
        columns: ['token'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StaffInvite',
        index: 'StaffInvite_email_idx_46df9cad',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'StaffInvite',
        index: 'StaffInvite_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StaffInvite',
        foreignKey: {
          name: 'StaffInvite_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'StaffRole', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
