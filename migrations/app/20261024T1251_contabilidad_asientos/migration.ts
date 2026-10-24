#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/83f21004c2a7e93bc0f80dd61a41375c9949309808334ed8f281eca35699ea26/contract';
import endContract from '../../snapshots/83f21004c2a7e93bc0f80dd61a41375c9949309808334ed8f281eca35699ea26/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e327c70d8bf1838fec907ec41a06d0064552fddb7ffd2adddaae24705bfcb13a/contract';
import startContract from '../../snapshots/e327c70d8bf1838fec907ec41a06d0064552fddb7ffd2adddaae24705bfcb13a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'JournalEntry',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('date', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('event', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('number', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reversalOfId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'JournalLine',
        columns: [
          col('accountCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('costCenterId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('credit', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('debit', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('entryId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('label', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('partyId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('accountingEnabled', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'JournalEntry',
        constraint: 'JournalEntry_tenantId_number_key',
        columns: ['tenantId', 'number'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'JournalEntry',
        index: 'JournalEntry_tenantId_date_idx_3ef944c7',
        columns: ['tenantId', 'date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'JournalEntry',
        index: 'JournalEntry_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'JournalEntry',
        index: 'JournalEntry_tenantId_sourceType_sourceId_idx_7db9b1c3',
        columns: ['tenantId', 'sourceType', 'sourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'JournalLine',
        index: 'JournalLine_entryId_idx_8b42d1db',
        columns: ['entryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'JournalLine',
        index: 'JournalLine_tenantId_accountCode_idx_d8899099',
        columns: ['tenantId', 'accountCode'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'JournalLine',
        index: 'JournalLine_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'JournalEntry',
        foreignKey: {
          name: 'JournalEntry_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'JournalLine',
        foreignKey: {
          name: 'JournalLine_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'JournalLine',
        foreignKey: {
          name: 'JournalLine_entryId_fkey',
          columns: ['entryId'],
          references: { schema: 'public', table: 'JournalEntry', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'JournalEntry' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'JournalLine' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
