#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/55ff59f96a0459588e0d594f1756ab42e89b303f46891c84963125389c1400f2/contract';
import endContract from '../../snapshots/55ff59f96a0459588e0d594f1756ab42e89b303f46891c84963125389c1400f2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b100b157f7297f6043043d056fafc20140e29a737cec0d416fb9862d89abf4e7/contract';
import startContract from '../../snapshots/b100b157f7297f6043043d056fafc20140e29a737cec0d416fb9862d89abf4e7/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'BudgetItem',
        column: col('sourceActivityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BudgetItem',
        column: col('wastePct', 'int8', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/int8@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BudgetItemResource',
        column: col('sourceItemId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
