#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3cb85e24576ac30fbaf328a36ce3ff144b6d5a9e84ca5c0490a11e9b0a32e95c/contract';
import startContract from '../../snapshots/3cb85e24576ac30fbaf328a36ce3ff144b6d5a9e84ca5c0490a11e9b0a32e95c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/42b9c8b933599d309c78323c0b5d4f0697a6daa233071bca60cba19569af718c/contract';
import endContract from '../../snapshots/42b9c8b933599d309c78323c0b5d4f0697a6daa233071bca60cba19569af718c/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'CustomerTierSetting',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxCustomers', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('priceUsdCents', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ModuleSetting',
        columns: [
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('included', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('module', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('priceUsdCents', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['module'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PlanSetting',
        columns: [
          col('active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('annualDiscountPct', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('basePriceUsdCents', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('chargesModules', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('features', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('includesAllModules', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('moduleDiscountPct', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('recommended', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('tagline', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['key']),
          checkExpression(
            'PlanSetting_features_elem_not_null_1a661718',
            'array_position("features", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'VerticalSetting',
        columns: [
          col('dashboardTemplate', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('modules', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('priceFactorPct', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('recommended', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('signupEnabled', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('vertical', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['vertical']),
          checkExpression(
            'VerticalSetting_modules_elem_not_null_749d77ec',
            'array_position("modules", NULL) IS NULL',
          ),
          checkExpression(
            'VerticalSetting_recommended_elem_not_null_226dce52',
            'array_position("recommended", NULL) IS NULL',
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('contractedModules', 'text[]', {
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tenant',
        column: col('customerTierId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Tenant',
        constraint: 'Tenant_contractedModules_elem_not_null_6b619961',
        expression: 'array_position("contractedModules", NULL) IS NULL',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
