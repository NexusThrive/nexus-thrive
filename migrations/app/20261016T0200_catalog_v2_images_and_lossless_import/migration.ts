#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/02a82f1994702b55c06a1ec7a4cc38025a325ad28de3b02824adcf3c16c97038/contract';
import endContract from '../../snapshots/02a82f1994702b55c06a1ec7a4cc38025a325ad28de3b02824adcf3c16c97038/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d4509c335e914a2bda4c5a19954c47cc84007ba0fd294a7ca4f5a2d05e71d931/contract';
import startContract from '../../snapshots/d4509c335e914a2bda4c5a19954c47cc84007ba0fd294a7ca4f5a2d05e71d931/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'ApuActivityComposition',
        constraint: 'ApuActivityComposition_activityId_itemId_key',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'ApuItem',
        constraint: 'ApuItem_category_check_cb615411',
      }),
      // Sin pérdida de datos: un desperdicio a nivel de partida (diseño
      // descartado) pasa a sus recursos antes de eliminar la columna.
      rawSql({
        id: 'data.BudgetItem.wastePct.toResources',
        label: 'Move BudgetItem.wastePct into its resources before dropping it',
        operationClass: 'data',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'copy item-level wastePct to resources that have none',
            sql: 'UPDATE "public"."BudgetItemResource" AS r SET "wastePct" = i."wastePct" FROM "public"."BudgetItem" AS i WHERE r."itemId" = i."id" AND i."wastePct" > 0 AND r."wastePct" = 0',
          },
        ],
        postcheck: [
          {
            description: 'verify no resource lost an item-level wastePct',
            sql: 'SELECT NOT EXISTS (SELECT 1 FROM "public"."BudgetItemResource" AS r JOIN "public"."BudgetItem" AS i ON r."itemId" = i."id" WHERE i."wastePct" > 0 AND r."wastePct" = 0) AS "result"',
          },
        ],
      }),
      this.dropColumn({ schema: 'public', table: 'BudgetItem', column: 'wastePct' }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'BudgetItemResource',
        constraint: 'BudgetItemResource_type_check_13d76a3a',
      }),
      this.createTable({
        schema: 'public',
        table: 'ApuChapter',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('order', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ApuImage',
        columns: [
          col('byteSize', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('data', 'bytea', { notNull: true, codecRef: { codecId: 'pg/bytea@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mimeType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sha256', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ApuImportRun',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fileSha256', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('importedBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('stats', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ApuItemPriceHistory',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('importRunId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('itemId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('source', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivity',
        column: col('chapterId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivity',
        column: col('importedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivity',
        column: col('isAuxiliary', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivity',
        column: col('referenceUnitPrice', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivity',
        column: col('sortKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivity',
        column: col('sourceKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivityComposition',
        column: col('linePartial', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivityComposition',
        column: col('lineQuantity', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivityComposition',
        column: col('lineUnit', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivityComposition',
        column: col('lineUnitPrice', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivityComposition',
        column: col('order', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivityComposition',
        column: col('origin', 'text', {
          notNull: true,
          default: lit('MANUAL'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuActivityComposition',
        column: col('section', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuItem',
        column: col('auxiliaryActivityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuItem',
        column: col('imageId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuItem',
        column: col('importedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'ApuItem',
        column: col('sourceKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BudgetItemResource',
        column: col('imageId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BudgetItemResource',
        column: col('order', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'BudgetItemResource',
        column: col('section', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'ApuActivityComposition',
        constraint: 'ApuActivityComposition_origin_check_ba5a96cd',
        expression: "\"origin\" IN ('IMPORT', 'MANUAL')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'ApuChapter',
        constraint: 'ApuChapter_tenantId_code_key',
        columns: ['tenantId', 'code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ApuImage',
        constraint: 'ApuImage_tenantId_sha256_key',
        columns: ['tenantId', 'sha256'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'ApuItem',
        constraint: 'ApuItem_category_check_f8aa2465',
        expression:
          "\"category\" IN ('MATERIAL', 'MANO_DE_OBRA', 'EQUIPO', 'TRANSPORTE', 'OTRO', 'SUBCONTRATO')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'ApuItem',
        constraint: 'ApuItem_tenantId_sourceKey_key',
        columns: ['tenantId', 'sourceKey'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'BudgetItemResource',
        constraint: 'BudgetItemResource_type_check_f9fe751f',
        expression:
          "\"type\" IN ('MATERIAL', 'LABOR', 'EQUIPMENT', 'TRANSPORT', 'OTHER', 'SUBCONTRACT')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuActivity',
        index: 'ApuActivity_chapterId_idx_411dd3d6',
        columns: ['chapterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuActivityComposition',
        index: 'ApuActivityComposition_activityId_order_idx_82e665b3',
        columns: ['activityId', 'order'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuChapter',
        index: 'ApuChapter_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuImage',
        index: 'ApuImage_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuImportRun',
        index: 'ApuImportRun_tenantId_createdAt_idx_88162366',
        columns: ['tenantId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuImportRun',
        index: 'ApuImportRun_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuItem',
        index: 'ApuItem_auxiliaryActivityId_idx_c2d09703',
        columns: ['auxiliaryActivityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuItem',
        index: 'ApuItem_imageId_idx_9d3c09ba',
        columns: ['imageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuItemPriceHistory',
        index: 'ApuItemPriceHistory_importRunId_idx_99a94f3f',
        columns: ['importRunId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuItemPriceHistory',
        index: 'ApuItemPriceHistory_itemId_createdAt_idx_d577e708',
        columns: ['itemId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuItemPriceHistory',
        index: 'ApuItemPriceHistory_itemId_idx_41357140',
        columns: ['itemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ApuItemPriceHistory',
        index: 'ApuItemPriceHistory_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuChapter',
        foreignKey: {
          name: 'ApuChapter_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuActivity',
        foreignKey: {
          name: 'ApuActivity_chapterId_fkey',
          columns: ['chapterId'],
          references: { schema: 'public', table: 'ApuChapter', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuImage',
        foreignKey: {
          name: 'ApuImage_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuImportRun',
        foreignKey: {
          name: 'ApuImportRun_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuItem',
        foreignKey: {
          name: 'ApuItem_auxiliaryActivityId_fkey',
          columns: ['auxiliaryActivityId'],
          references: { schema: 'public', table: 'ApuActivity', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuItem',
        foreignKey: {
          name: 'ApuItem_imageId_fkey',
          columns: ['imageId'],
          references: { schema: 'public', table: 'ApuImage', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuItemPriceHistory',
        foreignKey: {
          name: 'ApuItemPriceHistory_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuItemPriceHistory',
        foreignKey: {
          name: 'ApuItemPriceHistory_itemId_fkey',
          columns: ['itemId'],
          references: { schema: 'public', table: 'ApuItem', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ApuItemPriceHistory',
        foreignKey: {
          name: 'ApuItemPriceHistory_importRunId_fkey',
          columns: ['importRunId'],
          references: { schema: 'public', table: 'ApuImportRun', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
