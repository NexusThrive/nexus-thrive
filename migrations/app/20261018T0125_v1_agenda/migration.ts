#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/543e2fe289e43cd1e19e7ad37f540cc7e1d574149d465c69899ea5d261ec176f/contract';
import endContract from '../../snapshots/543e2fe289e43cd1e19e7ad37f540cc7e1d574149d465c69899ea5d261ec176f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/5782a74647fd9027352d758675a5c71ce110afcc5a3b31f1550672e1bf8a3a91/contract';
import startContract from '../../snapshots/5782a74647fd9027352d758675a5c71ce110afcc5a3b31f1550672e1bf8a3a91/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('kind', 'text', {
          notNull: true,
          default: lit('APPOINTMENT'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('partySize', 'int4', {
          notNull: true,
          default: lit(1),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('productId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('reminderSentAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('staffUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
