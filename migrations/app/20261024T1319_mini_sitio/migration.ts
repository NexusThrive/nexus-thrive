#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/45c5cc2af8378c4ffe212ee6f3afa72956c4ef4b87820b7be018d2c1a5e19c12/contract';
import startContract from '../../snapshots/45c5cc2af8378c4ffe212ee6f3afa72956c4ef4b87820b7be018d2c1a5e19c12/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/cd0d051def5c53d32c876068f9b79bbfde10d2ca77e6d6f763a4df5c76f05af3/contract';
import endContract from '../../snapshots/cd0d051def5c53d32c876068f9b79bbfde10d2ca77e6d6f763a4df5c76f05af3/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'SiteConfig',
        columns: [
          col('about', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('accent', 'text', {
            notNull: true,
            default: lit('#D4AF37'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('enabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('heroSubtitle', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('heroTitle', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('showCatalog', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('showMap', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('siteSlug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('template', 'text', {
            notNull: true,
            default: lit('clasica'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'SiteConfig',
        constraint: 'SiteConfig_tenantId_key',
        columns: ['tenantId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'SiteConfig',
        constraint: 'SiteConfig_siteSlug_key',
        columns: ['siteSlug'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SiteConfig',
        foreignKey: {
          name: 'SiteConfig_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'SiteConfig' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
