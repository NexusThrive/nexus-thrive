#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/95c4b8718be63ed4b0691ef122307affee2344865c14cdf8110dc094c60aa5b0/contract';
import endContract from '../../snapshots/95c4b8718be63ed4b0691ef122307affee2344865c14cdf8110dc094c60aa5b0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fc5396d5aae600c31df52c51b6bddd5b012544494515a65147cbfafad4f632c1/contract';
import startContract from '../../snapshots/fc5396d5aae600c31df52c51b6bddd5b012544494515a65147cbfafad4f632c1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Attendance',
        column: col('scanned', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'Attendance', column: 'customerId' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
