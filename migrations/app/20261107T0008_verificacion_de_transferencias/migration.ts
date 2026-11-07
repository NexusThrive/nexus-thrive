#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/74edc8efd274a0096cccffaa9480fda48511c122b0307360432c0778a154409e/contract';
import startContract from '../../snapshots/74edc8efd274a0096cccffaa9480fda48511c122b0307360432c0778a154409e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9ed1f54e32ae6c51941d0175744c5cd16cd77ba61fba583b31b1c5581e04956e/contract';
import endContract from '../../snapshots/9ed1f54e32ae6c51941d0175744c5cd16cd77ba61fba583b31b1c5581e04956e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'PaymentIntent',
        column: col('proofAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'PaymentIntent',
        column: col('proofNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'PaymentIntent',
        column: col('rejectionReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
