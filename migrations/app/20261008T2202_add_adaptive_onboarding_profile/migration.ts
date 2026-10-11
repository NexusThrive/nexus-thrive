#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/ab7da12f6f749e6e7969c5c15132adb9038598e0fe4266d6700d84799c0b8e5a/contract';
import endContract from '../../snapshots/ab7da12f6f749e6e7969c5c15132adb9038598e0fe4266d6700d84799c0b8e5a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fdb9466b51a0aca5f38161535d1ec7c1cb57e791de0e41d9c27bbb4b00ba3855/contract';
import startContract from '../../snapshots/fdb9466b51a0aca5f38161535d1ec7c1cb57e791de0e41d9c27bbb4b00ba3855/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('legalName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('taxId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('teamSize', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('tenantType', 'text', {
          notNull: true,
          default: lit('COMPANY'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_tenantType_check_0d8e073f',
        expression: "\"tenantType\" IN ('INDIVIDUAL', 'COMPANY')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
