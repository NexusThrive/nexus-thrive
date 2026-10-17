#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3cb85e24576ac30fbaf328a36ce3ff144b6d5a9e84ca5c0490a11e9b0a32e95c/contract';
import endContract from '../../snapshots/3cb85e24576ac30fbaf328a36ce3ff144b6d5a9e84ca5c0490a11e9b0a32e95c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8be75ffc85a7020108206a5f06fd19614674399b48b6fcc1d261180d665fe619/contract';
import startContract from '../../snapshots/8be75ffc85a7020108206a5f06fd19614674399b48b6fcc1d261180d665fe619/contract.json' with { type: 'json' };
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
        table: 'StaffMember',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('clerkUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invitedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('joinedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('lastSeenAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('roleId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'StaffRole',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('permissions', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('system', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'StaffRole_permissions_elem_not_null_318e2952',
            'array_position("permissions", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'TenantContact',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('hours', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('preferredChannel', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('purpose', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('whatsapp', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('accountManagerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('accountStage', 'text', {
          notNull: true,
          default: lit('ACTIVE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'StaffMember',
        constraint: 'StaffMember_clerkUserId_key',
        columns: ['clerkUserId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'StaffMember',
        constraint: 'StaffMember_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'StaffRole',
        constraint: 'StaffRole_key_key',
        columns: ['key'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_accountStage_check_8f6f0190',
        expression: "\"accountStage\" IN ('ONBOARDING', 'ACTIVE', 'CANCELLED', 'ARCHIVED')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'StaffMember',
        index: 'StaffMember_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TenantContact',
        index: 'TenantContact_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'StaffMember',
        foreignKey: {
          name: 'StaffMember_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'StaffRole', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
