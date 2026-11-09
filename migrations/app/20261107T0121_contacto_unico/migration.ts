#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/84495926b9da9545f54ee11e6bd9013f75730f1829380511a67a333495497017/contract';
import startContract from '../../snapshots/84495926b9da9545f54ee11e6bd9013f75730f1829380511a67a333495497017/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/afa78939f472d4222044ba2206a3803b8c8f2bea89c88dcfcb8796b2ba5cb085/contract';
import endContract from '../../snapshots/afa78939f472d4222044ba2206a3803b8c8f2bea89c88dcfcb8796b2ba5cb085/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('consentAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('ownerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('phoneNorm', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('source', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Customer',
        column: col('stage', 'text', {
          notNull: true,
          default: lit('CUSTOMER'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'StoreOrder',
        column: col('customerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Customer',
        index: 'Customer_tenantId_phoneNorm_idx_8e50ed71',
        columns: ['tenantId', 'phoneNorm'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
