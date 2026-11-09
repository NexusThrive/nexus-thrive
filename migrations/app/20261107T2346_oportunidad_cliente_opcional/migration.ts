#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/056cf2ac307033bdd57b71ee45f6c43ac85b5f1b1d5ba71c2fe8e3a3bb120bd5/contract';
import startContract from '../../snapshots/056cf2ac307033bdd57b71ee45f6c43ac85b5f1b1d5ba71c2fe8e3a3bb120bd5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/aee0c80868c057de87d7b5ffb15ae45aa2025a64c7424922c3a0be2e0847849d/contract';
import endContract from '../../snapshots/aee0c80868c057de87d7b5ffb15ae45aa2025a64c7424922c3a0be2e0847849d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropNotNull({ schema: 'public', table: 'Opportunity', column: 'customerId' })];
  }
}

MigrationCLI.run(import.meta.url, M);
