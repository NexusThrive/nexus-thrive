#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/422e6cab8258d84d99cbb4b2b30d5b9c4009204497eae06972736c0930b73a0c/contract';
import endContract from '../../snapshots/422e6cab8258d84d99cbb4b2b30d5b9c4009204497eae06972736c0930b73a0c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/78cb411e53926df1cd9fa9e8caf90edb51601f66d99d9f5c4a7f96e720de2477/contract';
import startContract from '../../snapshots/78cb411e53926df1cd9fa9e8caf90edb51601f66d99d9f5c4a7f96e720de2477/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('latitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('longitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('placeId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
