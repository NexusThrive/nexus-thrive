#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a9b88b713550292f7a53606a717fc3f12e1ba425706df226c51113aaf3443f67/contract';
import endContract from '../../snapshots/a9b88b713550292f7a53606a717fc3f12e1ba425706df226c51113aaf3443f67/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d4a32467582e5fd89e4b4995660b52ce94c7db188c63688668a231d31acd5d12/contract';
import startContract from '../../snapshots/d4a32467582e5fd89e4b4995660b52ce94c7db188c63688668a231d31acd5d12/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Party',
        column: col('contactEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Party',
        column: col('contactName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Party',
        column: col('contactPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
