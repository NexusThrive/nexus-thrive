#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4416dd35d6df9a2e3706cc8703bf36b34002c74bbc2bd8ffae3a4d204f694c67/contract';
import endContract from '../../snapshots/4416dd35d6df9a2e3706cc8703bf36b34002c74bbc2bd8ffae3a4d204f694c67/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/97b51e19ef09af1e7fe107a52cbeb34ef38a00a1481aa56983a9572d4c72ba1b/contract';
import startContract from '../../snapshots/97b51e19ef09af1e7fe107a52cbeb34ef38a00a1481aa56983a9572d4c72ba1b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropIndex({
        schema: 'public',
        table: 'StockLevel',
        index: 'StockLevel_product_key_d6b3c447',
      }),
      this.dropIndex({
        schema: 'public',
        table: 'StockLevel',
        index: 'StockLevel_variant_key_666fadbc',
      }),
      this.addColumn({
        schema: 'public',
        table: 'StockLevel',
        column: col('variantKey', 'text', {
          notNull: true,
          default: lit(''),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'StockLevel',
        constraint: 'StockLevel_warehouseId_productId_variantKey_key',
        columns: ['warehouseId', 'productId', 'variantKey'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
