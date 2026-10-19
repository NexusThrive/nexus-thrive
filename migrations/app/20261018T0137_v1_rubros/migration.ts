#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/47c8b990d1bc508088a7d5b550b9db62cf5cc222ada84264356f77b0e869640a/contract';
import endContract from '../../snapshots/47c8b990d1bc508088a7d5b550b9db62cf5cc222ada84264356f77b0e869640a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/543e2fe289e43cd1e19e7ad37f540cc7e1d574149d465c69899ea5d261ec176f/contract';
import startContract from '../../snapshots/543e2fe289e43cd1e19e7ad37f540cc7e1d574149d465c69899ea5d261ec176f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_vertical_check_739779ca',
      }),
      this.createTable({
        schema: 'public',
        table: 'Attendance',
        columns: [
          col('allowed', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('membershipId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('method', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Departure',
        columns: [
          col('capacity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('date', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('guide', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('meetingPoint', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('productId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('SCHEDULED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('time', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TicketSale',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('groupName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', {
            notNull: true,
            default: lit('TAQUILLA'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('lines', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('number', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('paymentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('slot', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PAID'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('total', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('visitDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('visitors', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TourBooking',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('commissionPct', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('departureId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('passengers', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('seats', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sellerUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('RESERVED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('total', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('accessCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('nfcUid', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('projectId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Membership',
        column: col('cancelReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Membership',
        column: col('cancelledAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Membership',
        column: col('frozenFrom', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Membership',
        column: col('frozenUntil', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Membership',
        column: col('productId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('settings', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_vertical_check_7ca0b77e',
        expression:
          "\"vertical\" IN ('gym', 'tourism_agency', 'hospitality', 'construction', 'carpentry', 'restaurant', 'retail', 'beauty', 'healthcare', 'mechanic', 'education', 'real_estate', 'hardware_store', 'nautical_transport', 'tour_guides', 'events', 'museum')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'TicketSale',
        constraint: 'TicketSale_tenantId_number_key',
        columns: ['tenantId', 'number'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'TourBooking',
        constraint: 'TourBooking_tenantId_code_key',
        columns: ['tenantId', 'code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Attendance',
        index: 'Attendance_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Attendance',
        index: 'Attendance_tenantId_at_idx_21a9eddd',
        columns: ['tenantId', 'at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Departure',
        index: 'Departure_tenantId_date_idx_3ef944c7',
        columns: ['tenantId', 'date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TicketSale',
        index: 'TicketSale_tenantId_visitDate_idx_d723b863',
        columns: ['tenantId', 'visitDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TourBooking',
        index: 'TourBooking_departureId_idx_24d39b35',
        columns: ['departureId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
