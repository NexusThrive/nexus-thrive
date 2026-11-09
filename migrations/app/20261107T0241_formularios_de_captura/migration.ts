#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2846fa93f5ee846dcf42dba8e60faefe63342403e0e16fc32b528daad89ae102/contract';
import endContract from '../../snapshots/2846fa93f5ee846dcf42dba8e60faefe63342403e0e16fc32b528daad89ae102/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ba2fe6ffbf659f919f1bdf4a03ec8906251bdb5d4e33598a63a6709455452fe2/contract';
import startContract from '../../snapshots/ba2fe6ffbf659f919f1bdf4a03ec8906251bdb5d4e33598a63a6709455452fe2/contract.json' with { type: 'json' };
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
        table: 'LeadForm',
        columns: [
          col('allowedOrigins', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('campaign', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('publicKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'LeadForm_allowedOrigins_elem_not_null_d963e802',
            'array_position("allowedOrigins", NULL) IS NULL',
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'LeadForm',
        constraint: 'LeadForm_publicKey_key',
        columns: ['publicKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadForm',
        index: 'LeadForm_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadForm',
        foreignKey: {
          name: 'LeadForm_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'LeadForm' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
