#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0e2cdf9de1498e23c2426a80e6d107464e1b77ea51f8aa42a5daf74206c07922/contract';
import startContract from '../../snapshots/0e2cdf9de1498e23c2426a80e6d107464e1b77ea51f8aa42a5daf74206c07922/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/302a8abc1f598de2ed98979344c1899ede8dd2bdbcac47b87c032a55ae21c174/contract';
import endContract from '../../snapshots/302a8abc1f598de2ed98979344c1899ede8dd2bdbcac47b87c032a55ae21c174/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Party',
        column: col('region', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Party',
        column: col('taxResponsibility', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
