#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/aee0c80868c057de87d7b5ffb15ae45aa2025a64c7424922c3a0be2e0847849d/contract';
import startContract from '../../snapshots/aee0c80868c057de87d7b5ffb15ae45aa2025a64c7424922c3a0be2e0847849d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d097893f3650380cb6adadcdd5fef74e0f737db9daa1ef0da782ee3d5487d1ad/contract';
import endContract from '../../snapshots/d097893f3650380cb6adadcdd5fef74e0f737db9daa1ef0da782ee3d5487d1ad/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'CustomerGroup',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('icon', 'text', {
            notNull: true,
            default: lit('users'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'CustomerGroupMember',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('groupId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SavedSearch',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isDefault', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('params', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('section', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'CustomerGroup',
        constraint: 'CustomerGroup_tenantId_name_key',
        columns: ['tenantId', 'name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'CustomerGroupMember',
        constraint: 'CustomerGroupMember_groupId_customerId_key',
        columns: ['groupId', 'customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerGroup',
        index: 'CustomerGroup_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerGroupMember',
        index: 'CustomerGroupMember_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerGroupMember',
        index: 'CustomerGroupMember_groupId_idx_e2fb5578',
        columns: ['groupId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerGroupMember',
        index: 'CustomerGroupMember_tenantId_customerId_idx_302ad259',
        columns: ['tenantId', 'customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CustomerGroupMember',
        index: 'CustomerGroupMember_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SavedSearch',
        index: 'SavedSearch_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SavedSearch',
        index: 'SavedSearch_tenantId_userId_section_idx_61107353',
        columns: ['tenantId', 'userId', 'section'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerGroup',
        foreignKey: {
          name: 'CustomerGroup_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerGroupMember',
        foreignKey: {
          name: 'CustomerGroupMember_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerGroupMember',
        foreignKey: {
          name: 'CustomerGroupMember_groupId_fkey',
          columns: ['groupId'],
          references: { schema: 'public', table: 'CustomerGroup', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CustomerGroupMember',
        foreignKey: {
          name: 'CustomerGroupMember_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'Customer', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SavedSearch',
        foreignKey: {
          name: 'SavedSearch_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'CustomerGroup' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'CustomerGroupMember' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'SavedSearch' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
