#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/02a82f1994702b55c06a1ec7a4cc38025a325ad28de3b02824adcf3c16c97038/contract';
import startContract from '../../snapshots/02a82f1994702b55c06a1ec7a4cc38025a325ad28de3b02824adcf3c16c97038/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/acc73824552ea1f63e199492704a211eed0ab4eda1e20010f64e722d70fddc19/contract';
import endContract from '../../snapshots/acc73824552ea1f63e199492704a211eed0ab4eda1e20010f64e722d70fddc19/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'ApuActivity',
        column: col('sourceExtras', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuChapter',
        column: col('parentCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
