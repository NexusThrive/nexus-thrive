#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/35370b0e28c7b144871c24d4b6596e4c51189286990e98b31bb6bb39ed51a3ae/contract';
import startContract from '../../snapshots/35370b0e28c7b144871c24d4b6596e4c51189286990e98b31bb6bb39ed51a3ae/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c64fb7aa0031082c2b69496d95068f5860f317eb47193e31da424bb2d4cc2dfb/contract';
import endContract from '../../snapshots/c64fb7aa0031082c2b69496d95068f5860f317eb47193e31da424bb2d4cc2dfb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PosTerminal',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('boxId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('warehouseId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'CashSession',
        column: col('terminalId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Invoice',
        column: col('tipTotal', 'numeric', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'PosTerminal',
        index: 'PosTerminal_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PosTerminal',
        foreignKey: {
          name: 'PosTerminal_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'PosTerminal' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
