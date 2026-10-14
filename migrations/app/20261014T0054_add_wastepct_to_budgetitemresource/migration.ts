#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/55ff59f96a0459588e0d594f1756ab42e89b303f46891c84963125389c1400f2/contract';
import startContract from '../../snapshots/55ff59f96a0459588e0d594f1756ab42e89b303f46891c84963125389c1400f2/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d4509c335e914a2bda4c5a19954c47cc84007ba0fd294a7ca4f5a2d05e71d931/contract';
import endContract from '../../snapshots/d4509c335e914a2bda4c5a19954c47cc84007ba0fd294a7ca4f5a2d05e71d931/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'BudgetItemResource',
        column: col('wastePct', 'int8', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/int8@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
