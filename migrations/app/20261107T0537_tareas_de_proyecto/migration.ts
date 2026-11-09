#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/075110c693a9bbee2030000e222dc3a901cc14843336cbd786b6afd0284e7c07/contract';
import endContract from '../../snapshots/075110c693a9bbee2030000e222dc3a901cc14843336cbd786b6afd0284e7c07/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/35f49d1db560ddae70a4f93360841ef22a1c5b80ff57c763c78ce1a901fedb0a/contract';
import startContract from '../../snapshots/35f49d1db560ddae70a4f93360841ef22a1c5b80ff57c763c78ce1a901fedb0a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Task',
        column: col('projectId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Task',
        index: 'Task_tenantId_projectId_status_idx_68cd0149',
        columns: ['tenantId', 'projectId', 'status'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
