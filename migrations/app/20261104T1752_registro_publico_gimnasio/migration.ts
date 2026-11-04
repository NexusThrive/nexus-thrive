#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/191a1245f44131a6d6cbd0710b3e6f55e60e6f2e206552beaa3f69290ba03007/contract';
import startContract from '../../snapshots/191a1245f44131a6d6cbd0710b3e6f55e60e6f2e206552beaa3f69290ba03007/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fbe4a87ab93b742a4693ff5c0c38c3298161bfc6048ebf61ac2309e6605547cf/contract';
import endContract from '../../snapshots/fbe4a87ab93b742a4693ff5c0c38c3298161bfc6048ebf61ac2309e6605547cf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('logoId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('registrationEnabled', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
