#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/985cb4f27cce6a5f8048ccb570044afcd497859e90820d6c6c64a4b4e9e9cd18/contract';
import endContract from '../../snapshots/985cb4f27cce6a5f8048ccb570044afcd497859e90820d6c6c64a4b4e9e9cd18/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ab7da12f6f749e6e7969c5c15132adb9038598e0fe4266d6700d84799c0b8e5a/contract';
import startContract from '../../snapshots/ab7da12f6f749e6e7969c5c15132adb9038598e0fe4266d6700d84799c0b8e5a/contract.json' with { type: 'json' };
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
        table: 'Booking',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('serviceName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('totalAmount', 'int8', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/int8@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Booking_status_check_7d2ee7b5',
            "\"status\" IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Project',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Project_status_check_371c4d12',
            "\"status\" IN ('DRAFT', 'BIDDING', 'APPROVED', 'IN_EXECUTION', 'COMPLETED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ProjectHeader',
        columns: [
          col('clientAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientBillingEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientCity', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientTaxDv', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientTaxId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientTaxName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('legalRepName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('projectId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('projectLeaderName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('projectLeaderProfessionalId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('projectType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('siteAccessNotes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('siteAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('siteCity', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('siteDepartment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('supervisorName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('technicalContact', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('technicalPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Project',
        constraint: 'Project_tenantId_code_key',
        columns: ['tenantId', 'code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProjectHeader',
        constraint: 'ProjectHeader_projectId_key',
        columns: ['projectId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Project',
        index: 'Project_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Project',
        index: 'Project_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Project',
        index: 'Project_tenantId_status_idx_d3d04256',
        columns: ['tenantId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ProjectHeader',
        index: 'ProjectHeader_projectId_idx_a96e4d92',
        columns: ['projectId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Project',
        foreignKey: {
          name: 'Project_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Project',
        foreignKey: {
          name: 'Project_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'Customer', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProjectHeader',
        foreignKey: {
          name: 'ProjectHeader_projectId_fkey',
          columns: ['projectId'],
          references: { schema: 'public', table: 'Project', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
