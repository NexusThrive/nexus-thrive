#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/691a1768b5ad4741b2ffbf94786cbb232c3d676edbe6345a706dbeb4ab100106/contract';
import startContract from '../../snapshots/691a1768b5ad4741b2ffbf94786cbb232c3d676edbe6345a706dbeb4ab100106/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/91ef0b6e6902ebad2385ea9ac22b3d4449ad6a7eae99594fd3c49c8231c83c0e/contract';
import endContract from '../../snapshots/91ef0b6e6902ebad2385ea9ac22b3d4449ad6a7eae99594fd3c49c8231c83c0e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'BenefitCode',
        column: col('maxCustomers', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BenefitCode',
        column: col('maxUsers', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BenefitCode',
        column: col('modules', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BenefitCode',
        column: col('priceUsdCents', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BenefitRedemption',
        column: col('priceUsdCents', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('maxCustomers', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('maxUsers', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'BenefitCode',
        constraint: 'BenefitCode_modules_elem_not_null_749d77ec',
        expression: 'array_position("modules", NULL) IS NULL',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
