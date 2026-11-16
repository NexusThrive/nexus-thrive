#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/a9b88b713550292f7a53606a717fc3f12e1ba425706df226c51113aaf3443f67/contract';
import startContract from '../../snapshots/a9b88b713550292f7a53606a717fc3f12e1ba425706df226c51113aaf3443f67/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/aa3535fad47d3ed4395c026ce67d9fbaaecae4118e20153ab85d2fec3036fdb4/contract';
import endContract from '../../snapshots/aa3535fad47d3ed4395c026ce67d9fbaaecae4118e20153ab85d2fec3036fdb4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('activatedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('managedProvisioning', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('ownerEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('provisioningKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('provisioningRequestHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'TenantInvite',
        column: col('deliveredAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'TenantInvite',
        column: col('deliveryAttempts', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'TenantInvite',
        column: col('deliveryError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'TenantInvite',
        column: col('deliveryLeaseToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'TenantInvite',
        column: col('deliveryLeaseUntil', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'TenantInvite',
        column: col('deliveryNextAttemptAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'TenantInvite',
        column: col('deliveryProviderId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'TenantInvite',
        column: col('deliveryStatus', 'text', {
          notNull: true,
          default: lit('NONE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_provisioningKey_key',
        columns: ['provisioningKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TenantInvite',
        index: 'tenant_invite_pending_ea0c48f6',
        columns: ['tenantId', 'email'],
        extras: { where: '"acceptedAt" IS NULL AND "revokedAt" IS NULL', unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
