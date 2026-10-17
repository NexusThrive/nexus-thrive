#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7924e5f7554e644ee55d4df116e037b3d915ce4a48cb87cce6dfa264a92be4f2/contract';
import endContract from '../../snapshots/7924e5f7554e644ee55d4df116e037b3d915ce4a48cb87cce6dfa264a92be4f2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ab7da12f6f749e6e7969c5c15132adb9038598e0fe4266d6700d84799c0b8e5a/contract';
import startContract from '../../snapshots/ab7da12f6f749e6e7969c5c15132adb9038598e0fe4266d6700d84799c0b8e5a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'ApuActivity' }),
      this.dropTable({ schema: 'public', table: 'ApuActivityComposition' }),
      this.dropTable({ schema: 'public', table: 'ApuItem' }),
      this.dropTable({ schema: 'public', table: 'AuditLog' }),
      this.dropTable({ schema: 'public', table: 'Quote' }),
      this.dropTable({ schema: 'public', table: 'QuoteItem' }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_tenantType_check_0d8e073f',
      }),
      this.dropColumn({ schema: 'public', table: 'Tenant', column: 'address' }),
      this.dropColumn({ schema: 'public', table: 'Tenant', column: 'legalName' }),
      this.dropColumn({ schema: 'public', table: 'Tenant', column: 'suspendedAt' }),
      this.dropColumn({ schema: 'public', table: 'Tenant', column: 'suspendedReason' }),
      this.dropColumn({ schema: 'public', table: 'Tenant', column: 'taxId' }),
      this.dropColumn({ schema: 'public', table: 'Tenant', column: 'teamSize' }),
      this.dropColumn({ schema: 'public', table: 'Tenant', column: 'tenantType' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
