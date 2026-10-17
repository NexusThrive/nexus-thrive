#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5c796da84a2812cda89958292183d686ab17b12ddac66c131b160f9cd9952792/contract';
import startContract from '../../snapshots/5c796da84a2812cda89958292183d686ab17b12ddac66c131b160f9cd9952792/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8be75ffc85a7020108206a5f06fd19614674399b48b6fcc1d261180d665fe619/contract';
import endContract from '../../snapshots/8be75ffc85a7020108206a5f06fd19614674399b48b6fcc1d261180d665fe619/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('billingCycle', 'text', {
          notNull: true,
          default: lit('MONTHLY'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('plan', 'text', {
          notNull: true,
          default: lit('ESSENTIAL'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('planMonthlyUsdCents', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('planSelectedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_billingCycle_check_3dc757ce',
        expression: "\"billingCycle\" IN ('MONTHLY', 'ANNUAL')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_plan_check_f1a20b28',
        expression: "\"plan\" IN ('ESSENTIAL', 'ELITE', 'SIGNATURE')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
