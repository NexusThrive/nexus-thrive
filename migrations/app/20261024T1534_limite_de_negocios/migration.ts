#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/191a1245f44131a6d6cbd0710b3e6f55e60e6f2e206552beaa3f69290ba03007/contract';
import endContract from '../../snapshots/191a1245f44131a6d6cbd0710b3e6f55e60e6f2e206552beaa3f69290ba03007/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d1bd026b9421ab69b622ecbbaaf23191d4f3e77933b070407051f19f540595ba/contract';
import startContract from '../../snapshots/d1bd026b9421ab69b622ecbbaaf23191d4f3e77933b070407051f19f540595ba/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'AccountLimit',
        columns: [
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxOrganizations', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['email'])],
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'AccountLimit' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
