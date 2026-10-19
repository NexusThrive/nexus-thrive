#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/07904acdd28a85cb3d5a845619bc131d08e7f7c34e9c356181fb226575e31507/contract';
import endContract from '../../snapshots/07904acdd28a85cb3d5a845619bc131d08e7f7c34e9c356181fb226575e31507/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/76c9b229abe9b378da019eeb04959f533b5efdc7474d6b3bedfccd2f69e18bea/contract';
import startContract from '../../snapshots/76c9b229abe9b378da019eeb04959f533b5efdc7474d6b3bedfccd2f69e18bea/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'BenefitCode',
        column: col('kind', 'text', {
          notNull: true,
          default: lit('PROMO'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'BenefitCode',
        constraint: 'BenefitCode_kind_check_af337109',
        expression: "\"kind\" IN ('PROMO', 'PAID')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
