#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/390db12f061cf04fdfa355f9ec66c1e262cbe1756bc23119b3163cd5321c5011/contract';
import startContract from '../../snapshots/390db12f061cf04fdfa355f9ec66c1e262cbe1756bc23119b3163cd5321c5011/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/77c8ba7395a5ab33bb41159f8d3003dbd2bcaf220a24a16e2efaae30235dd4d8/contract';
import endContract from '../../snapshots/77c8ba7395a5ab33bb41159f8d3003dbd2bcaf220a24a16e2efaae30235dd4d8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'ProjectBudget',
        column: col('revision', 'int4', {
          notNull: true,
          default: lit(1),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
