#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5102e126472fee6d7350ac798fd4bc06e65763a6cffc609a914d0462dd251bb9/contract';
import startContract from '../../snapshots/5102e126472fee6d7350ac798fd4bc06e65763a6cffc609a914d0462dd251bb9/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/872b04caffe0db3459ddbe2438c59e6abc6848fde503322e39e0235e9be67ee0/contract';
import endContract from '../../snapshots/872b04caffe0db3459ddbe2438c59e6abc6848fde503322e39e0235e9be67ee0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_vertical_check_7ca0b77e',
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('activity', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('businessModels', 'text[]', { codecRef: { codecId: 'pg/text@1', many: true } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_businessModels_elem_not_null_de2f8db1',
        expression: 'array_position("businessModels", NULL) IS NULL',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_vertical_check_1e2766aa',
        expression:
          "\"vertical\" IN ('gym', 'tourism_agency', 'hospitality', 'construction', 'carpentry', 'restaurant', 'retail', 'beauty', 'healthcare', 'mechanic', 'education', 'real_estate', 'hardware_store', 'nautical_transport', 'tour_guides', 'events', 'museum', 'general')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
