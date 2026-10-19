#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/07904acdd28a85cb3d5a845619bc131d08e7f7c34e9c356181fb226575e31507/contract';
import startContract from '../../snapshots/07904acdd28a85cb3d5a845619bc131d08e7f7c34e9c356181fb226575e31507/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fc5396d5aae600c31df52c51b6bddd5b012544494515a65147cbfafad4f632c1/contract';
import endContract from '../../snapshots/fc5396d5aae600c31df52c51b6bddd5b012544494515a65147cbfafad4f632c1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'BenefitRedemption',
        column: col('kind', 'text', {
          notNull: true,
          default: lit('PROMO'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'BenefitRedemption',
        constraint: 'BenefitRedemption_kind_check_af337109',
        expression: "\"kind\" IN ('PROMO', 'PAID')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
