#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3908437a901c6415b121b90f6a034d13b613bec8dcecbc396ff5a13bbc996e15/contract';
import startContract from '../../snapshots/3908437a901c6415b121b90f6a034d13b613bec8dcecbc396ff5a13bbc996e15/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ebbd95b7f553eb9a9e5fa1b80967ad2084691849a3c21418d11e4dd7b557b432/contract';
import endContract from '../../snapshots/ebbd95b7f553eb9a9e5fa1b80967ad2084691849a3c21418d11e4dd7b557b432/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PaymentMethodSetting',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('instructions', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', {
            notNull: true,
            default: lit('TRANSFER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
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
        table: 'PaymentMethodSetting',
        constraint: 'PaymentMethodSetting_tenantId_name_key',
        columns: ['tenantId', 'name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PaymentMethodSetting',
        index: 'PaymentMethodSetting_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PaymentMethodSetting',
        foreignKey: {
          name: 'PaymentMethodSetting_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PaymentMethodSetting' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
