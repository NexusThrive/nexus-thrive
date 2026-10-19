#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5782a74647fd9027352d758675a5c71ce110afcc5a3b31f1550672e1bf8a3a91/contract';
import endContract from '../../snapshots/5782a74647fd9027352d758675a5c71ce110afcc5a3b31f1550672e1bf8a3a91/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e1669d18d84d2e44337ff86c43b5a7d4fcba93f74b4f12aaeb47c31e7656d87f/contract';
import startContract from '../../snapshots/e1669d18d84d2e44337ff86c43b5a7d4fcba93f74b4f12aaeb47c31e7656d87f/contract.json' with { type: 'json' };
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
      this.dropCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_role_check_40dd20e3',
      }),
      this.createTable({
        schema: 'public',
        table: 'DismissedNotification',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TenantInvite',
        columns: [
          col('acceptedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invitedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('revokedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'TenantInvite_role_check_972a86d0',
            "\"role\" IN ('SUPERADMIN', 'OWNER', 'STAFF', 'ADMIN', 'RECEPTION', 'ADVISOR')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('birthDate', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('documentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('photoId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('profile', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('tags', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'PlanSetting',
        column: col('maxUsers', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('active', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('removedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('theme', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Customer',
        constraint: 'Customer_tags_elem_not_null_aecbe9e2',
        expression: 'array_position("tags", NULL) IS NULL',
      }),
      this.addUnique({
        schema: 'public',
        table: 'DismissedNotification',
        constraint: 'DismissedNotification_userId_key_key',
        columns: ['userId', 'key'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_role_check_972a86d0',
        expression: "\"role\" IN ('SUPERADMIN', 'OWNER', 'STAFF', 'ADMIN', 'RECEPTION', 'ADVISOR')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'TenantInvite',
        index: 'TenantInvite_email_idx_46df9cad',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TenantInvite',
        index: 'TenantInvite_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
