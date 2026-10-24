#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/57532c555df6e2c38add9f15c1aaecfb523127a1ad3fae7aaa825876b940797b/contract';
import endContract from '../../snapshots/57532c555df6e2c38add9f15c1aaecfb523127a1ad3fae7aaa825876b940797b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a1e900ea93e9219b8a1d5b0e2dbb14409bfbb2e19e0d79bd37fb989b7ef1da45/contract';
import startContract from '../../snapshots/a1e900ea93e9219b8a1d5b0e2dbb14409bfbb2e19e0d79bd37fb989b7ef1da45/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Party',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('addressLine', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('checkDigit', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('countryCode', 'text', {
            notNull: true,
            default: lit('CO'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('documentNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('documentType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', {
            notNull: true,
            default: lit('PERSON'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('legalName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tradeName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PartyRole',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('partyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('partyId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'PartyRole',
        constraint: 'PartyRole_partyId_role_key',
        columns: ['partyId', 'role'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Customer',
        index: 'Customer_partyId_idx_e302b09d',
        columns: ['partyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Party',
        index: 'Party_tenantId_documentNumber_key_d762dd04',
        columns: ['tenantId', 'documentNumber'],
        extras: { where: '"documentNumber" IS NOT NULL', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Party',
        index: 'Party_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Party',
        index: 'Party_tenantId_legalName_idx_d26d9111',
        columns: ['tenantId', 'legalName'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PartyRole',
        index: 'PartyRole_partyId_idx_e302b09d',
        columns: ['partyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PartyRole',
        index: 'PartyRole_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PartyRole',
        index: 'PartyRole_tenantId_role_idx_c3ec5d48',
        columns: ['tenantId', 'role'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Party',
        foreignKey: {
          name: 'Party_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Customer',
        foreignKey: {
          name: 'Customer_partyId_fkey',
          columns: ['partyId'],
          references: { schema: 'public', table: 'Party', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PartyRole',
        foreignKey: {
          name: 'PartyRole_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PartyRole',
        foreignKey: {
          name: 'PartyRole_partyId_fkey',
          columns: ['partyId'],
          references: { schema: 'public', table: 'Party', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Party' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PartyRole' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
