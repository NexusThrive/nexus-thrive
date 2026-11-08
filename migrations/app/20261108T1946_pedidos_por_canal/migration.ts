#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/9ccd58adc7f56a676810c7e9f65af930aa7f6ba7c70dc54877c6968fdd3abcb1/contract';
import endContract from '../../snapshots/9ccd58adc7f56a676810c7e9f65af930aa7f6ba7c70dc54877c6968fdd3abcb1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ebbd95b7f553eb9a9e5fa1b80967ad2084691849a3c21418d11e4dd7b557b432/contract';
import startContract from '../../snapshots/ebbd95b7f553eb9a9e5fa1b80967ad2084691849a3c21418d11e4dd7b557b432/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'StoreOrder',
        column: col('channel', 'text', {
          notNull: true,
          default: lit('WEB'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'StoreOrder',
        column: col('externalId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'StoreOrder',
        constraint: 'StoreOrder_tenantId_channel_externalId_key',
        columns: ['tenantId', 'channel', 'externalId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
